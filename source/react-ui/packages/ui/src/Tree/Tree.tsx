import { defaultRangeExtractor, type Range, useVirtualizer } from "@tanstack/react-virtual";
import {
  type CSSProperties,
  type FocusEvent,
  Fragment,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type FlatRow, flatten } from "./flatten.js";
import { treeStylesheet } from "./Tree.stylesheet.js";

export type TreeSelectionMode = "none" | "single";

/** How long a pause in typing ends a type-ahead search and starts the next one afresh. */
const TYPE_AHEAD_RESET_MS = 500;

/**
 * What the consumer may pass to `getItemProps` alongside the row's own props: anything a
 * `<div>` takes, a drag source's `draggable` and `onDrag*` handlers included, and a `ref`.
 */
export type TreeItemOwnProps = HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> };

/** The props `getItemProps` returns, to spread on the element a row renders as its `treeitem`. */
export type TreeItemProps = HTMLAttributes<HTMLElement> & { ref: (element: HTMLElement | null) => void };

/** What `renderItem` is told about the row it draws. */
export interface TreeItemState {
  id: string;
  /** Depth, 1 at the root. */
  level: number;
  /** Whether the node has children, shown or not. */
  hasChildren: boolean;
  /** Whether the node's children are shown. Always `false` for a leaf. */
  expanded: boolean;
  /** Always `false` when `selectionMode` is `"none"`. */
  selected: boolean;
  /**
   * Whether this row holds the tree's focus position — the row with `tabIndex={0}` — while DOM
   * focus is inside the tree.
   */
  focused: boolean;
  disabled: boolean;
  /**
   * Opens or closes the node, for the row's own expand affordance. Clicking the row itself
   * activates it rather than toggling it, so an affordance inside the row that calls this from
   * its click handler stops the event's propagation if the click should not also activate the
   * row. A no-op on a leaf or a disabled row.
   */
  toggle: () => void;
  /**
   * The props to spread on the element this row renders as its `treeitem`. Pass the element's
   * own props through it rather than beside it: the tree's `role`, `aria-*`, `tabIndex`,
   * `onKeyDown`, `onClick` and `onFocus` win over the same props passed here, `className` is
   * joined with the tree's, `style` is laid over the tree's, and `ref` is merged with the
   * tree's own, which focus moves through.
   */
  getItemProps: (props?: TreeItemOwnProps) => TreeItemProps;
}

interface TreeOwnProps<T> extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "role"> {
  /** The root nodes, in display order. */
  items: readonly T[];
  /** A node's id, unique across the tree. Expansion, focus and selection refer to nodes by it. */
  getId: (node: T) => string;
  /** A node's text, as type-ahead matches it. */
  getLabel: (node: T) => string;
  /** A node's children. `undefined` and an empty array both mean the node is a leaf. */
  getChildren: (node: T) => readonly T[] | undefined;
  /** Whether a node is disabled: skipped by keyboard navigation, and never expanded, selected or activated. */
  getDisabled?: (node: T) => boolean;
  /** Draws one row. The element it renders as the `treeitem` spreads `state.getItemProps()`. */
  renderItem: (node: T, state: TreeItemState) => ReactNode;
  /** A row was activated: clicked, or `Enter` pressed on it. */
  onAction?: (id: string) => void;
  /**
   * The tree's focus position moved to another row: by the arrow keys, `Home`/`End`,
   * type-ahead, a click, a row taking DOM focus, or focus recovery moving it off a row that
   * left the tree.
   */
  onFocusChange?: (id: string) => void;
  /** `"single"` lets one row at a time be selected, by a click, `Enter` or `Space`. Defaults to `"none"`. */
  selectionMode?: TreeSelectionMode;
  /** Makes the selection controlled; `null` selects nothing. Pair it with `onSelectedChange`. */
  selectedId?: string | null;
  /** The initially selected id when the selection is uncontrolled. */
  defaultSelectedId?: string;
  onSelectedChange?: (id: string) => void;
  /** Makes expansion controlled: the ids of the open nodes. Pair it with `onExpandedChange`. */
  expanded?: ReadonlySet<string>;
  /** The initially open ids when expansion is uncontrolled. */
  defaultExpanded?: Iterable<string>;
  onExpandedChange?: (expanded: ReadonlySet<string>) => void;
}

