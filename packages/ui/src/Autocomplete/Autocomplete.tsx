import { Check, ChevronDown, type IconComponent, X } from "@tandiko/icons";
import {
  type ChangeEvent,
  Children,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { listboxStylesheet } from "../internal/listbox.stylesheet.js";
import { useListboxKeyboard } from "../internal/useListboxKeyboard.js";
import { autocompleteStylesheet } from "./Autocomplete.stylesheet.js";

export interface AutocompleteOptionProps {
  /** What `Autocomplete` reports through `onChange` when this option is selected. */
  value: string;
  /** The option's text. A plain string rather than children: it is also what the input shows for
   * the current selection, what a chip shows in `multiple` mode, and what the typed query is
   * matched against. */
  label: string;
  /** Rendered before the label in the listbox. */
  icon?: IconComponent;
  /** Skipped by arrow-key traversal and by the highlight a keystroke re-scopes, and not
   * selectable by click or `Enter`. */
  disabled?: boolean;
}

/**
 * One search result from `loadOptions`, in async mode — a plain data object rather than
 * `Autocomplete.Option` JSX, since a result that hasn't come back from the API yet has no
 * element for a consumer to have declared. `Autocomplete` renders each one as an
 * `Autocomplete.Option` internally; the fields are exactly that component's own props (minus the
 * JSX-only shape) so a synchronous and an async list mean the same thing per entry.
 */
export interface AutocompleteAsyncOption {
  value: string;
  label: string;
  icon?: IconComponent;
  disabled?: boolean;
}

/** What `Autocomplete` reads off each `Autocomplete.Option` child, in child order. */
interface OptionDescriptor {
  value: string;
  label: string;
  disabled: boolean;
  /** The child element itself. Filtering omits non-matching children from what is rendered rather
   * than rebuilding options from a data array — see
   * `docs/adr/0005-dropdown-autocomplete-compound-option-children.md`. */
  element: ReactNode;
}

interface AutocompleteContextValue {
  multiple: boolean;
  selectedValues: string[];
  highlightedValue: string | null;
  select: (value: string, label: string) => void;
  registerOption: (value: string, node: HTMLElement | null) => void;
  getItemProps: (userProps?: Record<string, unknown> & { active?: boolean; selected?: boolean }) => Record<string, unknown>;
}

/** `Autocomplete.Option` renders inside the floating listbox, which `Autocomplete` positions and
 * portals itself — so the selection state, the highlight and floating-ui's item props reach it
 * through context rather than as props the consumer arranges. */
const AutocompleteContext = createContext<AutocompleteContextValue | null>(null);

function useAutocompleteContext(): AutocompleteContextValue {
  const context = useContext(AutocompleteContext);
  if (context === null) {
    throw new Error("Autocomplete.Option must be rendered inside <Autocomplete>.");
  }
  return context;
}

function AutocompleteOption({ value, label, icon: OptionIcon, disabled = false }: AutocompleteOptionProps) {
  const { multiple, selectedValues, highlightedValue, select, registerOption, getItemProps } = useAutocompleteContext();

  const selected = selectedValues.includes(value);
  const highlighted = highlightedValue === value;

  return (
    <div
      {...getItemProps({
        active: highlighted,
        selected,
        onMouseDown: (event: MouseEvent<HTMLDivElement>) => {
          // Load-bearing: the default action of pressing an option is to move focus off the
          // input, and `Autocomplete` treats a blur as the user leaving the field — it closes the
          // listbox and reverts unmatched text. Without this the click would never reach the
          // option it was aimed at. Keeping focus put also means selection by click and by
          // `Enter` run the same code below.
          event.preventDefault();
        },
        onClick: () => {
          if (!disabled) {
            select(value, label);
          }
        },
      })}
      ref={(node) => {
        registerOption(value, node);
      }}
      className="tandiko-listbox-option"
      aria-disabled={disabled ? true : undefined}
      data-highlighted={highlighted ? "" : undefined}
    >
      {multiple ? (
        <span className="tandiko-listbox-checkbox" data-checked={selected ? "" : undefined}>
          {selected ? <Check size={12} aria-hidden="true" /> : null}
        </span>
      ) : null}
      {OptionIcon ? <OptionIcon className="tandiko-listbox-option-icon" aria-hidden="true" /> : null}
      <span className="tandiko-listbox-option-label">{label}</span>
    </div>
  );
}

interface AutocompleteBaseProps {
  /**
   * `Autocomplete.Option` children, directly beneath `Autocomplete` — there is no list layer,
   * since the listbox's positioning is `Autocomplete`'s own business. Falsy children (what
   * `condition && <Autocomplete.Option />` produces) are skipped; anything else throws at
   * render.
   *
   * Ignored when `loadOptions` is provided — the two are alternate option sources, not
   * combinable, since an async result has no consumer-declared element to fall back to.
   */
  children?: ReactNode;
  /**
   * Switches `Autocomplete` into async mode: instead of filtering `children`, it calls this
   * with the current query (debounced by `debounceMs`) and renders whatever it resolves to. A
   * rejection is not the consumer's to catch — it surfaces as `errorMessage` in the listbox.
   * Filtering is the API's job in this mode; results are rendered as returned, unfiltered again
   * client-side.
   */
  loadOptions?: (query: string) => Promise<AutocompleteAsyncOption[]>;
  /** How long to wait, after the query stops changing, before calling `loadOptions`. Only reads
   * in async mode. */
  debounceMs?: number;
  /** Shown, non-interactively, in the listbox while `loadOptions` is pending. */
  loadingMessage?: string;
  /** Shown, non-interactively, in the listbox when `loadOptions` rejects. */
  errorMessage?: string;
  /** Shown in the input while it is empty. */
  placeholder?: string;
  /** Composed onto the root wrapper. */
  className?: string;
  /** Lands on the input, not the wrapper — `FormField` clones it on, and it is the input that a
   * `<label>` and a role query have to resolve to. */
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export interface AutocompleteSingleProps extends AutocompleteBaseProps {
  multiple?: false;
  /** Makes the selection controlled; pair it with `onChange`. `null` selects nothing. */
  value?: string | null;
  /** The initially selected value when the selection is uncontrolled. */
  defaultValue?: string | null;
  onChange?: (value: string) => void;
}

export interface AutocompleteMultipleProps extends AutocompleteBaseProps {
  multiple: true;
  /** Makes the selection controlled; pair it with `onChange`. */
  value?: string[];
  /** The initially selected values when the selection is uncontrolled. */
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
}

export type AutocompleteProps = AutocompleteSingleProps | AutocompleteMultipleProps;

/**
 * Reads the `Autocomplete.Option` children in order, keeping each element so the matching ones can
 * be rendered as they were written. `Children.toArray` drops falsy children (`null`/`undefined`/
 * `false`/`true`, the shape `condition && <Autocomplete.Option />` produces) rather than treating
 * them as invalid, matching `Card`'s carve-out. Throws unconditionally, not gated on `NODE_ENV`:
 * an unrecognised child is an option the filter, the keyboard and the selection never see, which
 * is the exact failure this compound API exists to prevent.
 */
function readOptions(children: ReactNode): OptionDescriptor[] {
  return Children.toArray(children).map((child) => {
    if (!isValidElement(child) || child.type !== AutocompleteOption) {
      throw new Error("Autocomplete only accepts Autocomplete.Option as children.");
    }
    const { value, label, disabled = false } = child.props as AutocompleteOptionProps;
    return { value, label, disabled, element: child };
  });
}

/** Whatever `defaultValue`/`value` holds, as the array the selection is tracked as internally. */
function toValues(value: string | string[] | null | undefined): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/** Case-insensitive substring matching, the whole of the filter: a query is a fragment of a label
 * wherever it appears in it, not a prefix. */
function matchesQuery(label: string, query: string): boolean {
  return label.toLowerCase().includes(query.toLowerCase());
}

/** Where the highlight goes for a freshly filtered list: the top match, so `Enter` selects it
 * without an arrow key first. `null` when every match is disabled, or there are none. */
function firstEnabledIndex(options: OptionDescriptor[]): number | null {
  const index = options.findIndex((option) => !option.disabled);
  return index === -1 ? null : index;
}

/** What the input shows for a selection: the selected option's label in single-select, and nothing
 * in `multiple`, where the chips carry the selection and the input stays free for the next
 * query. */
function selectionText(options: Pick<OptionDescriptor, "value" | "label">[], selectedValues: string[], multiple: boolean): string {
  if (multiple) {
    return "";
  }
  const selected = options.find((option) => selectedValues.includes(option.value));
  return selected === undefined ? "" : selected.label;
}

function AutocompleteImpl(props: AutocompleteProps) {
  const {
    children,
    loadOptions,
    debounceMs = 300,
    loadingMessage = "Loading…",
    errorMessage = "Something went wrong.",
    placeholder,
    className,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  } = props;

  const isAsync = loadOptions !== undefined;
  const multiple = props.multiple === true;
  const controlled = props.value !== undefined;
  // Selection is an array in both modes; only what `onChange` reports differs. The public
  // `value`/`onChange` types are a discriminated union on `multiple`, which no single internal
  // call signature can express — so the handler is widened once, here, and every call site below
  // passes the shape its own mode promises.
  const emitChange = props.onChange as ((next: string[] | string) => void) | undefined;

  // `children` is ignored entirely in async mode, so a mistaken non-Option child there never
  // throws — it just goes unread, the same as any other prop the current mode doesn't consult.
  const options = isAsync ? [] : readOptions(children);

  const [uncontrolledValues, setUncontrolledValues] = useState(() => toValues(props.defaultValue));
  const selectedValues = controlled ? toValues(props.value) : uncontrolledValues;

  // The typed text is `Autocomplete`'s own: the component exposes the selected `value`, never the
  // raw text. It is seeded from the initial selection and thereafter only a selection, a
  // keystroke or a blur changes it. In async mode there is nothing to seed it from yet — the
  // option behind an initial `value`/`defaultValue` hasn't been fetched — so it starts blank; a
  // consumer selecting or typing past that point behaves identically to the sync case.
  const [query, setQuery] = useState(() => (isAsync ? "" : selectionText(options, selectedValues, multiple)));
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const [asyncOptions, setAsyncOptions] = useState<OptionDescriptor[]>([]);
  const [asyncStatus, setAsyncStatus] = useState<"idle" | "loading" | "error">("idle");
  const searchTokenRef = useRef(0);
  // A chip in async `multiple` mode must keep showing a label for a value the current search
  // results no longer include — the user searched for something else since selecting it. Sync
  // mode doesn't need this: every option's label is always known from `children`, regardless of
  // what the current query filters to.
  const [asyncSelectedLabels, setAsyncSelectedLabels] = useState<Record<string, string>>({});

  // Debounced by `debounceMs` after the query settles, and guarded against out-of-order
  // responses: a token captured when a search actually starts is compared against the latest one
  // when it resolves, so a slow earlier request can never overwrite a faster later one.
  useEffect(() => {
    if (!isAsync) {
      return;
    }
    const timer = setTimeout(() => {
      const token = ++searchTokenRef.current;
      setAsyncStatus("loading");
      loadOptions(query).then(
        (results) => {
          if (searchTokenRef.current !== token) {
            return;
          }
          const loaded: OptionDescriptor[] = results.map((result) => ({
            value: result.value,
            label: result.label,
            disabled: result.disabled ?? false,
            element: (
              <AutocompleteOption
                key={result.value}
                value={result.value}
                label={result.label}
                icon={result.icon}
                disabled={result.disabled}
              />
            ),
          }));
          setAsyncOptions(loaded);
          setAsyncStatus("idle");
          setHighlightedIndex(firstEnabledIndex(loaded));
        },
        () => {
          if (searchTokenRef.current !== token) {
            return;
          }
          setAsyncOptions([]);
          setAsyncStatus("error");
          setHighlightedIndex(null);
        },
      );
    }, debounceMs);
    return () => {
      clearTimeout(timer);
    };
  }, [isAsync, loadOptions, query, debounceMs]);

  const matches = isAsync ? asyncOptions : options.filter((option) => matchesQuery(option.label, query));
  const matchValues = matches.map((option) => option.value);
  const selectedOptions = isAsync
    ? selectedValues.map((value) => ({ value, label: asyncSelectedLabels[value] ?? value }))
    : options.filter((option) => selectedValues.includes(option.value));
  const disabledIndices = matches.flatMap((option, index) => (option.disabled ? [index] : []));
  const highlighted = highlightedIndex === null ? undefined : matches[highlightedIndex];

  // Every index below — the highlight, `listRef`, `disabledIndices` — is an index into the
  // filtered/loaded list. An entry left behind by a longer one would be navigated onto and point
  // `aria-activedescendant` at an option that is no longer rendered.
  listRef.current.length = matches.length;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // The highlight is meaningless with no listbox to point at, and a stale one would be
      // announced as `aria-activedescendant` the moment the listbox reopened.
      setHighlightedIndex(null);
    }
  }

  function commit(next: string[], reported: string[] | string) {
    // The internal state is kept only while `value` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `value` is later withdrawn.
    if (!controlled) {
      setUncontrolledValues(next);
    }
    emitChange?.(reported);
  }

  function select(value: string, label: string) {
    if (isAsync) {
      setAsyncSelectedLabels((current) => ({ ...current, [value]: label }));
    }
    if (multiple) {
      const next = selectedValues.includes(value) ? selectedValues.filter((selected) => selected !== value) : [...selectedValues, value];
      commit(next, next);
      // The chips carry what has been selected, so the input is free for the next query — and the
      // highlight follows the now-unfiltered list rather than the one just typed. `options` is
      // always `[]` in async mode (there are no declared children to read there); `asyncOptions`
      // is what the listbox is actually still showing until the debounced re-fetch for the
      // cleared query resolves and replaces it.
      setQuery("");
      setHighlightedIndex(firstEnabledIndex(isAsync ? asyncOptions : options));
      return;
    }
    commit([value], value);
    setQuery(label);
    handleOpenChange(false);
  }

  function remove(value: string) {
    const next = selectedValues.filter((selected) => selected !== value);
    commit(next, next);
  }

  const { refs, elements, floatingStyles, themeRoot, getReferenceProps, getFloatingProps, getItemProps } = useListboxKeyboard({
    listRef,
    activeIndex: highlightedIndex,
    onNavigate: setHighlightedIndex,
    disabledIndices,
    // Typing belongs to the filter. A type-ahead that also jumped the highlight to a label
    // starting with the same character would fight it on every keystroke.
    typeahead: false,
    // The role stays on the `<input>` below, which is a real focusable text field rather than
    // an element borrowing combobox semantics.
    role: "combobox",
    open,
    onOpenChange: handleOpenChange,
  });

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const text = event.target.value;
    setQuery(text);
    openListbox();
    if (isAsync) {
      // The debounced effect above resolves the new highlight once `loadOptions` returns for
      // this query — the options on screen right now are the previous query's, about to be
      // replaced, so there is nothing correct to highlight in the meantime.
      setHighlightedIndex(null);
      return;
    }
    // Re-scoped to the new match list rather than cleared, so `Enter` selects the top match with
    // no arrow key first. Computed from `text` rather than from `matches`, which describes the
    // query as it was one render ago.
    setHighlightedIndex(firstEnabledIndex(options.filter((option) => matchesQuery(option.label, text))));
  }

  /** Focusing or clicking the input shows what there is to choose from. `useClick` toggles the
   * listbox shut on the click that follows the focus opening it, so this runs last — the prop
   * getter composes the caller's handler after its own — and leaves it open. */
  function openListbox() {
    handleOpenChange(true);
  }

  /** The chevron opens the listbox the way a click on the input does. Its default action is
   * prevented because pressing a non-focusable element moves focus off the input, and a blur
   * closes the listbox and reverts the query being typed; focusing the input instead is what
   * gives a keyboard user somewhere to carry on from. */
  function handleChevronMouseDown(event: MouseEvent<HTMLSpanElement>) {
    event.preventDefault();
    (elements.domReference as HTMLInputElement).focus();
    openListbox();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      const last = selectedValues[selectedValues.length - 1];
      // Only once there is no text left to delete: while the input holds a query, `Backspace`
      // edits it.
      if (multiple && query === "" && last !== undefined) {
        remove(last);
      }
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    // With the listbox closed `Enter` is the form's, not the listbox's.
    if (!open) {
      return;
    }
    // Pointer hover moves the highlight onto whatever option it passes over, disabled ones
    // included, so a highlighted option is not automatically a selectable one.
    if (highlighted === undefined || highlighted.disabled) {
      return;
    }
    event.preventDefault();
    select(highlighted.value, highlighted.label);
  }

  function handleBlur() {
    handleOpenChange(false);
    // Free text is never a selected value: whatever the input was left holding reverts to what is
    // actually selected — the selected option's label, or nothing at all. Reads `selectedOptions`
    // rather than `options`: `options` is only ever populated in sync mode (it's `[]` in async
    // mode, since there are no declared children to read), while `selectedOptions` already
    // resolves correctly in both — from `children` in sync mode, from `asyncSelectedLabels` in
    // async mode.
    setQuery(selectionText(selectedOptions, selectedValues, multiple));
  }

  const context: AutocompleteContextValue = {
    multiple,
    selectedValues,
    highlightedValue: highlighted === undefined ? null : highlighted.value,
    select,
    registerOption(value, node) {
      // A detaching ref reports `null` for an option the filter has already dropped, whose index
      // now belongs to another option — the length reset above is what clears the stale entries.
      if (node !== null) {
        listRef.current[matchValues.indexOf(value)] = node;
      }
    },
    getItemProps,
  };

  const listbox = open ? (
    <div
      ref={refs.setFloating}
      // Stated here as well as in `getFloatingProps()`, which sets the same value: the spread
      // alone leaves the element's role invisible to a reader and to static analysis.
      role="listbox"
      className="tandiko-listbox"
      style={floatingStyles}
      aria-multiselectable={multiple ? true : undefined}
      {...getFloatingProps()}
    >
      {isAsync && asyncStatus === "loading" ? (
        <div className="tandiko-autocomplete-empty">{loadingMessage}</div>
      ) : isAsync && asyncStatus === "error" ? (
        <div className="tandiko-autocomplete-empty">{errorMessage}</div>
      ) : matches.length === 0 ? (
        // A query matching nothing says so rather than closing the listbox, which would read as
        // the component having stopped responding.
        <div className="tandiko-autocomplete-empty">No results</div>
      ) : (
        matches.map((option) => option.element)
      )}
    </div>
  ) : null;

  return (
    <AutocompleteContext.Provider value={context}>
      {/*
        React 19 hoists and de-duplicates these by `href`, so N autocompletes on a page inject one
        of each — and the listbox sheet is injected identically by every component in this package
        that renders a floating listbox.
      */}
      <style href="tandiko-autocomplete" precedence="tandiko-autocomplete">
        {autocompleteStylesheet}
      </style>
      <style href="tandiko-listbox" precedence="tandiko-listbox">
        {listboxStylesheet}
      </style>
      <div className={["tandiko-autocomplete", className].filter(Boolean).join(" ")}>
        {/* The chips sit before the input as its siblings. The chip row carries no role and no
            interaction handlers of its own, so each remove button is an ordinary interactive
            element needing no nested-descendant guard.

            The input is a direct child of the shell and the last element of its centre. The shell
            reads focus and invalidity off its direct children only, so a wrapper around the input
            would silently cost the field its focus ring and danger border; and the last centre
            element is the one the shell hands its free space to, so the chip row sizes to its
            chips and the input takes the rest.

            The chevron sits in the trailing slot because an input holds no children. It is hidden
            from assistive technology and takes no focus: the input already opens the listbox on
            focus, on click and on the arrow keys, so a second button would be one more tab stop
            announcing what the combobox itself announces. */}
        <FieldShell
          className="tandiko-autocomplete-control"
          trailing={
            <span className="tandiko-autocomplete-chevron" aria-hidden="true" onMouseDown={handleChevronMouseDown}>
              <ChevronDown size={16} />
            </span>
          }
        >
          {multiple && selectedOptions.length > 0 ? (
            <span className="tandiko-autocomplete-chips">
              {selectedOptions.map((option) => (
                <span key={option.value} className="tandiko-listbox-chip">
                  <span className="tandiko-autocomplete-chip-label">{option.label}</span>
                  <button
                    type="button"
                    className="tandiko-listbox-chip-remove"
                    aria-label={`Remove ${option.label}`}
                    onClick={() => {
                      remove(option.value);
                    }}
                  >
                    <X size={12} aria-hidden="true" />
                  </button>
                </span>
              ))}
            </span>
          ) : null}
          <input
            ref={refs.setReference}
            // The role and its required `aria-expanded` are stated here as well as in
            // `getReferenceProps()`, which sets both to the same values: the spread alone leaves
            // the element's semantics invisible to a reader and to static analysis.
            // `aria-autocomplete`, `aria-controls` and `aria-activedescendant` come from the
            // spread.
            role="combobox"
            aria-expanded={open}
            type="text"
            className="tandiko-autocomplete-input"
            value={query}
            placeholder={placeholder}
            // The browser's own suggestion list would render on top of the listbox.
            autoComplete="off"
            id={id}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            {...getReferenceProps({
              onChange: handleInputChange,
              onKeyDown: handleKeyDown,
              onFocus: openListbox,
              onClick: openListbox,
              onBlur: handleBlur,
            })}
          />
        </FieldShell>
      </div>
      {listbox !== null && themeRoot !== null ? createPortal(listbox, themeRoot) : listbox}
    </AutocompleteContext.Provider>
  );
}

