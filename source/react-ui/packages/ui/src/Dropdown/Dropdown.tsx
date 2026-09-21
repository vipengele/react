import { FloatingFocusManager } from "@floating-ui/react";
import { Check, ChevronDown, type IconComponent, Search, X } from "@vipengele/react-icons";
import {
  type ChangeEvent,
  Children,
  createContext,
  isValidElement,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { listboxStylesheet } from "../internal/listbox.stylesheet.js";
import { useListboxKeyboard } from "../internal/useListboxKeyboard.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
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

export interface DropdownGroupProps {
  /** The heading drawn above the group's options, and the group's accessible name. */
  label: string;
  /** `Dropdown.Option` children, and nothing else: a group heads one run of options rather than a
   * tree, so a `Dropdown.Group` among them throws. Falsy children are skipped, as directly under
   * `Dropdown`. */
  children?: ReactNode;
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

/**
 * One search result from `loadOptions`, in async mode — a plain data object rather than
 * `Dropdown.Option` JSX, since a result that hasn't come back from the API yet has no element for
 * a consumer to have declared. `Dropdown` renders each one as a `Dropdown.Option` itself; the
 * fields are exactly that component's own props, so a declared and a loaded list mean the same
 * thing per entry.
 */
export interface DropdownAsyncOption {
  value: string;
  label: string;
  icon?: IconComponent;
  disabled?: boolean;
  /** The heading this result belongs under. Results carrying the same string are one group,
   * however far apart they arrive in the array; the groups stand in the order their first result
   * arrives, after every result carrying no group at all. */
  group?: string;
}

/** What `Dropdown` reads off each `Dropdown.Option` child, in the order the listbox draws them. */
interface OptionDescriptor {
  value: string;
  label: string;
  icon?: IconComponent;
  disabled: boolean;
  /** The `Dropdown.Group` heading this option stands under, or `undefined` for an option outside
   * every group. A group is drawn from these; it takes no place in the flat list this array is. */
  group?: string;
}

interface DropdownContextValue {
  multiple: boolean;
  /** Where each value the search query matches stands in the listbox. A value absent from this
   * map renders nothing: the listbox holds the matches alone, and their positions in it are the
   * indices the arrow keys travel. A map rather than a list of values, because every option asks
   * this question once per render — a scan per option is quadratic over a query that matches them
   * all. */
  optionIndices: ReadonlyMap<string, number>;
  /** The group headings the listbox draws, in the order their options stand in it. A group absent
   * from this list has no matching option and renders nothing — heading, separator and all. */
  visibleGroups: string[];
  selectedValues: string[];
  highlightedValue: string | null;
  select: (option: DropdownValue) => void;
  registerOption: (index: number, node: HTMLElement | null) => void;
  getItemProps: (userProps?: Record<string, unknown> & { active?: boolean; selected?: boolean }) => Record<string, unknown>;
}

/** `Dropdown.Option` and `Dropdown.Group` render inside the floating listbox, which `Dropdown`
 * positions and portals itself — so the selection state, the highlight, the visible groups and
 * floating-ui's item props reach them through context rather than as props the consumer
 * arranges. */
const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext(component: string): DropdownContextValue {
  const context = useContext(DropdownContext);
  if (context === null) {
    throw new Error(`${component} must be rendered inside <Dropdown>.`);
  }
  return context;
}

function DropdownOption({ value, label, icon: OptionIcon, disabled = false }: DropdownOptionProps) {
  const { multiple, optionIndices, selectedValues, highlightedValue, select, registerOption, getItemProps } =
    useDropdownContext("Dropdown.Option");

  // One lookup answers both questions this option has: whether it is among the matches at all,
  // and — if it is — which `listRef` slot it registers its node in.
  const index = optionIndices.get(value);
  if (index === undefined) {
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
        registerOption(index, node);
      }}
      className="vpg-listbox-option"
      aria-disabled={disabled ? true : undefined}
      data-highlighted={highlighted ? "" : undefined}
    >
      {multiple ? (
        <span className="vpg-listbox-checkbox" data-checked={selected ? "" : undefined}>
          {selected ? <Check size={12} aria-hidden="true" /> : null}
        </span>
      ) : null}
      {OptionIcon ? <OptionIcon className="vpg-listbox-option-icon" aria-hidden="true" /> : null}
      <span className="vpg-listbox-option-label">{label}</span>
      {!multiple && selected ? <Check className="vpg-listbox-option-check" aria-hidden="true" /> : null}
    </div>
  );
}

