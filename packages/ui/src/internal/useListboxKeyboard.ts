import {
  autoUpdate,
  flip,
  offset,
  shift,
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

/** Minimum gap kept between the listbox and the viewport edge when it has to shift, in pixels. */
const VIEWPORT_PADDING = 12;

export interface UseListboxKeyboardOptions {
  /** The option elements, in the order they are rendered — each option registers itself at its
   * own index. Arrow-key navigation and type-ahead both read the list from here, so it must hold
   * the elements currently in the document, not a snapshot. */
  listRef: RefObject<Array<HTMLElement | null>>;
  /** The highlighted option's index, or `null` for none. State lives in the calling component,
   * never in this hook: `Autocomplete` re-scopes it on every keystroke by calling its own setter,
   * which a hook owning the state would make impossible without widening this signature. */
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
}

/**
 * The floating-listbox glue shared by every combobox-shaped component in this package: positions
 * the listbox, and composes `@floating-ui/react`'s `useListNavigation({ virtual: true })`,
 * `useTypeahead` and `useRole` into one set of prop getters.
 *
 * Virtual focus is the whole point — the highlighted option is tracked through
 * `aria-activedescendant` while real DOM focus stays on the reference element (see
 * `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`). `FloatingFocusManager`
 * is deliberately absent for the same reason: it moves real focus into the floating element,
 * which breaks that model outright.
 *
 * Two elements anchor the listbox. The reference element — the trigger or input that holds focus —
 * carries the interactions, and stays `elements.domReference`. The field around it is only the
 * position reference: the listbox sits below the field's border and matches its width, where
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
  open,
  onOpenChange,
}: UseListboxKeyboardOptions): UseListboxKeyboardReturn {
  const { refs, floatingStyles, context, elements } = useFloating({
    open,
    onOpenChange: (next) => {
      onOpenChange(next);
    },
    placement: "bottom-start",
    // `size` runs last so it reads the placement `flip` and `shift` settled on. Its width is the
    // field's border box, written straight onto the element because floating-ui computes it
    // outside render; `autoUpdate` observes the field's size, so a field that grows as its chips
    // wrap re-runs the whole chain.
    middleware: [
      offset(LISTBOX_OFFSET),
      flip({ padding: VIEWPORT_PADDING }),
      shift({ padding: VIEWPORT_PADDING }),
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

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([
    click,
    dismiss,
    listboxRole,
    listNavigation,
    typeaheadInteraction,
  ]);

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
  };
}