/**
 * Windowing (ADR 0025). Off, every visible row is mounted. On, only the rows in view, plus
 * overscan and the tabbable row, are mounted, and the tree element is the scroll container: it
 * needs a bounded height from `className` or `style`, or it grows to hold every row and mounts
 * them all. `rowHeight` is required with `virtualized` and ignored without it, so a `boolean`
 * `virtualized` may always pass one.
 */
type TreeWindowingProps =
  | {
      virtualized?: false;
      rowHeight?: number;
    }
  | {
      virtualized: true;
      /** Every row's height in CSS pixels, which the windowing arithmetic positions rows by. */
      rowHeight: number;
    };

export type TreeProps<T> = TreeOwnProps<T> & TreeWindowingProps;

/** What focus recovery knows of the row that last held the focus position. */
interface FocusAnchor {
  /** Its ancestors' ids, nearest first. */
  ancestors: string[];
  index: number;
}

function anchorOf<T>(row: FlatRow<T>, byId: ReadonlyMap<string, FlatRow<T>>): FocusAnchor {
  const ancestors: string[] = [];
  for (let parent = byId.get(row.parentId as string); parent !== undefined; parent = byId.get(parent.parentId as string)) {
    ancestors.push(parent.id);
  }
  return { ancestors, index: row.index };
}

/** The first enabled row from `start` stepping by `step`, or `undefined` past either end. */
function enabledFrom<T>(rows: readonly FlatRow<T>[], start: number, step: 1 | -1): FlatRow<T> | undefined {
  for (let index = start; index >= 0 && index < rows.length; index += step) {
    const row = rows[index] as FlatRow<T>;
    if (!row.disabled) return row;
  }
  return undefined;
}

/**
 * Where the focus position goes when its row has left the model or become disabled: the
 * nearest ancestor that is still an enabled row, else the nearest enabled row at or after the
 * position it held, else the nearest before it.
 */
function recover<T>(rows: readonly FlatRow<T>[], byId: ReadonlyMap<string, FlatRow<T>>, anchor: FocusAnchor): FlatRow<T> | undefined {
  for (const id of anchor.ancestors) {
    const row = byId.get(id);
    if (row !== undefined && !row.disabled) return row;
  }
  const start = Math.min(anchor.index, rows.length - 1);
  return enabledFrom(rows, start, 1) ?? enabledFrom(rows, start - 1, -1);
}

interface VirtualizedTreeProps<T> {
  /** The `role="tree"` element's props, which this renders as the scroll container. */
  containerProps: HTMLAttributes<HTMLDivElement>;
  rows: readonly FlatRow<T>[];
  rowHeight: number;
  /** The tabbable row's index, which stays mounted wherever the window is. */
  tabbableIndex: number | undefined;
  /** Filled with the virtualizer's scroll-to-row while this is mounted. */
  scrollToIndexRef: RefObject<((index: number) => void) | undefined>;
  renderRow: (row: FlatRow<T>, position: CSSProperties) => ReactNode;
}

/**
 * A virtualized `Tree`'s `role="tree"` element, which is the scroll container, holding a spacer
 * as tall as every row together with only the rows the virtualizer mounts, each placed at its
 * own offset.
 *
 * It renders the scroll container itself because React attaches a parent's ref after its
 * children's layout effects: a container rendered by `Tree` is still unattached when the
 * virtualizer looks for it on mount, and the first window never renders.
 *
 * The range always takes in the tabbable row. Without it, a selected or focused row scrolled
 * out of the window is unmounted, no row is left with `tabIndex={0}`, and `Tab` skips the tree.
 */