type AutocompleteComponent = typeof AutocompleteImpl & {
  Option: typeof AutocompleteOption;
};

/**
 * A filtering combobox: a text input, and a floating listbox of the `Autocomplete.Option` children
 * whose labels match what has been typed.
 *
 * The input itself carries `role="combobox"` and `aria-activedescendant` — real DOM focus never
 * leaves it, and the highlighted option is tracked virtually through that attribute (see
 * `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`). The typed text is
 * `Autocomplete`'s own state: only the selection is exposed, through `value`/`onChange` or left to
 * `Autocomplete` itself and seeded by `defaultValue`. Free text is never a selected value — on
 * blur the input reverts to the selected option's label, or clears.
 *
 * `multiple` switches the selection to arrays and gives each option a checkbox and each selected
 * value a removable chip before the input; selecting in `multiple` mode toggles the option, clears
 * the input for the next query and leaves the listbox open.
 *
 * The listbox portals into the nearest ancestor `.tandiko-root` — the subtree `ThemeProvider`
 * establishes — rather than `document.body`, so it keeps every `--tandiko-*` value. With no
 * `.tandiko-root` ancestor it renders inline beside the input instead, positioned identically but
 * inheriting whatever theme surrounds it.
 *
 * Passing `loadOptions` switches to async mode: `children` is ignored, and `Autocomplete` calls
 * `loadOptions(query)` itself (debounced by `debounceMs`, default 300ms) and renders whatever it
 * resolves to, showing `loadingMessage` while pending and `errorMessage` on a rejection. Results
 * are rendered as returned — filtering the query is the API's job in this mode, not
 * `Autocomplete`'s. An out-of-order response (a slow earlier search resolving after a faster
 * later one) is discarded rather than applied. A `multiple` chip for a value the current search
 * no longer includes keeps the label it was selected with. An initial `value`/`defaultValue`
 * has no label to seed the input or a chip with until something is searched and selected — async
 * mode has no way to resolve a label for a value it was simply handed.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `Autocomplete` export (importing only `Button`, say) is tree-shaken out entirely
// instead of keeping the whole module "just in case" `Object.assign` does something observable.
export const Autocomplete = /* @__PURE__ */ Object.assign(AutocompleteImpl, {
  Option: AutocompleteOption,
}) as AutocompleteComponent;
