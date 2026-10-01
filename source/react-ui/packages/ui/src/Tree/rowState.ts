import type { CSSProperties, KeyboardEvent, RefObject } from "react";
import type { FlatRow } from "./flatten.js";
import type { TreeItemOwnProps, TreeItemProps, TreeItemState } from "./Tree.js";

/** What every row's state reads from the tree as of one render. */
export interface RowStateContext<T> {
  tabbableId: string | undefined;
  focusWithin: boolean;
  /** `false` when `selectionMode` is `"none"`, which leaves `aria-selected` off every row. */
  single: boolean;
  selectedId: string | null;
  /** Each mounted row's element, by id, which the row's `ref` keeps current. */
  elementsRef: RefObject<Map<string, HTMLElement>>;
  toggle: (row: FlatRow<T>) => void;
  onKeyDown: (row: FlatRow<T>, event: KeyboardEvent<HTMLElement>) => void;
  /** An enabled row was clicked. */
  onClick: (row: FlatRow<T>) => void;
  /** An enabled row took DOM focus. */
  onFocus: (row: FlatRow<T>) => void;
}

/**
 * The props a row's `treeitem` spreads. The tree's `role`, `aria-*`, `tabIndex`, `onKeyDown`,
 * `onClick` and `onFocus` win over the consumer's, `className` is joined, `style` is laid over
 * the tree's, and `ref` is merged with the tree's own.
 */
function itemProps<T>(
  row: FlatRow<T>,
  position: CSSProperties | undefined,
  context: RowStateContext<T>,
  { ref: ownRef, className: ownClassName, style: ownStyle, ...own }: TreeItemOwnProps,
): TreeItemProps {
  return {
    ...own,
    ref: (element: HTMLElement | null) => {
      if (element === null) context.elementsRef.current.delete(row.id);
      else context.elementsRef.current.set(row.id, element);
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
    "aria-selected": context.single ? row.id === context.selectedId : undefined,
    "aria-disabled": row.disabled || undefined,
    tabIndex: row.id === context.tabbableId ? 0 : -1,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => context.onKeyDown(row, event),
    onClick: () => {
      if (!row.disabled) context.onClick(row);
    },
    onFocus: () => {
      if (!row.disabled) context.onFocus(row);
    },
  };
}

/** What `renderItem` is told about `row`. `position` is a windowed row's placement, which `VirtualizedTree` supplies. */
export function rowState<T>(row: FlatRow<T>, position: CSSProperties | undefined, context: RowStateContext<T>): TreeItemState {
  return {
    id: row.id,
    level: row.level,
    hasChildren: row.hasChildren,
    expanded: row.expanded,
    selected: row.id === context.selectedId,
    focused: row.id === context.tabbableId && context.focusWithin,
    disabled: row.disabled,
    toggle: () => context.toggle(row),
    getItemProps: (props = {}) => itemProps(row, position, context, props),
  };
}