function VirtualizedTree<T>({ containerProps, rows, rowHeight, tabbableIndex, scrollToIndexRef, renderRow }: VirtualizedTreeProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range);
      if (tabbableIndex !== undefined && !indexes.includes(tabbableIndex)) {
        indexes.push(tabbableIndex);
        indexes.sort((a, b) => a - b);
      }
      return indexes;
    },
    [tabbableIndex],
  );
  // Rows are a fixed height, so the estimate is exact and nothing is measured.
  const estimateSize = useCallback(() => rowHeight, [rowHeight]);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize,
    rangeExtractor,
  });

  useLayoutEffect(() => {
    scrollToIndexRef.current = (index) => virtualizer.scrollToIndex(index);
    return () => {
      scrollToIndexRef.current = undefined;
    };
  }, [virtualizer, scrollToIndexRef]);

  return (
    <div {...containerProps} ref={scrollElementRef}>
      <div className="vpg-tree-spacer" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((item) =>
          renderRow(rows[item.index] as FlatRow<T>, {
            position: "absolute",
            top: 0,
            insetInlineStart: 0,
            width: "100%",
            height: rowHeight,
            transform: `translateY(${item.start}px)`,
          }),
        )}
      </div>
    </div>
  );
}

/**
 * A hierarchical list of rows, drawn by `renderItem` from `items` read through `getId`,
 * `getLabel` and `getChildren` (ADR 0024).
 *
 * Rows are flat siblings under one `role="tree"` element, each carrying its level, set size
 * and position, with no `role="group"` around a node's children. Exactly one row is tabbable:
 * the row the user last focused, else the selected row, else the first enabled row. Arrow
 * keys, `Home`, `End`, `*` and type-ahead move DOM focus between rows, working out "next",
 * "previous" and "parent" from the visible-row model rather than the DOM.
 *
 * With `virtualized`, the tree element and its rows are rendered by `VirtualizedTree`, a
 * separate component so that a tree without it never calls the virtualizer's hook: hooks
 * cannot be called conditionally, but a component can be rendered conditionally.
 */
