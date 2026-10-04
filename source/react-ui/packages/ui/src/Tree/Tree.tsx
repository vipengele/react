import { defaultRangeExtractor, type Range, useVirtualizer } from "@tanstack/react-virtual";
import {
  type CSSProperties,
  Fragment,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { type FlatRow, flatten } from "./flatten.js";
import { handleTreeKey, type TreeKeyboardTarget } from "./keyboard.js";
import { findTypeAheadMatch } from "./navigation.js";
import { type RowStateContext, rowState } from "./rowState.js";
import { treeStylesheet } from "./Tree.stylesheet.js";
import { useControllableState } from "./useControllableState.js";
import { useTreeFocus } from "./useTreeFocus.js";
import { useTypeAhead } from "./useTypeAhead.js";

export type TreeSelectionMode = "none" | "single";

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
  const [expandedIds, setExpandedIds] = useControllableState<ReadonlySet<string>>(
    expanded,
    () => new Set(defaultExpanded),
    onExpandedChange,
  );
  const [selection, setSelection] = useControllableState<string | null, string>(
    selectedId,
    () => defaultSelectedId ?? null,
    onSelectedChange,
  );
  const single = selectionMode === "single";
  const selected = single ? selection : null;

  const rows = useMemo(
    () => flatten({ items, getId, getLabel, getChildren, getDisabled, expanded: expandedIds }),
    [items, getId, getLabel, getChildren, getDisabled, expandedIds],
  );
  const byId = useMemo(() => new Map(rows.map((row) => [row.id, row])), [rows]);

  const focus = useTreeFocus({ rows, byId, selectedId: selected, onFocusChange, onFocus, onBlur });
  const { tabbable, focusOn, moveFocusPosition } = focus;
  const typeAhead = useTypeAhead();

  function toggle(row: FlatRow<T>) {
    if (row.disabled || !row.hasChildren) return;
    const next = new Set(expandedIds);
    if (row.expanded) next.delete(row.id);
    else next.add(row.id);
    setExpandedIds(next);
  }

  function select(row: FlatRow<T>) {
    if (!single || row.disabled) return;
    setSelection(row.id);
  }

  function activate(row: FlatRow<T>) {
    if (row.disabled) return;
    select(row);
    onAction?.(row.id);
  }

  const keyboard: TreeKeyboardTarget<T> = {
    rows,
    byId,
    expanded: expandedIds,
    setExpanded: setExpandedIds,
    focusOn,
    toggle,
    activate,
    select,
    typeAhead: (row, char) => focusOn(findTypeAheadMatch(rows, row.index, typeAhead(char))),
  };

  const rowContext: RowStateContext<T> = {
    tabbableId: tabbable?.id,
    focusWithin: focus.focusWithin,
    single,
    selectedId: selected,
    elementsRef: focus.elementsRef,
    toggle,
    onKeyDown: (row, event) => handleTreeKey(row, event, keyboard),
    onClick: (row) => {
      moveFocusPosition(row.id);
      activate(row);
    },
    onFocus: (row) => moveFocusPosition(row.id),
  };

  function renderRow(row: FlatRow<T>, position?: CSSProperties) {
    return <Fragment key={row.id}>{renderItem(row.node, rowState(row, position, rowContext))}</Fragment>;
  }

  const containerProps: HTMLAttributes<HTMLDivElement> = {
    ...rest,
    role: "tree",
    className: ["vpg-tree", virtualized && "vpg-tree-virtualized", className].filter(Boolean).join(" "),
    onFocus: focus.handleFocus,
    onBlur: focus.handleBlur,
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
          scrollToIndexRef={focus.scrollToIndexRef}
          renderRow={renderRow}
        />
      ) : (
        <div {...containerProps}>{rows.map((row) => renderRow(row))}</div>
      )}
    </>
  );
}
