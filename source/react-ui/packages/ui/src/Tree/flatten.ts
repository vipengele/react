/** What `flatten` reads a tree through: the nodes, how to read each one, and which are open. */
export interface FlattenOptions<T> {
  /** The root nodes, in display order. */
  items: readonly T[];
  /** A node's id. The expanded set, focus and selection all refer to a node by it. */
  getId: (node: T) => string;
  /** A node's text label, as type-ahead matches it. */
  getLabel: (node: T) => string;
  /** A node's children. `undefined` and an empty array both mean the node is a leaf. */
  getChildren: (node: T) => readonly T[] | undefined;
  /** Whether a node is disabled. Without it, no node is. */
  getDisabled?: (node: T) => boolean;
  /** The ids of the nodes that are open. An id no visible node carries is ignored. */
  expanded: ReadonlySet<string>;
}

/** One visible row of a tree, in the order the rows are displayed. */
export interface FlatRow<T> {
  node: T;
  id: string;
  label: string;
  /** Depth, 1 at the root, as `aria-level` reads it. */
  level: number;
  /** How many visible rows share this row's parent, as `aria-setsize` reads it. */
  setSize: number;
  /** This row's 1-based position among those siblings, as `aria-posinset` reads it. */
  posInSet: number;
  /** The parent row's id, `undefined` at the root. */
  parentId: string | undefined;
  /** Whether the node has at least one child, whether or not they are shown. */
  hasChildren: boolean;
  /** Whether the node's children are shown: its id is expanded and it has children. A leaf is never expanded. */
  expanded: boolean;
  disabled: boolean;
  /** This row's 0-based position in the returned list. */
  index: number;
}

interface Frame<T> {
  siblings: readonly T[];
  next: number;
  level: number;
  parentId: string | undefined;
  /** The rows emitted for `siblings` so far, whose `setSize` is filled in once the group ends. */
  group: FlatRow<T>[];
}

/**
 * Turns a tree into its visible rows, in pre-order: each node, then, if it is expanded, its
 * children's rows, then its next sibling.
 *
 * Ids are unique in the result. When an id recurs, the first occurrence in display order wins
 * and every later node carrying it is dropped together with its subtree, and the dropped node
 * does not count towards its siblings' `setSize` or `posInSet`. Two rows with one id would leave
 * focus, selection and expansion unable to tell them apart, and a node that is its own
 * descendant would otherwise expand without end.
 *
 * A disabled node is still a row, and still shows its children when expanded: disabling a node
 * stops interaction with it, not the structure beneath it.
 *
 * The walk is iterative and visits only visible rows, so neither the depth of the tree nor the
 * size of its collapsed subtrees bounds what it can flatten.
 */
export function flatten<T>({ items, getId, getLabel, getChildren, getDisabled, expanded }: FlattenOptions<T>): FlatRow<T>[] {
  const rows: FlatRow<T>[] = [];
  const seen = new Set<string>();
  const stack: Frame<T>[] = [{ siblings: items, next: 0, level: 1, parentId: undefined, group: [] }];

  for (let frame = stack.at(-1); frame !== undefined; frame = stack.at(-1)) {
    if (frame.next >= frame.siblings.length) {
      for (const row of frame.group) row.setSize = frame.group.length;
      stack.pop();
      continue;
    }

    const node = frame.siblings[frame.next] as T;
    frame.next += 1;
    const id = getId(node);
    if (seen.has(id)) continue;
    seen.add(id);

    const children = getChildren(node) ?? [];
    const hasChildren = children.length > 0;
    const row: FlatRow<T> = {
      node,
      id,
      label: getLabel(node),
      level: frame.level,
      setSize: 0,
      posInSet: frame.group.length + 1,
      parentId: frame.parentId,
      hasChildren,
      expanded: hasChildren && expanded.has(id),
      disabled: getDisabled?.(node) ?? false,
      index: rows.length,
    };
    rows.push(row);
    frame.group.push(row);

    if (row.expanded) {
      stack.push({ siblings: children, next: 0, level: frame.level + 1, parentId: id, group: [] });
    }
  }

  return rows;
}