export function Tree<T>({
  items,
  getId,
  getLabel,
  getChildren,
  getDisabled,
  renderItem,
  onAction,
  onFocusChange,
  selectionMode = "none",
  selectedId,
  defaultSelectedId,
  onSelectedChange,
  expanded,
  defaultExpanded,
  onExpandedChange,
  virtualized,
  rowHeight,
  className,
  onFocus,
  onBlur,
  ...rest
}: TreeProps<T>) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState<ReadonlySet<string>>(() => new Set(defaultExpanded));
  const expandedIds = expanded ?? uncontrolledExpanded;

  const [uncontrolledSelected, setUncontrolledSelected] = useState(defaultSelectedId ?? null);
  const single = selectionMode === "single";
  const selected = single ? (selectedId !== undefined ? selectedId : uncontrolledSelected) : null;

  const rows = useMemo(
    () => flatten({ items, getId, getLabel, getChildren, getDisabled, expanded: expandedIds }),
    [items, getId, getLabel, getChildren, getDisabled, expandedIds],
  );
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  /** The row the user last moved the focus position to; `undefined` until they do. */
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [focusWithin, setFocusWithin] = useState(false);
  const anchorRef = useRef<FocusAnchor | undefined>(undefined);
  /** The tabbable row's id as of the last commit, which `onFocusChange` reports changes from. */
  const tabbableRef = useRef<string | undefined>(undefined);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const typeAheadRef = useRef({ buffer: "", timer: undefined as ReturnType<typeof setTimeout> | undefined });
  const scrollToIndexRef = useRef<((index: number) => void) | undefined>(undefined);
  /** A row DOM focus is headed for that was not mounted when the move was asked for. */
  const pendingFocusRef = useRef<string | undefined>(undefined);

  const focusRow = byId.get(focusId as string);
  const selectedRow = byId.get(selected as string);
  let tabbable: FlatRow<T> | undefined;
  if (focusRow !== undefined && !focusRow.disabled) {
    tabbable = focusRow;
  } else if (focusId !== undefined) {
    // `focusId` is only ever set to a row that was committed, and every commit that renders a
    // tabbable row records its anchor, so the anchor exists whenever `focusId` does.
    tabbable = recover(rows, byId, anchorRef.current as FocusAnchor);
  } else if (selectedRow !== undefined && !selectedRow.disabled) {
    tabbable = selectedRow;
  } else {
    tabbable = enabledFrom(rows, 0, 1);
  }
  const tabbableId = tabbable?.id;

  useEffect(() => () => clearTimeout(typeAheadRef.current.timer), []);

  // A row `focusElement` could not reach is the tabbable row by this commit, which the
  // virtualizer's range always mounts, so this is the commit that can focus it. It is attempted
  // once: a row whose `renderItem` never took the ref is never focused.
  useLayoutEffect(() => {
    const id = pendingFocusRef.current;
    if (id === undefined) return;
    pendingFocusRef.current = undefined;
    elementsRef.current.get(id)?.focus();
  });

  function moveFocusPosition(id: string) {
    setFocusId(id);
    if (id !== tabbableRef.current) {
      tabbableRef.current = id;
      onFocusChange?.(id);
    }
  }

  useLayoutEffect(() => {
    if (tabbable !== undefined) anchorRef.current = anchorOf(tabbable, byId);
    if (focusId === undefined || focusId === tabbableId) {
      tabbableRef.current = tabbableId;
      return;
    }
    // The focus position's row left the model or became disabled. DOM focus follows it to its
    // replacement only if it was inside the tree, so a background data update never takes
    // focus from elsewhere on the page.
    if (tabbableId === undefined) {
      setFocusId(undefined);
      setFocusWithin(false);
      tabbableRef.current = undefined;
      return;
    }
    moveFocusPosition(tabbableId);
    if (focusWithin) focusElement(tabbable as FlatRow<T>);
  });

  function setExpandedIds(next: ReadonlySet<string>) {
    if (expanded === undefined) setUncontrolledExpanded(next);
    onExpandedChange?.(next);
  }

  function toggle(row: FlatRow<T>) {
    if (row.disabled || !row.hasChildren) return;
    const next = new Set(expandedIds);
    if (row.expanded) next.delete(row.id);
    else next.add(row.id);
    setExpandedIds(next);
  }

  function select(row: FlatRow<T>) {
    if (!single || row.disabled) return;
    if (selectedId === undefined) setUncontrolledSelected(row.id);
    onSelectedChange?.(row.id);
  }

  function activate(row: FlatRow<T>) {
    if (row.disabled) return;
    select(row);
    onAction?.(row.id);
  }

  /**
   * Moves DOM focus to a row, scrolling it into the window first when the tree is virtualized.
   * A windowed row may not be mounted yet; the pending-focus layout effect focuses it on the
   * next commit instead.
   */
  function focusElement(row: FlatRow<T>) {
    scrollToIndexRef.current?.(row.index);
    const element = elementsRef.current.get(row.id);
    if (element !== undefined) element.focus();
    else pendingFocusRef.current = row.id;
  }

  function focusOn(row: FlatRow<T> | undefined) {
    if (row === undefined) return;
    moveFocusPosition(row.id);
    focusElement(row);
  }

  /** The next enabled row, wrapping, whose label starts with what has been typed in the last pause. */
  function typeAhead(row: FlatRow<T>, char: string) {
    const state = typeAheadRef.current;
    clearTimeout(state.timer);
    state.buffer += char.toLowerCase();
    state.timer = setTimeout(() => {
      state.buffer = "";
    }, TYPE_AHEAD_RESET_MS);
    // A first character looks past the current row, so typing it again cycles through the rows
    // it starts; a longer prefix may still match the current row.
    const offset = state.buffer.length === 1 ? 1 : 0;
    for (let step = 0; step < rows.length; step += 1) {
      const candidate = rows[(row.index + offset + step) % rows.length] as FlatRow<T>;
      if (!candidate.disabled && candidate.label.toLowerCase().startsWith(state.buffer)) {
        focusOn(candidate);
        return;
      }
    }
  }

  function handleKeyDown(row: FlatRow<T>, event: KeyboardEvent<HTMLElement>) {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const inward = rtl ? "ArrowLeft" : "ArrowRight";
    const outward = rtl ? "ArrowRight" : "ArrowLeft";

    switch (event.key) {
      case "ArrowDown":
        focusOn(enabledFrom(rows, row.index + 1, 1));
        break;
      case "ArrowUp":
        focusOn(enabledFrom(rows, row.index - 1, -1));
        break;
      case "Home":
        focusOn(enabledFrom(rows, 0, 1));
        break;
      case "End":
        focusOn(enabledFrom(rows, rows.length - 1, -1));
        break;
      case inward:
        if (row.expanded) focusOn(enabledFrom(rows, row.index + 1, 1));
        else toggle(row);
        break;
      case outward: {
        const parent = byId.get(row.parentId as string);
        if (row.expanded) toggle(row);
        else if (parent !== undefined && !parent.disabled) focusOn(parent);
        break;
      }
      case "Enter":
        activate(row);
        break;
      case " ":
        select(row);
        break;
      case "*": {
        const next = new Set(expandedIds);
        for (const sibling of rows) {
          if (sibling.parentId === row.parentId && sibling.hasChildren && !sibling.disabled) next.add(sibling.id);
        }
        setExpandedIds(next);
        break;
      }
      default:
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        typeAhead(row, event.key);
    }
    event.preventDefault();
  }

  /** `position` is a windowed row's placement, which `VirtualizedTree` supplies. */
  function stateOf(row: FlatRow<T>, position?: CSSProperties): TreeItemState {
    const isTabbable = row.id === tabbableId;
    return {
      id: row.id,
      level: row.level,
      hasChildren: row.hasChildren,
      expanded: row.expanded,
      selected: row.id === selected,
      focused: isTabbable && focusWithin,
      disabled: row.disabled,
      toggle: () => toggle(row),
      getItemProps: ({ ref: ownRef, className: ownClassName, style: ownStyle, ...own } = {}) => ({
        ...own,
        ref: (element: HTMLElement | null) => {
          if (element === null) elementsRef.current.delete(row.id);
          else elementsRef.current.set(row.id, element);
          if (typeof ownRef === "function") ownRef(element);
          else if (ownRef) ownRef.current = element;
        },
        className: ["vpg-tree-item", ownClassName].filter(Boolean).join(" "),
        // Indentation is a plain property reading the spacing scale, so a theme that respaces
        // the scale re-indents the tree with it. A windowed row's placement lies under it, and
        // the consumer's `style` over both: a consumer style that moves or resizes a windowed
        // row takes it off the offset the virtualizer computed for it.
        style: {
          ...position,
          paddingInlineStart: `calc(var(--vpg-space-2) + ${row.level - 1} * var(--vpg-space-5))`,
          ...ownStyle,
        } as CSSProperties,
        role: "treeitem",
        "aria-level": row.level,
        "aria-setsize": row.setSize,
        "aria-posinset": row.posInSet,
        // Only a node with children is expandable; on a leaf the attribute would announce a
        // collapsed node with nothing to open.
        "aria-expanded": row.hasChildren ? row.expanded : undefined,
        "aria-selected": single ? row.id === selected : undefined,
        "aria-disabled": row.disabled || undefined,
        tabIndex: isTabbable ? 0 : -1,
        onKeyDown: (event: KeyboardEvent<HTMLElement>) => handleKeyDown(row, event),
        onClick: () => {
          if (row.disabled) return;
          moveFocusPosition(row.id);
          activate(row);
        },
        onFocus: () => {
          if (!row.disabled) moveFocusPosition(row.id);
        },
      }),
    };
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    onFocus?.(event);
    setFocusWithin(true);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    onBlur?.(event);
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  }

  function renderRow(row: FlatRow<T>, position?: CSSProperties) {
    return <Fragment key={row.id}>{renderItem(row.node, stateOf(row, position))}</Fragment>;
  }

  const containerProps: HTMLAttributes<HTMLDivElement> = {
    ...rest,
    role: "tree",
    className: ["vpg-tree", virtualized && "vpg-tree-virtualized", className].filter(Boolean).join(" "),
    onFocus: handleFocus,
    onBlur: handleBlur,
  };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N trees on a page inject one
        stylesheet.
      */}
      <style href="vpg-tree" precedence="vpg-tree">
        {treeStylesheet}
      </style>
      {virtualized ? (
        <VirtualizedTree
          containerProps={containerProps}
          rows={rows}
          rowHeight={rowHeight}
          tabbableIndex={tabbable?.index}
          scrollToIndexRef={scrollToIndexRef}
          renderRow={renderRow}
        />
      ) : (
        <div {...containerProps}>{rows.map((row) => renderRow(row))}</div>
      )}
    </>
  );
}
