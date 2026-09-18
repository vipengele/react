import { Check, type IconComponent, X } from "@tandiko/icons";
import { Children, createContext, isValidElement, type KeyboardEvent, type ReactNode, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listboxStylesheet } from "../internal/listbox.stylesheet.js";
import { useListboxKeyboard } from "../internal/useListboxKeyboard.js";
import { dropdownStylesheet } from "./Dropdown.stylesheet.js";

export interface DropdownOptionProps {
  /** What `Dropdown` reports through `onChange` when this option is selected. */
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

/** What `Dropdown` reads off each `Dropdown.Option` child, in child order. */
interface OptionDescriptor {
  value: string;
  label: string;
  icon?: IconComponent;
  disabled: boolean;
}

interface DropdownContextValue {
  multiple: boolean;
  selectedValues: string[];
  highlightedValue: string | null;
  select: (value: string) => void;
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
  const { multiple, selectedValues, highlightedValue, select, registerOption, getItemProps } = useDropdownContext();

  const selected = selectedValues.includes(value);
  const highlighted = highlightedValue === value;

  return (
    <div
      {...getItemProps({
        active: highlighted,
        selected,
        onClick: () => {
          if (!disabled) {
            select(value);
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

interface DropdownBaseProps {
  /** `Dropdown.Option` children, directly beneath `Dropdown` — there is no list layer, since the
   * listbox's positioning is `Dropdown`'s own business. Falsy children (what
   * `condition && <Dropdown.Option />` produces) are skipped; anything else throws at render. */
  children: ReactNode;
  /** Shown in the trigger while nothing is selected. */
  placeholder?: string;
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
  value?: string | null;
  /** The initially selected value when the selection is uncontrolled. */
  defaultValue?: string | null;
  onChange?: (value: string) => void;
}

export interface DropdownMultipleProps extends DropdownBaseProps {
  multiple: true;
  /** Makes the selection controlled; pair it with `onChange`. */
  value?: string[];
  /** The initially selected values when the selection is uncontrolled. */
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
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
function toValues(value: string | string[] | null | undefined): string[] {
  if (value === null || value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function DropdownImpl(props: DropdownProps) {
  const {
    children,
    placeholder = "Select…",
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

  const [uncontrolledValues, setUncontrolledValues] = useState(() => toValues(props.defaultValue));
  const selectedValues = controlled ? toValues(props.value) : uncontrolledValues;

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const options = readOptions(children);
  const values = options.map((option) => option.value);
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const disabledIndices = options.flatMap((option, index) => (option.disabled ? [index] : []));
  const highlighted = highlightedIndex === null ? undefined : options[highlightedIndex];

  // A consumer that conditionally renders fewer `Dropdown.Option` children (a supported pattern —
  // falsy children are skipped, not errors) shrinks `values` between renders. Without this, a
  // slot at the end left behind by a longer previous render points `aria-activedescendant` and
  // keyboard navigation at an option that is no longer rendered.
  listRef.current.length = values.length;

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

  function select(value: string) {
    if (multiple) {
      const next = selectedValues.includes(value) ? selectedValues.filter((selected) => selected !== value) : [...selectedValues, value];
      commit(next, next);
      return;
    }
    commit([value], value);
    handleOpenChange(false);
  }

  function remove(value: string) {
    const next = selectedValues.filter((selected) => selected !== value);
    commit(next, next);
  }

  const { refs, floatingStyles, themeRoot, getReferenceProps, getFloatingProps, getItemProps } = useListboxKeyboard({
    listRef,
    activeIndex: highlightedIndex,
    onNavigate: setHighlightedIndex,
    disabledIndices,
    typeahead: true,
    role: "select",
    open,
    onOpenChange: handleOpenChange,
  });

  /** `Enter`/`Space` opens the closed listbox and selects the highlighted option in the open one.
   * Both keys are the trigger's own — `useClick`'s handlers for them are switched off in
   * `useListboxKeyboard`, so nothing else on this element acts on them. */
  function handleTriggerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
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
    select(highlighted.value);
  }

  const context: DropdownContextValue = {
    multiple,
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
      return selectedOptions.length === 0 ? (
        placeholderContent
      ) : (
        <span className="tandiko-dropdown-summary">{selectedOptions.length} selected</span>
      );
    }

    const selectedOption = selectedOptions[0];
    if (selectedOption === undefined) {
      return placeholderContent;
    }
    const SelectedIcon = selectedOption.icon;
    return (
      <>
        {SelectedIcon ? <SelectedIcon className="tandiko-dropdown-trigger-icon" aria-hidden="true" /> : null}
        <span className="tandiko-dropdown-value">{selectedOption.label}</span>
      </>
    );
  }

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
      {children}
    </div>
  ) : null;

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
            ordinary interactive element needing no guard at all. */}
        <div className="tandiko-dropdown-control">
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
          </div>
        </div>
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
 * Selection is controlled through `value`/`onChange` or left to `Dropdown` itself, seeded by
 * `defaultValue`. `multiple` switches both to arrays and gives each option a checkbox and each
 * selected value a removable chip beside the trigger; selecting in `multiple` mode toggles the
 * option and leaves the listbox open.
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
