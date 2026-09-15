import { Check, type IconComponent, X } from "@tandiko/icons";
import {
  type ChangeEvent,
  Children,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
  getItemProps: (
    userProps?: Record<string, unknown> & { active?: boolean; selected?: boolean },
  ) => Record<string, unknown>;
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

function AutocompleteOption({
  value,
  label,
  icon: OptionIcon,
  disabled = false,
}: AutocompleteOptionProps) {
  const { multiple, selectedValues, highlightedValue, select, registerOption, getItemProps } =
    useAutocompleteContext();

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
  /** `Autocomplete.Option` children, directly beneath `Autocomplete` — there is no list layer,
   * since the listbox's positioning is `Autocomplete`'s own business. Falsy children (what
   * `condition && <Autocomplete.Option />` produces) are skipped; anything else throws at
   * render. */
  children: ReactNode;
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
function selectionText(
  options: OptionDescriptor[],
  selectedValues: string[],
  multiple: boolean,
): string {
  if (multiple) {
    return "";
  }
  const selected = options.find((option) => selectedValues.includes(option.value));
  return selected === undefined ? "" : selected.label;
}

function AutocompleteImpl(props: AutocompleteProps) {
  const {
    children,
    placeholder,
    className,
    id,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
  } = props;

  const multiple = props.multiple === true;
  const controlled = props.value !== undefined;
  // Selection is an array in both modes; only what `onChange` reports differs. The public
  // `value`/`onChange` types are a discriminated union on `multiple`, which no single internal
  // call signature can express — so the handler is widened once, here, and every call site below
  // passes the shape its own mode promises.
  const emitChange = props.onChange as ((next: string[] | string) => void) | undefined;

  const options = readOptions(children);

  const [uncontrolledValues, setUncontrolledValues] = useState(() => toValues(props.defaultValue));
  const selectedValues = controlled ? toValues(props.value) : uncontrolledValues;

  // The typed text is `Autocomplete`'s own: the component exposes the selected `value`, never the
  // raw text. It is seeded from the initial selection and thereafter only a selection, a
  // keystroke or a blur changes it.
  const [query, setQuery] = useState(() => selectionText(options, selectedValues, multiple));
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const matches = options.filter((option) => matchesQuery(option.label, query));
  const matchValues = matches.map((option) => option.value);
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const disabledIndices = matches.flatMap((option, index) => (option.disabled ? [index] : []));
  const highlighted = highlightedIndex === null ? undefined : matches[highlightedIndex];

  // Every index below — the highlight, `listRef`, `disabledIndices` — is an index into the
  // filtered list. An entry left behind by a longer one would be navigated onto and point
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
    if (multiple) {
      const next = selectedValues.includes(value)
        ? selectedValues.filter((selected) => selected !== value)
        : [...selectedValues, value];
      commit(next, next);
      // The chips carry what has been selected, so the input is free for the next query — and the
      // highlight follows the now-unfiltered list rather than the one just typed.
      setQuery("");
      setHighlightedIndex(firstEnabledIndex(options));
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

  const { refs, floatingStyles, themeRoot, getReferenceProps, getFloatingProps, getItemProps } =
    useListboxKeyboard({
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
    // Re-scoped to the new match list rather than cleared, so `Enter` selects the top match with
    // no arrow key first. Computed from `text` rather than from `matches`, which describes the
    // query as it was one render ago.
    setHighlightedIndex(
      firstEnabledIndex(options.filter((option) => matchesQuery(option.label, text))),
    );
  }

  /** Focusing or clicking the input shows what there is to choose from. `useClick` toggles the
   * listbox shut on the click that follows the focus opening it, so this runs last — the prop
   * getter composes the caller's handler after its own — and leaves it open. */
  function openListbox() {
    handleOpenChange(true);
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
    // actually selected — the selected option's label, or nothing at all.
    setQuery(selectionText(options, selectedValues, multiple));
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
      {matches.length === 0 ? (
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
        {/* The chips sit before the input as its siblings. The wrapper carries no role and no
            interaction handlers of its own, so each remove button is an ordinary interactive
            element needing no nested-descendant guard. */}
        <div className="tandiko-autocomplete-control">
          {multiple
            ? selectedOptions.map((option) => (
                <span key={option.value} className="tandiko-listbox-chip">
                  {option.label}
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
              ))
            : null}
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
        </div>
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
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `Autocomplete` export (importing only `Button`, say) is tree-shaken out entirely
// instead of keeping the whole module "just in case" `Object.assign` does something observable.
export const Autocomplete = /* @__PURE__ */ Object.assign(AutocompleteImpl, {
  Option: AutocompleteOption,
}) as AutocompleteComponent;
