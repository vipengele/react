import { FloatingFocusManager } from "@floating-ui/react";
import { Check, ChevronDown, type IconComponent, Search, X } from "@tandiko/icons";
import {
  type ChangeEvent,
  Children,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { listboxStylesheet } from "../internal/listbox.stylesheet.js";
import { useListboxKeyboard } from "../internal/useListboxKeyboard.js";
import { dropdownStylesheet } from "./Dropdown.stylesheet.js";

export interface DropdownOptionProps {
  /** This option's identity. A selection carrying the same string is this option, whatever label
   * the selection itself carries. */
  value: string;
  /** The option's text. A plain string rather than children: it is also what the trigger shows
   * for the current selection, what a chip shows in `multiple` mode, and what type-ahead matches
   * a keystroke against. */
  label: string;
  /** Rendered before the label, and — for the selected option in single-select — in the trigger
   * too. */
  icon?: IconComponent;
  /** Skipped by arrow-key and type-ahead traversal, and not selectable by click or `Enter`. */
  disabled?: boolean;
}

/**
 * A selection, as `Dropdown` takes it and hands it back. The `value` string is the identity: a
 * consumer that re-creates this object on every render keeps its selection, because nothing in
 * `Dropdown` compares object references.
 *
 * The `label` and `icon` are what renders when no `Dropdown.Option` child carries this `value` —
 * a matching option's own label and icon win over them.
 */
export interface DropdownValue {
  value: string;
  label: string;
  icon?: IconComponent;
}

/** What `Dropdown` reads off each `Dropdown.Option` child, in child order. */
interface OptionDescriptor {
  value: string;
  label: string;
  icon?: IconComponent;
  disabled: boolean;
}

interface DropdownContextValue {
  multiple: boolean;
  /** The values the search query matches, in child order. An option outside this list renders
   * nothing: the listbox holds the matches alone, and their positions in it are the indices the
   * arrow keys travel. */
  visibleValues: string[];
  selectedValues: string[];
  highlightedValue: string | null;
  select: (option: DropdownValue) => void;
  registerOption: (value: string, node: HTMLElement | null) => void;
  getItemProps: (userProps?: Record<string, unknown> & { active?: boolean; selected?: boolean }) => Record<string, unknown>;
}

/** `Dropdown.Option` renders inside the floating listbox, which `Dropdown` positions and portals
 * itself — so the selection state, the highlight and floating-ui's item props reach it through
 * context rather than as props the consumer arranges. */
const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext(): DropdownContextValue {
  const context = useContext(DropdownContext);
  if (context === null) {
    throw new Error("Dropdown.Option must be rendered inside <Dropdown>.");
  }
  return context;
}

function DropdownOption({ value, label, icon: OptionIcon, disabled = false }: DropdownOptionProps) {
  const { multiple, visibleValues, selectedValues, highlightedValue, select, registerOption, getItemProps } = useDropdownContext();

  if (!visibleValues.includes(value)) {
    return null;
  }

  const selected = selectedValues.includes(value);
  const highlighted = highlightedValue === value;

  return (
    <div
      {...getItemProps({
        active: highlighted,
        selected,
        onClick: () => {
          if (!disabled) {
            select(toValue({ value, label, icon: OptionIcon, disabled }));
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
      {!multiple && selected ? <Check className="tandiko-listbox-option-check" aria-hidden="true" /> : null}
    </div>
  );
}

interface DropdownBaseProps {
  /** `Dropdown.Option` children, directly beneath `Dropdown` — there is no list layer, since the
   * listbox's positioning is `Dropdown`'s own business. Falsy children (what
   * `condition && <Dropdown.Option />` produces) are skipped; anything else throws at render. */
  children: ReactNode;
  /** Shown in the trigger while nothing is selected. */
  placeholder?: string;
  /** Whether the listbox opens with a search row above it, filtering the options as the consumer
   * types. Off, the trigger keeps real focus and a keystroke jumps the highlight to the next
   * matching label instead. */
  searchable?: boolean;
  /** The search input's hint, and its accessible name — the input is a `role="combobox"` of its
   * own, and this is the only text naming it. */
  searchPlaceholder?: string;
  /** Composed onto the root wrapper. */
  className?: string;
  /** Lands on the trigger, not the wrapper — `FormField` clones it on, and it is the trigger that
   * a `<label>` and a role query have to resolve to. */
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

export interface DropdownSingleProps extends DropdownBaseProps {
  multiple?: false;
  /** Makes the selection controlled; pair it with `onChange`. `null` selects nothing. */
  value?: DropdownValue | null;
  /** The initially selected value when the selection is uncontrolled. */
  defaultValue?: DropdownValue | null;
  onChange?: (value: DropdownValue) => void;
}

export interface DropdownMultipleProps extends DropdownBaseProps {
  multiple: true;
  /** Makes the selection controlled; pair it with `onChange`. */
  value?: DropdownValue[];
  /** The initially selected values when the selection is uncontrolled. */
  defaultValue?: DropdownValue[];
  onChange?: (value: DropdownValue[]) => void;
}

export type DropdownProps = DropdownSingleProps | DropdownMultipleProps;

/**
 * Reads the `Dropdown.Option` children in order. Falsy children (`null`/`undefined`/`false`/
 * `true`, the shape `condition && <Dropdown.Option />` produces) are skipped rather than treated
 * as invalid, matching `Card`'s carve-out. Throws unconditionally, not gated on `NODE_ENV`: an
 * unrecognised child is an option the keyboard, the type-ahead and the selection never see, which
 * is the exact failure this compound API exists to prevent.
 */
function readOptions(children: ReactNode): OptionDescriptor[] {
  const options: OptionDescriptor[] = [];

  Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }
    if (!isValidElement(child) || child.type !== DropdownOption) {
      throw new Error("Dropdown only accepts Dropdown.Option as children.");
    }
    const { value, label, icon, disabled = false } = child.props as DropdownOptionProps;
    options.push({ value, label, icon, disabled });
  });

  return options;
}

/** Whatever `defaultValue`/`value` holds, as the array the selection is tracked as internally. */
function toSelection(value: DropdownValue | DropdownValue[] | null | undefined): DropdownValue[] {
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

/** Whether a key types a character, as opposed to naming a command or completing a chord. A
 * character is the first thing typed into a search, wherever the focus that received it sat. */
function isPrintable(event: KeyboardEvent<HTMLElement>): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

/** An option as the value object `onChange` reports for it. `icon` is left off entirely when the
 * option has none, so the reported object is the literal a consumer would have written. */
function toValue({ value, label, icon }: OptionDescriptor): DropdownValue {
  return icon === undefined ? { value, label } : { value, label, icon };
}

/**
 * The selection as it renders. A `Dropdown.Option` carrying the same `value` supplies the label
 * and icon; the value object's own stand in only when no option carries it, which is what lets a
 * selection outlive the option list it came from.
 */
function resolveSelection(selection: DropdownValue[], options: OptionDescriptor[]): DropdownValue[] {
  return selection.map((selected) => {
    const option = options.find((candidate) => candidate.value === selected.value);
    return option === undefined ? selected : toValue(option);
  });
}

function DropdownImpl(props: DropdownProps) {
  const {
    children,
    placeholder = "Select…",
    searchable = true,
    searchPlaceholder = "Search",
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
  const emitChange = props.onChange as ((next: DropdownValue[] | DropdownValue) => void) | undefined;

  const [uncontrolledSelection, setUncontrolledSelection] = useState(() => toSelection(props.defaultValue));
  const selection = controlled ? toSelection(props.value) : uncontrolledSelection;
  // Identity is the `value` string throughout: every membership test below runs over these
  // strings, so a value object re-created between renders is the same selection as before.
  const selectedValues = selection.map((selected) => selected.value);

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const options = readOptions(children);
  // The listbox holds the matches alone, so every index below — the highlight's, the disabled
  // ones, the slots in `listRef` — is an index into this list rather than into the full option
  // set. With no search row every option matches, and the two lists are the same list.
  const matches = searchable ? options.filter((option) => matchesQuery(option.label, query)) : options;
  const values = matches.map((option) => option.value);
  // Resolved against every option, not the matches: a selection filtered out of the listbox still
  // shows its label in the trigger and in its chip.
  const selectedEntries = resolveSelection(selection, options);
  const disabledIndices = matches.flatMap((option, index) => (option.disabled ? [index] : []));
  const highlighted = highlightedIndex === null ? undefined : matches[highlightedIndex];

  // A query that matches fewer options, or a consumer that conditionally renders fewer
  // `Dropdown.Option` children (a supported pattern — falsy children are skipped, not errors),
  // shrinks `values` between renders. Without this, a slot at the end left behind by a longer
  // previous render points `aria-activedescendant` and keyboard navigation at an option that is
  // no longer rendered.
  listRef.current.length = values.length;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // The highlight is meaningless with no listbox to point at, and a stale one would be
      // announced as `aria-activedescendant` the moment the listbox reopened.
      setHighlightedIndex(null);
      // The query belongs to the panel it filters: kept, the next open shows a list already
      // narrowed by a search the consumer has finished with.
      setQuery("");
    }
  }

  /** Moves the query, and the highlight with it. The highlight is an index into the matches, so a
   * new query re-scopes it to that list's top selectable option — `Enter` acts on the best match
   * with no arrow key first, and no index survives pointing at an option the query dropped. */
  function applyQuery(next: string) {
    setQuery(next);
    setHighlightedIndex(firstEnabledIndex(options.filter((option) => matchesQuery(option.label, next))));
  }

  function commit(next: DropdownValue[], reported: DropdownValue[] | DropdownValue) {
    // The internal state is kept only while `value` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `value` is later withdrawn.
    if (!controlled) {
      setUncontrolledSelection(next);
    }
    emitChange?.(reported);
  }

  function select(option: DropdownValue) {
    if (multiple) {
      const next = selectedValues.includes(option.value)
        ? selection.filter((selected) => selected.value !== option.value)
        : [...selection, option];
      commit(next, next);
      if (searchable) {
        // The panel stays open, so the query goes: the next character searches every option
        // rather than narrowing what is left of the picked option's own match. The highlight
        // follows that option into the unfiltered list, where a second `Enter` toggles it back
        // instead of acting on whichever option the full list happens to start with.
        setQuery("");
        setHighlightedIndex(options.findIndex((candidate) => candidate.value === option.value));
      }
      return;
    }
    commit([option], option);
    handleOpenChange(false);
  }

  function remove(value: string) {
    const next = selection.filter((selected) => selected.value !== value);
    commit(next, next);
  }

  const {
    refs,
    floatingStyles,
    context: floatingContext,
    themeRoot,
    fieldRef,
    onFieldMouseDown,
    getReferenceProps,
    getFloatingProps,
    getItemProps,
    getSearchProps,
  } = useListboxKeyboard({
    listRef,
    activeIndex: highlightedIndex,
    onNavigate: setHighlightedIndex,
    disabledIndices,
    // A search input owns every keystroke once one exists: type-ahead is the trigger's own way of
    // reaching an option by its label, for the mode with no input to type into.
    typeahead: !searchable,
    role: "select",
    search: searchable,
    open,
    onOpenChange: handleOpenChange,
  });

  /** `Enter`/`Space` opens the closed listbox and selects the highlighted option in the open one.
   * Both keys are the trigger's own — `useClick`'s handlers for them are switched off in
   * `useListboxKeyboard`, so nothing else on this element acts on them. Every other character
   * belongs to the search row, which is why the two keys are settled first: `Space` is a printable
   * character too, and on a trigger it is the selection key. */
  function handleTriggerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      // A character typed at a closed search row is the first character of the search: it opens
      // the panel and seeds the query, and the focus manager puts the caret after it. A trigger
      // types nothing itself, so the character is lost otherwise.
      if (searchable && !open && isPrintable(event)) {
        event.preventDefault();
        handleOpenChange(true);
        applyQuery(event.key);
      }
      return;
    }
    event.preventDefault();
    if (!open) {
      handleOpenChange(true);
      return;
    }
    // Pointer hover moves the highlight onto whatever option it passes over, disabled ones
    // included, so a highlighted option is not automatically a selectable one.
    if (highlighted === undefined || highlighted.disabled) {
      return;
    }
    select(toValue(highlighted));
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    applyQuery(event.target.value);
  }

  /** `Enter` selects the highlighted option, and `Backspace` with no character to delete removes
   * the last selection — the chip the field ends with. `Space` belongs to the query here: it is a
   * character in a search, not the selection key it is on a trigger with no input to type into.
   *
   * `Backspace` is `multiple`'s alone. Single-select's `onChange` is `(value: DropdownValue) =>
   * void`, with no empty selection in its signature to report, so removing the one selection has
   * nothing to hand back — an emptied single selection needs that signature widened first. */
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const last = selection.at(-1);
    if (multiple && event.key === "Backspace" && query === "" && last !== undefined) {
      remove(last.value);
      return;
    }
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    if (highlighted === undefined || highlighted.disabled) {
      return;
    }
    select(toValue(highlighted));
  }

  const context: DropdownContextValue = {
    multiple,
    visibleValues: values,
    selectedValues,
    highlightedValue: highlighted === undefined ? null : highlighted.value,
    select,
    registerOption(value, node) {
      // A detaching ref reports `null` for an option a shorter render has already dropped, whose
      // index now belongs to another option or is past the length trim above — writing it back
      // would undo that trim.
      if (node !== null) {
        listRef.current[values.indexOf(value)] = node;
      }
    },
    getItemProps,
  };

  /** What the trigger shows: the selected option in single-select, a count in `multiple` (the
   * chips beside it carry the detail), and the placeholder in either mode while nothing is
   * selected. */
  function renderTriggerContent(): ReactNode {
    const placeholderContent = <span className="tandiko-dropdown-placeholder">{placeholder}</span>;

    if (multiple) {
      return selectedEntries.length === 0 ? (
        placeholderContent
      ) : (
        <span className="tandiko-dropdown-summary">{selectedEntries.length} selected</span>
      );
    }

    const selected = selectedEntries[0];
    if (selected === undefined) {
      return placeholderContent;
    }
    const SelectedIcon = selected.icon;
    return (
      <>
        {SelectedIcon ? <SelectedIcon className="tandiko-dropdown-trigger-icon" aria-hidden="true" /> : null}
        <span className="tandiko-dropdown-value">{selected.label}</span>
      </>
    );
  }

  /** The options, or — for a query that matches none of them — the message standing in for them.
   * A listbox left blank reads as a control that has stopped answering. */
  const optionRows = searchable && matches.length === 0 ? <div className="tandiko-listbox-empty">No results</div> : children;

  /** The search row and the listbox are siblings inside the floating element, so no key travelling
   * from the input reaches the listbox by bubbling: the arrow keys arrive through
   * `getSearchProps()` alone. `getFloatingProps()` goes on the listbox rather than on the panel
   * around it — it carries the id every `aria-controls` points at, and on the panel that id would
   * name a box holding the search input too. */
  function renderSearchPanel(): ReactNode {
    return (
      <div ref={refs.setFloating} className="tandiko-listbox-panel" style={floatingStyles}>
        {/* Non-modal: the trigger and the page behind the panel stay reachable, and the manager's
          one job here is to put real focus in the search input and hand it back to the trigger as
          the panel unmounts. */}
        <FloatingFocusManager context={floatingContext} modal={false} initialFocus={searchRef}>
          {/* The one element the focus manager holds. */}
          <div>
            <div className="tandiko-listbox-search">
              <Search className="tandiko-listbox-search-icon" aria-hidden="true" />
              <input
                ref={searchRef}
                type="text"
                // The role and its required `aria-expanded` are stated here as well as in
                // `getSearchProps()`, which sets both to the same values: the spread alone leaves
                // the element's semantics invisible to a reader and to static analysis. The panel
                // holding this input exists only while the listbox is open, so `aria-expanded` is
                // true for the whole of its life. `aria-controls`, `aria-autocomplete` and
                // `aria-activedescendant` come from the spread. The trigger is a `combobox` too —
                // it holds the accessible name and description, and this input holds the live
                // navigation state.
                role="combobox"
                aria-expanded={true}
                className="tandiko-listbox-search-input"
                // The browser's own suggestion list would float over the options this input filters.
                autoComplete="off"
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                value={query}
                {...getSearchProps({ onChange: handleSearchChange, onKeyDown: handleSearchKeyDown })}
              />
            </div>
            <div
              // Stated here as well as in `getFloatingProps()`, which sets the same value: the
              // spread alone leaves the element's role invisible to a reader and to static analysis.
              role="listbox"
              className="tandiko-listbox-options"
              aria-multiselectable={multiple ? true : undefined}
              {...getFloatingProps()}
            >
              {optionRows}
            </div>
          </div>
        </FloatingFocusManager>
      </div>
    );
  }

  /** The floating element. With no search row the listbox is that element itself: nothing else is
   * in the popover to position, and nothing in it takes real focus. */
  function renderFloating(): ReactNode {
    if (searchable) {
      return renderSearchPanel();
    }
    return (
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
        {optionRows}
      </div>
    );
  }

  const listbox = open ? renderFloating() : null;

  return (
    <DropdownContext.Provider value={context}>
      {/*
        React 19 hoists and de-duplicates these by `href`, so N dropdowns on a page inject one of
        each — and the listbox sheet is injected identically by every component in this package
        that renders a floating listbox.
      */}
      <style href="tandiko-dropdown" precedence="tandiko-dropdown">
        {dropdownStylesheet}
      </style>
      <style href="tandiko-listbox" precedence="tandiko-listbox">
        {listboxStylesheet}
      </style>
      <div className={["tandiko-dropdown", className].filter(Boolean).join(" ")}>
        {/* The chips sit beside the trigger, never inside it: floating-ui merges its own click
            and keyboard handlers into the trigger's, so a nested remove button's click could not
            be reliably intercepted before those ran. As siblings, each remove button is an
            ordinary interactive element needing no guard at all.

            The trigger is a direct child of the shell and the last element of its centre. The
            shell reads focus and invalidity off its direct children only, so a wrapper around the
            trigger would silently cost the field its focus ring and danger border; and the last
            centre element is the one the shell hands its free space to, so the chip row sizes to
            its chips and the trigger takes the rest.

            A press on the field's padding or a gap in the chip row lands on the field rather than
            the trigger. The field's handler keeps focus on the trigger and opens the listbox, as a
            click on the trigger would; left to the browser, focus moves to `<body>` and an open
            listbox stops answering the arrow keys. */}
        <FieldShell ref={fieldRef} className="tandiko-dropdown-control" onMouseDown={onFieldMouseDown}>
          {multiple && selectedEntries.length > 0 ? (
            <span className="tandiko-listbox-chips">
              {selectedEntries.map((selected) => (
                <span key={selected.value} className="tandiko-listbox-chip">
                  <span className="tandiko-listbox-chip-label">{selected.label}</span>
                  <button
                    type="button"
                    className="tandiko-listbox-chip-remove"
                    aria-label={`Remove ${selected.label}`}
                    onClick={() => {
                      remove(selected.value);
                    }}
                  >
                    <X className="tandiko-listbox-chip-remove-icon" aria-hidden="true" />
                  </button>
                </span>
              ))}
            </span>
          ) : null}
          <div
            ref={refs.setReference}
            // The role and its required `aria-expanded` are stated here as well as in
            // `getReferenceProps()`, which sets both to the same values: the spread alone leaves
            // the element's semantics invisible to a reader and to static analysis.
            // `aria-haspopup`, `aria-controls` and `aria-activedescendant` come from the spread.
            // A `<button>` is not an option here — only `combobox` and a handful of other roles
            // may carry `aria-activedescendant`.
            role="combobox"
            aria-expanded={open}
            className="tandiko-dropdown-trigger"
            tabIndex={0}
            id={id}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            {...getReferenceProps({ onKeyDown: handleTriggerKeyDown })}
          >
            {renderTriggerContent()}
            {/* Inside the trigger rather than in the shell's trailing slot, so a click on the
                chevron is a click on the combobox and opens it. */}
            <ChevronDown size={16} className="tandiko-dropdown-chevron" aria-hidden="true" />
          </div>
        </FieldShell>
      </div>
      {listbox !== null && themeRoot !== null ? createPortal(listbox, themeRoot) : listbox}
    </DropdownContext.Provider>
  );
}

type DropdownComponent = typeof DropdownImpl & {
  Option: typeof DropdownOption;
};

/**
 * A select-only combobox: a trigger showing the current selection, and a floating listbox of
 * `Dropdown.Option` children.
 *
 * The trigger is a `<div role="combobox" tabIndex={0}>` rather than a `<button>` — only
 * `combobox`, `textbox`, `listbox`, `group`, `application` and the composite-derived roles may
 * carry `aria-activedescendant`, and the highlighted option is tracked virtually through exactly
 * that attribute rather than by moving real DOM focus into the listbox (see
 * `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`).
 *
 * `searchable` (default `true`) opens the listbox under a search row — a magnifier and an input,
 * then a divider — that filters the options by a case-insensitive substring of their labels, and
 * says so when the query matches none. The input is a `role="combobox"` of its own holding the
 * live navigation state, while the trigger keeps the accessible name and description; a non-modal
 * `FloatingFocusManager` puts real focus in the input and returns it to the trigger as the panel
 * closes. Every keystroke belongs to that search: a character typed on the closed trigger opens
 * the panel and seeds the query with it, a pick clears the query, `multiple`'s `Backspace` with no
 * character to delete removes the last selection, and the query clears as the panel closes.
 * `searchable={false}` leaves real focus on the trigger throughout, with a keystroke there jumping
 * the highlight to the next matching label instead.
 *
 * Selection is a `DropdownValue` object — `{ value, label, icon? }` — controlled through
 * `value`/`onChange` or left to `Dropdown` itself, seeded by `defaultValue`. `multiple` switches
 * both to arrays and gives each option a checkbox and each selected value a removable chip beside
 * the trigger; selecting in `multiple` mode toggles the option and leaves the listbox open.
 *
 * The listbox portals into the nearest ancestor `.tandiko-root` — the subtree `ThemeProvider`
 * establishes — rather than `document.body`, so it keeps every `--tandiko-*` value. With no
 * `.tandiko-root` ancestor it renders inline beside the trigger instead, positioned identically
 * but inheriting whatever theme surrounds it.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `Dropdown` export (importing only `Button`, say) is tree-shaken out entirely instead
// of keeping the whole module "just in case" `Object.assign` does something observable.
export const Dropdown = /* @__PURE__ */ Object.assign(DropdownImpl, {
  Option: DropdownOption,
}) as DropdownComponent;
