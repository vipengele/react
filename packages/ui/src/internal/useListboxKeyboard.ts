import {
  autoUpdate,
  flip,
  offset,
  size,
  type UseFloatingReturn,
  type UseInteractionsReturn,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
  useTypeahead,
} from "@floating-ui/react";
import { type MouseEvent, type RefObject, useCallback, useMemo, useRef } from "react";

/** Gap between the field and its listbox, in pixels. */
const LISTBOX_OFFSET = 4;

/** Minimum gap `flip` wants between the listbox and the viewport's edge before it keeps the
 * listbox on its side of the field, in pixels. */
const VIEWPORT_PADDING = 12;

/** The same props without the highlight's id, for an element that does not hold real focus. */
function withoutActiveDescendant(props: Record<string, unknown>): Record<string, unknown> {
  const rest = { ...props };
  delete rest["aria-activedescendant"];
  return rest;
}

export interface UseListboxKeyboardOptions {
  /** The option elements, in the order they are rendered — each option registers itself at its
   * own index. Arrow-key navigation and type-ahead both read the list from here, so it must hold
   * the elements currently in the document, not a snapshot. */
  listRef: RefObject<Array<HTMLElement | null>>;
  /** The highlighted option's index, or `null` for none. State lives in the calling component,
   * never in this hook: `Dropdown` re-scopes it on every query change through its own
   * `applyQuery`, which a hook owning the state would make impossible without widening this
   * signature. */
  activeIndex: number | null;
  /** Called with the new highlighted index on every arrow-key move, `Home`/`End` jump, hover, and
   * type-ahead match. */
  onNavigate: (index: number | null) => void;
  /** Indices of options excluded from arrow-key traversal and from type-ahead matching. */
  disabledIndices: number[];
  /** Whether typing a character jumps the highlight to the next matching label. Off for a
   * filtering combobox, where typing goes to the text input instead. */
  typeahead: boolean;
  /** `"select"` puts `role="combobox"` and `aria-haspopup="listbox"` on the reference element —
   * what a component rendering its own non-input trigger wants. `"combobox"` leaves the role to
   * the reference element itself, for a component whose trigger is already an `<input>`. */
  role: "select" | "combobox";
  /** Whether the caller renders a search input inside the floating element and gives it real
   * focus, with `getSearchProps()` and a non-modal `FloatingFocusManager`. Off, the reference
   * element keeps real focus and `getSearchProps()` is never called. */
  search?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface UseListboxKeyboardReturn
  extends UseInteractionsReturn,
    Pick<UseFloatingReturn, "refs" | "floatingStyles" | "context" | "elements"> {
  /** The nearest `.tandiko-root` ancestor of the reference element, or `null` when there is none
   * to portal the listbox into. */
  themeRoot: Element | null;
  /** A callback ref for the field — the bordered box around the reference element. The listbox is
   * positioned against it and sized to its width, and a press anywhere inside it is not a press
   * outside the listbox. Left unattached, the listbox anchors to the reference element and only a
   * press outside the reference and the listbox closes it. */
  fieldRef: (node: HTMLElement | null) => void;
  /** The field's `mousedown` handler. A press on the field outside the reference element keeps
   * focus where it is, so the reference element never loses focus to the field's own padding, a
   * chip row or an adornment. A primary press there that does not land on a button also focuses
   * the reference element and opens the listbox; a button — a chip's remove button — keeps its
   * press for its own `click`. */
  onFieldMouseDown: (event: MouseEvent<HTMLElement>) => void;
  /** Props for the search input inside the floating element, in `search` mode: the listbox role
   * wiring and the arrow, `Home` and `End` handling, so the input is what drives the list and
   * what carries `aria-activedescendant`. `useClick` is left out of them: its press handler
   * toggles the listbox, and a press on the input to place the caret would close the popover the
   * input lives in. */
  getSearchProps: UseInteractionsReturn["getReferenceProps"];
}

/**
 * The floating-listbox glue shared by every combobox-shaped component in this package: positions
 * the listbox, and composes `@floating-ui/react`'s `useListNavigation({ virtual: true })`,
 * `useTypeahead` and `useRole` into one set of prop getters.
 *
 * Virtual focus is the whole point — the highlighted option is tracked through
 * `aria-activedescendant`, and real DOM focus never enters the listbox itself (see
 * `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`). The element holding
 * real focus is the reference element, and in `search` mode a search input inside the floating
 * element instead — a `role="combobox"` of its own, taking `getSearchProps()`. That mode is the
 * only one where the caller wraps the floating element in a **non-modal** `FloatingFocusManager`:
 * the manager moves real focus into the floating element, which is what puts the caret in the
 * search input, and what returns focus to the reference element when the listbox closes. Modal
 * would be wrong — the trigger and the page behind it stay reachable.
 *
 * Two elements anchor the listbox. The reference element — the trigger or input the consumer
 * focuses — carries the interactions, and stays `elements.domReference` for the whole lifecycle,
 * `search` mode included: floating-ui reads it for its typeable-combobox handling, its focus
 * restore and `useClick`'s space key, none of which a reference that moved between open and shut
 * would survive.
 *
 * The field around it is only the position reference: the listbox sits below the field's border
 * and matches its width, where
 * anchoring to the reference element would start it wherever that element starts — after the
 * field's padding and any chips beside it — and size it to nothing in particular.
 *
 * The field is also one press target. A non-focusable part of it — its padding, the gaps in a chip
 * row, a chevron — takes focus off the reference element when pressed and hands it to `<body>`.
 * Since that press is not outside the listbox, the listbox would stay open with nothing left to
 * receive the arrow keys; `onFieldMouseDown` keeps focus on the reference element instead.
 *
 * `useClick`'s keyboard handlers are switched off. They toggle the listbox on `Enter` and `Space`,
 * which are the keys that select the highlighted option once it is open — the caller owns both
 * keys and decides what they mean for the current open state.
 */
export function useListboxKeyboard({
  listRef,
  activeIndex,
  onNavigate,
  disabledIndices,
  typeahead,
  role,
  search = false,
  open,
  onOpenChange,
}: UseListboxKeyboardOptions): UseListboxKeyboardReturn {
  const { refs, floatingStyles, context, elements } = useFloating({
    open,
    onOpenChange: (next) => {
      onOpenChange(next);
    },
    placement: "bottom-start",
    // The listbox's left edge and width are the field's wherever the field is, flush against the
    // viewport's edge or partly scrolled past it. At `bottom-start` with equal widths the listbox
    // overflows horizontally exactly where the field does, so nothing slides it sideways: a
    // `shift` would only pull it off the field's edge. `flip` alone moves it, from below the field
    // to above it. `size` runs last so it reads the placement `flip` settled on. Its width is the
    // field's border box, written straight onto the element because floating-ui computes it
    // outside render; `autoUpdate` observes the field's size, so a field that grows as its chips
    // wrap re-runs the whole chain.
    middleware: [
      offset(LISTBOX_OFFSET),
      flip({ padding: VIEWPORT_PADDING }),
      size({
        apply({ rects, elements: { floating } }) {
          floating.style.width = `${rects.reference.width}px`;
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const fieldElementRef = useRef<HTMLElement | null>(null);
  const fieldRef = useCallback(
    (node: HTMLElement | null) => {
      fieldElementRef.current = node;
      refs.setPositionReference(node);
    },
    [refs],
  );

  function onFieldMouseDown(event: MouseEvent<HTMLElement>) {
    const reference = refs.domReference.current as HTMLElement;
    const target = event.target as Element;
    // A press on the reference element is the reference element's own, and `useClick` handles it.
    if (reference.contains(target)) {
      return;
    }
    // Stops the press moving focus, not the `click` that follows it, so a button pressed here
    // still acts.
    event.preventDefault();
    if (event.button !== 0 || target.closest("button") !== null) {
      return;
    }
    reference.focus();
    onOpenChange(true);
  }

  const disabledIndicesRef = useRef(disabledIndices);
  disabledIndicesRef.current = disabledIndices;

  // `useTypeahead` matches against a ref of label strings, which this reads straight off the
  // rendered options rather than taking as a second list the caller has to keep in step with
  // `listRef`. A getter rather than a stored array because the labels are read at keypress time:
  // an array computed during render is one commit behind the options that are actually mounted.
  // A disabled option's label is `null`, which is how `useTypeahead` is told to skip it.
  const labelsRef = useMemo<RefObject<Array<string | null>>>(
    () => ({
      get current(): Array<string | null> {
        return listRef.current.map((item, index) =>
          item !== null && !disabledIndicesRef.current.includes(index) ? item.textContent : null,
        );
      },
    }),
    [listRef],
  );

  const click = useClick(context, { keyboardHandlers: false });
  // The field holds more than the reference element — its padding, a chip row, an adornment such
  // as a chevron — and a press on any of those belongs to the control. Counted as an outside
  // press, it closes the listbox and drops the highlight, so a handler on that press reopening the
  // listbox leaves `Enter` with nothing to select. Returning `true` only lets floating-ui carry on
  // with its own checks, which still exempt the reference and floating elements; so with no field
  // attached, a press outside those two closes the listbox exactly as it would without this.
  const dismiss = useDismiss(context, {
    outsidePress: (event) => {
      const field = fieldElementRef.current;
      return field === null || !field.contains(event.target as Node);
    },
    // In `search` mode the press that closes the listbox is the `click`, not the `pointerdown`
    // that starts it. Real focus is inside the floating element, and `FloatingFocusManager`
    // returns it to the reference element as the floating element unmounts; closing on
    // `pointerdown` puts that return before `mousedown`'s own default action, which then blanks
    // focus to `<body>` when the press landed on something unfocusable. Closing on `click`
    // leaves the browser's focus move first and the return last. Where the press landed on
    // something focusable, the manager sees focus already outside and leaves it there.
    outsidePressEvent: search ? "click" : "pointerdown",
  });
  const listboxRole = useRole(context, { role });
  const listNavigation = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate,
    disabledIndices,
    virtual: true,
    loop: true,
  });
  // `ignoreKeys: [" "]` keeps `Space` out of the typed string: it is the caller's selection key,
  // and a type-ahead search that starts with a space matches no label anyway.
  const typeaheadInteraction = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: onNavigate,
    enabled: typeahead,
    ignoreKeys: [" "],
  });

  const {
    getReferenceProps: getMergedReferenceProps,
    getFloatingProps: getMergedFloatingProps,
    getItemProps,
  } = useInteractions([click, dismiss, listboxRole, listNavigation, typeaheadInteraction]);

  // The search input drives the list, so it takes the same navigation and listbox-role props the
  // reference element takes in every other mode — floating-ui's own prop getter, not keys
  // forwarded by hand. `useClick` is the one it must not take: its reference handler toggles the
  // listbox on a press, so a press placing the caret in the input would close the popover the
  // input lives in. `useDismiss` is left out for having nothing to add here — its `Escape` is
  // already on the document, and it answers the input's `Escape` wherever focus sits.
  const searchInteractions = useInteractions([listboxRole, listNavigation]);
  const getSearchProps = useCallback<UseInteractionsReturn["getReferenceProps"]>(
    (userProps) => searchInteractions.getReferenceProps({ "aria-autocomplete": "list", ...userProps }),
    [searchInteractions],
  );

  // `aria-activedescendant` names the highlight to whichever element holds real focus, and
  // floating-ui offers it to the reference and floating elements alike. In `search` mode that is
  // the search input alone: a second copy on the trigger or on the listbox states a focused
  // highlight on an element that has no focus.
  const getReferenceProps = useCallback<UseInteractionsReturn["getReferenceProps"]>(
    (userProps) => (search ? withoutActiveDescendant(getMergedReferenceProps(userProps)) : getMergedReferenceProps(userProps)),
    [getMergedReferenceProps, search],
  );
  const getFloatingProps = useCallback<UseInteractionsReturn["getFloatingProps"]>(
    (userProps) => (search ? withoutActiveDescendant(getMergedFloatingProps(userProps)) : getMergedFloatingProps(userProps)),
    [getMergedFloatingProps, search],
  );

  // `ThemeProvider` assigns every `--tandiko-*` property on `.tandiko-root`, so a listbox
  // portaled to `document.body` would resolve every `var()` to nothing. `null` means there is no
  // themed root to portal into — an unthemed page, or a test rendering the component on its own —
  // and the caller renders the listbox inline instead.
  const themeRoot = elements.domReference?.closest(".tandiko-root") ?? null;

  return {
    refs,
    floatingStyles,
    context,
    elements,
    themeRoot,
    fieldRef,
    onFieldMouseDown,
    getReferenceProps,
    getFloatingProps,
    getItemProps,
    getSearchProps,
  };
}