/**
 * A heading and the options standing under it. The heading is not an option: it carries no place
 * in the flat list the arrow keys, `Home`/`End` and the highlight travel, so the index of every
 * option is the index it would hold with no group around it at all.
 *
 * The separator is the group's own leading edge, drawn for every group but the first one showing —
 * which puts a line between each pair of groups and none at either end of the list, without the
 * consumer declaring one.
 */
function DropdownGroup({ label, children }: DropdownGroupProps) {
  const { visibleGroups } = useDropdownContext("Dropdown.Group");
  const headingId = useId();

  const position = visibleGroups.indexOf(label);
  if (position === -1) {
    return null;
  }

  return (
    <>
      {position > 0 ? <div className="vpg-listbox-separator" aria-hidden="true" /> : null}
      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> implies form-control semantics
          and carries its own chrome; what a listbox owns between itself and its options is a
          plain role="group". */}
      <div role="group" className="vpg-listbox-group" aria-labelledby={headingId}>
        <div id={headingId} className="vpg-listbox-group-label">
          {label}
        </div>
        {children}
      </div>
    </>
  );
}

interface DropdownBaseProps {
  /**
   * `Dropdown.Option` children, directly beneath `Dropdown` — there is no list layer, since the
   * listbox's positioning is `Dropdown`'s own business. Falsy children (what
   * `condition && <Dropdown.Option />` produces) are skipped; anything else throws at render.
   *
   * Ignored when `loadOptions` is provided — the two are alternate option sources, not
   * combinable, since an async result has no consumer-declared element to fall back to.
   */
  children?: ReactNode;
  /**
   * Switches `Dropdown` into async mode: instead of filtering `children`, it calls this with the
   * current query (debounced by `debounceMs`) and renders whatever it resolves to. A rejection is
   * not the consumer's to catch — it surfaces as `errorMessage` in the listbox. Filtering is the
   * API's job in this mode; results are rendered as returned, unfiltered again client-side.
   */
  loadOptions?: (query: string) => Promise<DropdownAsyncOption[]>;
  /** How long to wait, after the query stops changing, before calling `loadOptions`. Only reads
   * in async mode. */
  debounceMs?: number;
  /** Shown, non-interactively, in the listbox while `loadOptions` is pending. */
  loadingMessage?: string;
  /** Shown, non-interactively, in the listbox when `loadOptions` rejects. */
  errorMessage?: string;
  /** Shown in the trigger while nothing is selected. */
  placeholder?: string;
  /** Whether the listbox opens with a search row above it, filtering the options as the consumer
   * types. Off, the trigger keeps real focus and a keystroke jumps the highlight to the next
   * matching label instead. */
  searchable?: boolean;
  /** The search input's hint, and its accessible name — the input is a `role="combobox"` of its
   * own, and this is the only text naming it. */
  searchPlaceholder?: string;
  /** Whether `multiple`'s chips wrap onto further rows, growing the field downwards, instead of
   * keeping to one row with an indicator standing for the chips that do not fit. Only reads in
   * `multiple` mode; a wrapping field measures nothing and observes nothing. */
  wrapChips?: boolean;
  /** Whether the field offers a "Clear selection" button emptying the whole selection at once.
   * The button is in the shell's trailing slot and shows only while something is selected, so an
   * empty field carries no control with nothing to do. */
  clearable?: boolean;
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
  /** Reports the option that was picked, or `null` for a selection that has been emptied — the
   * same `DropdownValue | null` that `value` and `defaultValue` take, so a controlled consumer
   * hands straight back what it is given. */
  onChange?: (value: DropdownValue | null) => void;
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

/** Whether a child is one React renders nothing for — `null`/`undefined`/`false`/`true`, the
 * shape `condition && <Dropdown.Option />` produces. Skipped rather than treated as invalid,
 * matching `Card`'s carve-out. */
function isFalsyChild(child: ReactNode): boolean {
  return child === null || child === undefined || typeof child === "boolean";
}

/** One `Dropdown.Option` element's props, as the descriptor the flat list holds for it. */
function toDescriptor(props: DropdownOptionProps, group?: string): OptionDescriptor {
  const { value, label, icon, disabled = false } = props;
  return { value, label, icon, disabled, group };
}

/**
 * Reads the options a `Dropdown.Group` heads, tagged with its heading. The group is a rendering
 * layer over one flat list, not a level of it, so a `Dropdown.Group` here — like any other child
 * that is neither an `Option` nor falsy — throws.
 */
function readGroupOptions(children: ReactNode, group: string): OptionDescriptor[] {
  const options: OptionDescriptor[] = [];

  Children.forEach(children, (child) => {
    if (isFalsyChild(child)) {
      return;
    }
    if (!isValidElement(child) || child.type !== DropdownOption) {
      throw new Error("Dropdown.Group only accepts Dropdown.Option as children.");
    }
    options.push(toDescriptor(child.props as DropdownOptionProps, group));
  });

  return options;
}

/**
 * Reads the options the children declare, in the order the listbox draws them — a group's own
 * options flattened in place, so an option's index here is the index it would hold with no group
 * around it. Throws unconditionally, not gated on `NODE_ENV`: an unrecognised child is an option
 * the keyboard, the type-ahead and the selection never see, which is the exact failure this
 * compound API exists to prevent.
 */
function readOptions(children: ReactNode): OptionDescriptor[] {
  const options: OptionDescriptor[] = [];

  Children.forEach(children, (child) => {
    if (isFalsyChild(child)) {
      return;
    }
    if (isValidElement(child) && child.type === DropdownGroup) {
      const { label, children: groupChildren } = child.props as DropdownGroupProps;
      options.push(...readGroupOptions(groupChildren, label));
      return;
    }
    if (!isValidElement(child) || child.type !== DropdownOption) {
      throw new Error("Dropdown only accepts Dropdown.Option and Dropdown.Group as children.");
    }
    options.push(toDescriptor(child.props as DropdownOptionProps));
  });

  return options;
}

/** The headings the listbox draws for a list of options, in the order their options stand in it.
 * A heading appears once however many options carry it, and an option carrying none contributes
 * nothing. */
function groupsOf(options: OptionDescriptor[]): string[] {
  const groups: string[] = [];
  for (const option of options) {
    if (option.group !== undefined && !groups.includes(option.group)) {
      groups.push(option.group);
    }
  }
  return groups;
}

/** Async results in the order they render: everything carrying no group first, in the order the
 * API returned it, then each group's own results, the groups themselves standing in the order
 * their first result arrived in. Sorting here rather than at render keeps the flat list the
 * highlight, `listRef` and `disabledIndices` index into in the order the listbox draws. */
function inGroupOrder(options: OptionDescriptor[]): OptionDescriptor[] {
  return [
    ...options.filter((option) => option.group === undefined),
    ...groupsOf(options).flatMap((group) => options.filter((option) => option.group === group)),
  ];
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

/** The border-box width of every element in `row` matching `selector`, in document order. */
function widthsOf(row: HTMLElement, selector: string): number[] {
  return Array.from(row.querySelectorAll(selector), (box) => box.getBoundingClientRect().width);
}

/** How many of `widths`, laid end to end with `gap` between each pair, stand inside `available`.
 * Counting stops at the first box that does not fit: a row shows a prefix of its boxes, so a
 * later narrow one never takes the place of an earlier wide one. */
function countFitting(widths: number[], gap: number, available: number): number {
  let used = 0;
  let fitting = 0;
  for (const width of widths) {
    used += fitting === 0 ? width : gap + width;
    if (used > available) {
      break;
    }
    fitting += 1;
  }
  return fitting;
}

/**
 * How many of a chip row's chips have no room on its single line. What fits is measured rather
 * than capped at a number: a count that suits one field is wrong for a narrower one, where it
 * already overflows, and for a wider one, where it leaves room the field could have used.
 *
 * The read happens with the row marked `data-measuring`, which puts every chip back on it at its
 * own width — a hidden chip has no width to weigh, and the row itself shrinks to whatever is left
 * in it once some are hidden, so both reads have to see an uncollapsed row.
 *
 * The indicator is measured as it currently reads. Its own width is the reservation, so a row
 * showing no indicator yet reserves the width of the one it would show, and a hidden count
 * crossing a digit boundary is a fraction of a character out until the next measurement.
 */
function measureHiddenChips(row: HTMLElement): number {
  row.setAttribute("data-measuring", "");
  const chips = widthsOf(row, ".vpg-listbox-chip");
  const indicator = widthsOf(row, ".vpg-listbox-overflow-chip");
  const available = row.clientWidth;
  row.removeAttribute("data-measuring");

  // An engine that lays nothing out reports every box at zero width, and a row measuring zero has
  // no answer to give: every chip stays on screen rather than collapsing into an indicator
  // standing for the whole selection.
  if (available === 0) {
    return 0;
  }

  const gap = Number.parseFloat(getComputedStyle(row).columnGap);
  if (countFitting(chips, gap, available) === chips.length) {
    return 0;
  }

  // The indicator is on the row from here on, so it takes its width off the row before any chip
  // is counted onto it; its place at the head of this list is that reservation, not the end it
  // renders at. One chip shows whatever it costs — a row of nothing but an indicator says how
  // many selections there are and names none of them — and shrinks to the room left.
  const showing = Math.max(countFitting([...indicator, ...chips], gap, available) - 1, 1);
  return chips.length - showing;
}

function DropdownImpl(props: DropdownProps) {
  const {
    children,
    loadOptions,
    debounceMs = 300,
    loadingMessage = "Loading…",
    errorMessage = "Something went wrong.",
    placeholder = "Select…",
    searchable = true,
    searchPlaceholder = "Search",
    wrapChips = false,
    clearable = false,
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
  const emitChange = props.onChange as ((next: DropdownValue[] | DropdownValue | null) => void) | undefined;

  const [uncontrolledSelection, setUncontrolledSelection] = useState(() => toSelection(props.defaultValue));
  const selection = controlled ? toSelection(props.value) : uncontrolledSelection;
  // Identity is the `value` string throughout: every membership test below runs over these
  // strings, so a value object re-created between renders is the same selection as before.
  const selectedValues = selection.map((selected) => selected.value);

  const selectionDescriptionId = useId();
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const listRef = useRef<Array<HTMLElement | null>>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const chipsRef = useRef<HTMLSpanElement>(null);
  /** How many chips at the end of the selection the row has no width for. Written only by the
   * measurement below, so it is zero until a layout has been read and zero wherever there is no
   * layout to read. */
  const [hiddenChipCount, setHiddenChipCount] = useState(0);

  const [asyncOptions, setAsyncOptions] = useState<OptionDescriptor[]>([]);
  const [asyncStatus, setAsyncStatus] = useState<"idle" | "loading" | "error">("idle");
  const searchTokenRef = useRef(0);

  /** The `loadOptions` of the latest render, for the search below to call without taking it as a
   * dependency. An inline arrow — the documented form — carries a fresh identity out of every
   * render of whatever holds the `Dropdown`, and a search keyed off that identity restarts the
   * debounce and abandons the request in flight for a query that has not changed at all. */
  const loadOptionsRef = useRef(loadOptions);
  useEffect(() => {
    loadOptionsRef.current = loadOptions;
  });

  // Debounced by `debounceMs` after the query settles, and guarded against a response the query
  // has moved past: the token is taken as this search becomes the current one, so every re-run —
  // a new query, a new debounce — invalidates whatever is already in flight. A request that
  // resolves against a stale token publishes nothing, whether a faster later search has already
  // answered or the later search is still inside its debounce window with no answer yet.
  //
  // `loadOptions` is deliberately absent from the dependencies: the effect calls whatever the
  // latest render passed, through the ref above, rather than restarting whenever that function's
  // identity changes.
  useEffect(() => {
    if (!isAsync) {
      return;
    }
    const token = ++searchTokenRef.current;
    const timer = setTimeout(() => {
      setAsyncStatus("loading");
      // The `isAsync` gate above is what makes this defined: the two are the same condition on
      // the same prop.
      const load = loadOptionsRef.current as (query: string) => Promise<DropdownAsyncOption[]>;
      load(query).then(
        (results) => {
          if (searchTokenRef.current !== token) {
            return;
          }
          const loaded = inGroupOrder(
            results.map((result) => ({
              value: result.value,
              label: result.label,
              icon: result.icon,
              disabled: result.disabled ?? false,
              group: result.group,
            })),
          );
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
  }, [isAsync, query, debounceMs]);

  // `children` goes unread in async mode, so a mistaken non-Option child there never throws — the
  // same as any other prop the current mode doesn't consult.
  const options = isAsync ? [] : readOptions(children);
  // The listbox holds the matches alone, so every index below — the highlight's, the disabled
  // ones, the slots in `listRef` — is an index into this list rather than into the full option
  // set. With no search row every option matches, and the two lists are the same list. Async
  // results are shown as the API returned them: re-filtering them by the query would hide a
  // result whose label doesn't literally contain what the API matched more loosely.
  const matches = isAsync ? asyncOptions : searchable ? options.filter((option) => matchesQuery(option.label, query)) : options;
  /** Where each match stands in the listbox, by value — built once here so neither an option's
   * visibility test nor its `listRef` slot costs a scan of the whole match list. */
  const optionIndices = new Map(matches.map((option, index) => [option.value, index]));
  // Read off the matches, so a group the query leaves no option in draws neither a heading nor a
  // separator.
  const visibleGroups = groupsOf(matches);
  // Resolved against every option, not the matches: a selection filtered out of the listbox still
  // shows its label in the trigger and in its chip.
  const selectedEntries = resolveSelection(selection, options);
  const disabledIndices = matches.flatMap((option, index) => (option.disabled ? [index] : []));
  const highlighted = highlightedIndex === null ? undefined : matches[highlightedIndex];

  // A query that matches fewer options, or a consumer that conditionally renders fewer
  // `Dropdown.Option` children (a supported pattern — falsy children are skipped, not errors),
  // shrinks the match list between renders. Without this, a slot at the end left behind by a
  // longer render points `aria-activedescendant` and keyboard navigation at an option that is not
  // rendered.
  listRef.current.length = matches.length;

  // One row unless the consumer asks for more. `wrapChips` is not a second layout the measurement
  // feeds: it switches the measurement off, so a wrapping field installs no observer and hides
  // nothing.
  const collapseChips = multiple && !wrapChips;
  const visibleChipCount = selectedEntries.length - hiddenChipCount;
  // The labels, not just how many there are: an async selection whose label resolves later is the
  // same count of chips at a different width, and the row it fits on is a different row.
  const chipLabels = JSON.stringify(selectedEntries.map((selected) => selected.label));
  /** The selections the row has no width for, in the order they would have stood on it. */
  const hiddenLabels = selectedEntries.slice(visibleChipCount).map((selected) => selected.label);

  /** Whether the field offers the clear button. An empty selection has nothing to clear, so the
   * button goes rather than sitting there inert. */
  const showClear = clearable && selectedEntries.length > 0;

  /** Whether the trigger is described by the selection. A chip row names what it holds in the
   * accessibility tree, and the trigger beside it reports a count — so a screen reader reaches
   * every selection through this description, including the ones no chip on the row carries. */
  const describesSelection = multiple && selectedEntries.length > 0;
  // Merged, never replaced: `FormField` forwards a hint's id and an error's id through this same
  // attribute, and a description of the selection written over them costs the field its guidance
  // and its validation message.
  const describedBy = [ariaDescribedBy, describesSelection ? selectionDescriptionId : null].filter(Boolean).join(" ");

  /**
   * Collapses the chip row to the chips that fit, before the browser's next paint.
   *
   * `useLayoutEffect` rather than `useEffect`: React flushes a state update made from a layout
   * effect before it yields to paint, so the first frame the user sees is the collapsed row
   * rather than the full one collapsing.
   *
   * `chipLabels` is in the dependencies as what has to be re-measured against, not as a value the
   * body reads: the labels are in the DOM the measurement reads, and a selection whose labels
   * change without its length changing is a different row of chips at the same count.
   */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `chipLabels` is a re-measure trigger, explained above
  useLayoutEffect(() => {
    if (!collapseChips) {
      // A row that stops collapsing shows every chip again, whatever the last measurement of it
      // concluded.
      setHiddenChipCount(0);
      return;
    }
    const row = chipsRef.current;
    if (row === null) {
      return;
    }
    function measure() {
      setHiddenChipCount(measureHiddenChips(row as HTMLElement));
    }
    measure();
    // The field, not the row: the row's own width answers the collapse this callback causes, so
    // observing it would feed every collapse back in as a resize of its own. The field's width
    // answers what contains it and nothing else.
    const observer = new ResizeObserver(() => {
      // An observer callback runs after layout and before paint, but a React update scheduled
      // from one lands in a later task — after the paint it was meant to precede. Flushing it
      // here puts the resized field and its recollapsed row in the same frame.
      flushSync(measure);
    });
    observer.observe(row.parentElement as HTMLElement);
    return () => {
      observer.disconnect();
    };
  }, [collapseChips, chipLabels]);

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
    if (isAsync) {
      // The debounced search resolves the new highlight once `loadOptions` returns for this
      // query — the options on screen are the previous query's, about to be replaced, so there is
      // nothing correct to highlight in the meantime.
      setHighlightedIndex(null);
      return;
    }
    setHighlightedIndex(firstEnabledIndex(options.filter((option) => matchesQuery(option.label, next))));
  }

  function commit(next: DropdownValue[], reported: DropdownValue[] | DropdownValue | null) {
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
        // instead of acting on whichever option the full list happens to start with. In async
        // mode the loaded results are that list — they stay on screen until the debounced search
        // for the cleared query resolves and replaces them.
        setQuery("");
        setHighlightedIndex((isAsync ? asyncOptions : options).findIndex((candidate) => candidate.value === option.value));
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

  /** Empties the selection, as each mode expresses emptiness: `null` for a single selection and an
   * empty array for a `multiple` one. Focus goes to the trigger: the button shows only while
   * something is selected, so it leaves the field along with the selection it just emptied, and
   * focus left on it falls to `<body>` with nothing answering the keyboard. */
  function clear() {
    commit([], multiple ? [] : null);
    // The button only exists inside a field that has a trigger, so the reference is always there
    // to take focus back.
    (refs.domReference.current as HTMLElement).focus();
  }

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
   * `Backspace` is `multiple`'s alone: it peels the last chip off a row of them, and a single
   * selection has no last selection distinct from its only one. Emptying that one is `clearable`'s
   * button, where dropping the whole selection is what the control says it does. */
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
    optionIndices,
    visibleGroups,
    selectedValues,
    highlightedValue: highlighted === undefined ? null : highlighted.value,
    select,
    registerOption(index, node) {
      // A detaching ref reports `null` for an option a shorter render has already dropped, whose
      // index now belongs to another option or is past the length trim above — writing it back
      // would undo that trim.
      if (node !== null) {
        listRef.current[index] = node;
      }
    },
    getItemProps,
  };

  /** What the trigger shows: the selected option in single-select, and the placeholder in either
   * mode while nothing is selected.
   *
   * A `multiple` selection shows in the trigger as nothing at all — the trigger is the click
   * target and holds the chevron, and the chips beside it carry the whole selection. Naming each
   * one, the chip row already says everything a count could, and the overflow indicator counts
   * the chips it has no room for; a count in the trigger takes width off that same row, so it
   * pushes more chips into the overflow it describes. A screen reader hears more than a count
   * either way: the trigger's description names every selection, hidden chips included. */
  function renderTriggerContent(): ReactNode {
    const placeholderContent = <span className="vpg-dropdown-placeholder">{placeholder}</span>;

    if (multiple) {
      return selectedEntries.length === 0 ? placeholderContent : null;
    }

    const selected = selectedEntries[0];
    if (selected === undefined) {
      return placeholderContent;
    }
    const SelectedIcon = selected.icon;
    return (
      <>
        {SelectedIcon ? <SelectedIcon className="vpg-dropdown-trigger-icon" aria-hidden="true" /> : null}
        <span className="vpg-dropdown-value">{selected.label}</span>
      </>
    );
  }

  /**
   * The indicator standing for the chips the row has no width for: it counts them, and names them
   * in a tooltip on hover. It is a `<span>` and takes no tab stop — the selections behind it are
   * unpicked in the listbox, since the chips carrying them are not on screen to remove them from,
   * so a stop here would be a stop with nothing to do.
   *
   * `Tooltip` wraps its child in a span of its own, which becomes the row's flex item — so it goes
   * on only while there are labels for it to name. With nothing hidden the indicator is the row's
   * own direct child, which is what `data-hidden` has to be on to take it off the row.
   */
  function renderOverflowIndicator(): ReactNode {
    const indicator = (
      <span className="vpg-listbox-overflow-chip" data-hidden={hiddenChipCount === 0 ? "" : undefined}>
        and {hiddenChipCount} more
      </span>
    );
    if (hiddenChipCount === 0) {
      return indicator;
    }
    return <Tooltip content={hiddenLabels.join(", ")}>{indicator}</Tooltip>;
  }

  /**
   * The control emptying the whole selection at once. A real `<button>`, so it is a tab stop and
   * carries its name into the accessibility tree; `onFieldMouseDown` skips a press that lands on
   * a button, so pressing this one does not also open the listbox the way a press anywhere else
   * in the field does.
   */
  function renderClearButton(): ReactNode {
    return (
      <button type="button" className="vpg-dropdown-clear" aria-label="Clear selection" onClick={clear}>
        <X className="vpg-dropdown-clear-icon" aria-hidden="true" />
      </button>
    );
  }

  /** One loaded result as the `Dropdown.Option` element a consumer would have declared for it. */
  function renderAsyncOption(option: OptionDescriptor): ReactNode {
    return <DropdownOption key={option.value} value={option.value} label={option.label} icon={option.icon} disabled={option.disabled} />;
  }

  /** The loaded results as the `Dropdown.Option` elements a consumer would have declared for
   * them, or the message standing in for them: a search in flight, a search that rejected, or one
   * the API matched nothing for. */
  function renderAsyncRows(): ReactNode {
    if (asyncStatus === "loading") {
      return <div className="vpg-listbox-empty">{loadingMessage}</div>;
    }
    if (asyncStatus === "error") {
      return <div className="vpg-listbox-empty">{errorMessage}</div>;
    }
    if (matches.length === 0) {
      return <div className="vpg-listbox-empty">No results</div>;
    }
    // The matches are already in the order they render — everything ungrouped, then the groups —
    // so each run below is a contiguous slice of the flat list the indices travel.
    return (
      <>
        {matches.filter((option) => option.group === undefined).map(renderAsyncOption)}
        {visibleGroups.map((group) => (
          <DropdownGroup key={group} label={group}>
            {matches.filter((option) => option.group === group).map(renderAsyncOption)}
          </DropdownGroup>
        ))}
      </>
    );
  }

  /** The options, or — for a query that matches none of them — the message standing in for them.
   * A listbox left blank reads as a control that has stopped answering. */
  const optionRows = isAsync ? (
    renderAsyncRows()
  ) : searchable && matches.length === 0 ? (
    <div className="vpg-listbox-empty">No results</div>
  ) : (
    children
  );

  /** The search row and the listbox are siblings inside the floating element, so no key travelling
   * from the input reaches the listbox by bubbling: the arrow keys arrive through
   * `getSearchProps()` alone. `getFloatingProps()` goes on the listbox rather than on the panel
   * around it — it carries the id every `aria-controls` points at, and on the panel that id would
   * name a box holding the search input too. */
  function renderSearchPanel(): ReactNode {
    return (
      <div ref={refs.setFloating} className="vpg-listbox-panel" style={floatingStyles}>
        {/* Non-modal: the trigger and the page behind the panel stay reachable, and the manager's
          one job here is to put real focus in the search input and hand it back to the trigger as
          the panel unmounts. */}
        <FloatingFocusManager context={floatingContext} modal={false} initialFocus={searchRef}>
          {/* The one element the focus manager holds. */}
          <div>
            <div className="vpg-listbox-search">
              <Search className="vpg-listbox-search-icon" aria-hidden="true" />
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
                className="vpg-listbox-search-input"
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
              className="vpg-listbox-options"
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
        className="vpg-listbox"
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
      <style href="vpg-dropdown" precedence="vpg-dropdown">
        {dropdownStylesheet}
      </style>
      <style href="vpg-listbox" precedence="vpg-listbox">
        {listboxStylesheet}
      </style>
      <div className={["vpg-dropdown", className].filter(Boolean).join(" ")}>
        {/* The chips sit beside the trigger, never inside it: floating-ui merges its own click
            and keyboard handlers into the trigger's, so a nested remove button's click could not
            be reliably intercepted before those ran. As siblings, each remove button is an
            ordinary interactive element needing no guard at all.

            The trigger is a direct child of the shell. The shell reads focus and invalidity off
            its direct children only, so a wrapper around the trigger would silently cost the
            field its focus ring and danger border. The trigger carries `vpg-field-shell-control`,
            which is what the shell grows to fill its free space; the chip row carries no such
            marker, so it stays sized to its chips.

            A press on the field's padding or a gap in the chip row lands on the field rather than
            the trigger. The field's handler keeps focus on the trigger and opens the listbox, as a
            click on the trigger would; left to the browser, focus moves to `<body>` and an open
            listbox stops answering the arrow keys. */}
        <FieldShell
          ref={fieldRef}
          className="vpg-dropdown-control"
          onMouseDown={onFieldMouseDown}
          // In the shell's trailing slot rather than beside the trigger: the shell reads focus,
          // invalidity and openness off its direct children, and a button among them would give
          // the whole field a focus ring of its own the moment the button took focus. A slot is a
          // subtree those `> ` rules do not reach into, which is why the button draws its own.
          trailing={showClear ? renderClearButton() : undefined}
        >
          {multiple && selectedEntries.length > 0 ? (
            <span ref={chipsRef} className="vpg-listbox-chips" data-collapsing={collapseChips ? "" : undefined}>
              {selectedEntries.map((selected, index) => (
                <span key={selected.value} className="vpg-listbox-chip" data-hidden={index >= visibleChipCount ? "" : undefined}>
                  <span className="vpg-listbox-chip-label">{selected.label}</span>
                  <button
                    type="button"
                    className="vpg-listbox-chip-remove"
                    aria-label={`Remove ${selected.label}`}
                    onClick={() => {
                      remove(selected.value);
                    }}
                  >
                    <X className="vpg-listbox-chip-remove-icon" aria-hidden="true" />
                  </button>
                </span>
              ))}
              {/* On the row for the whole of a collapsing field's life, whether or not it shows
                  anything: the width it would take is what the measurement reserves before it
                  counts a chip onto the row, and an indicator absent from the DOM has no width to
                  read. */}
              {collapseChips ? renderOverflowIndicator() : null}
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
            className={["vpg-dropdown-trigger", "vpg-field-shell-control"].join(" ")}
            tabIndex={0}
            id={id}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={describedBy === "" ? undefined : describedBy}
            aria-invalid={ariaInvalid}
            {...getReferenceProps({ onKeyDown: handleTriggerKeyDown })}
          >
            {renderTriggerContent()}
            {/* Inside the trigger rather than in the shell's trailing slot, so a click on the
                chevron is a click on the combobox and opens it. */}
            <ChevronDown size={16} className="vpg-dropdown-chevron" aria-hidden="true" />
          </div>
        </FieldShell>
        {/* Outside the shell, which reads focus and invalidity off its direct children: a third
            one here would be a child with no state to report. */}
        {describesSelection ? (
          <span id={selectionDescriptionId} className="vpg-dropdown-selection-description">
            Selected: {selectedEntries.map((selected) => selected.label).join(", ")}
          </span>
        ) : null}
      </div>
      {listbox !== null && themeRoot !== null ? createPortal(listbox, themeRoot) : listbox}
    </DropdownContext.Provider>
  );
}

type DropdownComponent = typeof DropdownImpl & {
  Option: typeof DropdownOption;
  Group: typeof DropdownGroup;
};

/**
 * A select-only combobox: a trigger showing the current selection, and a floating listbox of
 * `Dropdown.Option` children.
 *
 * A `Dropdown.Group label` heads a run of those options, and an async result carries its heading
 * as a `group` string instead. A group is drawn over the same flat list of options — its heading
 * takes no index, so the arrow keys, `Home`/`End` and the wrap at either end reach exactly the
 * options they reach with no group declared. Each group is a `role="group"` named by its heading,
 * with a separator drawn between one group and the next; a group the query leaves no option in
 * renders nothing at all.
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
 * `clearable` adds a "Clear selection" button to the field's trailing slot while anything is
 * selected, reporting `null` in single mode and `[]` in `multiple`. Pressing it empties the
 * selection without opening the listbox and leaves focus on the trigger.
 *
 * Those chips keep to one row. Which of them fit is measured against the width the field has, and
 * re-measured before paint whenever that width changes; the rest give way to an indicator reading
 * "and N more" that names them in a tooltip on hover, and a single chip wider than the field shows
 * alone with its label ellipsised. The indicator takes no tab stop: a selection it stands for is
 * removed by unchecking it in the listbox. The trigger is described by the whole selection,
 * merged with whatever `aria-describedby` it is given rather than written over it. `wrapChips`
 * switches the measurement off and wraps the chips onto further rows instead, growing the field
 * downwards.
 *
 * Passing `loadOptions` switches to async mode: `children` goes unread, and `Dropdown` calls
 * `loadOptions(query)` itself (debounced by `debounceMs`, default 300ms) and renders whatever it
 * resolves to, showing `loadingMessage` while pending and `errorMessage` on a rejection. Results
 * are rendered as returned — filtering the query is the API's job in this mode, not `Dropdown`'s.
 * A response the query has moved past is discarded rather than applied — a slow earlier search
 * resolving after a faster later one, and equally one resolving while the next query is still
 * settling. The search is keyed off the query alone, so `loadOptions` may be an inline arrow with
 * a fresh identity on every render. A selection carries its own label, so the trigger and a chip
 * render it with nothing fetched and no option child to match against.
 *
 * The listbox portals into the nearest ancestor `.vpg-root` — the subtree `ThemeProvider`
 * establishes — rather than `document.body`, so it keeps every `--vpg-*` value. With no
 * `.vpg-root` ancestor it renders inline beside the trigger instead, positioned identically
 * but inheriting whatever theme surrounds it.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `Dropdown` export (importing only `Button`, say) is tree-shaken out entirely instead
// of keeping the whole module "just in case" `Object.assign` does something observable.
export const Dropdown = /* @__PURE__ */ Object.assign(DropdownImpl, {
  Option: DropdownOption,
  Group: DropdownGroup,
}) as DropdownComponent;
