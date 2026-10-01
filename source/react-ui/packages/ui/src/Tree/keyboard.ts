import type { KeyboardEvent } from "react";
import type { FlatRow } from "./flatten.js";
import { enabledFrom } from "./navigation.js";

/** What a key pressed on a row reads and acts on. */
export interface TreeKeyboardTarget<T> {
  rows: readonly FlatRow<T>[];
  byId: ReadonlyMap<string, FlatRow<T>>;
  expanded: ReadonlySet<string>;
  setExpanded: (next: ReadonlySet<string>) => void;
  /** Moves the focus position and DOM focus to a row; a no-op for `undefined`. */
  focusOn: (row: FlatRow<T> | undefined) => void;
  toggle: (row: FlatRow<T>) => void;
  activate: (row: FlatRow<T>) => void;
  select: (row: FlatRow<T>) => void;
  /** Feeds a printable character to type-ahead, searching from `row`. */
  typeAhead: (row: FlatRow<T>, char: string) => void;
}

/**
 * The inline-end arrow opens a closed node or moves to an open node's first child; the
 * inline-start arrow closes an open node or moves to the parent. Which physical arrow is
 * inline-end follows the row's computed `direction`.
 */
function handleHorizontalArrow<T>(row: FlatRow<T>, event: KeyboardEvent<HTMLElement>, tree: TreeKeyboardTarget<T>) {
  const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
  if (event.key === (rtl ? "ArrowLeft" : "ArrowRight")) {
    if (row.expanded) tree.focusOn(enabledFrom(tree.rows, row.index + 1, 1));
    else tree.toggle(row);
    return;
  }
  const parent = tree.byId.get(row.parentId as string);
  if (row.expanded) tree.toggle(row);
  else if (parent !== undefined && !parent.disabled) tree.focusOn(parent);
}

/** `*` opens every enabled sibling of `row` that has children. */
function expandSiblings<T>(row: FlatRow<T>, tree: TreeKeyboardTarget<T>) {
  const next = new Set(tree.expanded);
  for (const sibling of tree.rows) {
    if (sibling.parentId === row.parentId && sibling.hasChildren && !sibling.disabled) next.add(sibling.id);
  }
  tree.setExpanded(next);
}

/** A printable character typed without a modifier, which type-ahead takes. */
function isTypeAheadKey(event: KeyboardEvent<HTMLElement>): boolean {
  return event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey;
}

/**
 * Applies a key pressed on a row, working out "next", "previous" and "parent" from the
 * visible-row model rather than the DOM. A key the tree acts on has its default prevented,
 * including when the move it asks for goes nowhere; any other key is left alone.
 */
export function handleTreeKey<T>(row: FlatRow<T>, event: KeyboardEvent<HTMLElement>, tree: TreeKeyboardTarget<T>) {
  const { rows } = tree;
  switch (event.key) {
    case "ArrowDown":
      tree.focusOn(enabledFrom(rows, row.index + 1, 1));
      break;
    case "ArrowUp":
      tree.focusOn(enabledFrom(rows, row.index - 1, -1));
      break;
    case "Home":
      tree.focusOn(enabledFrom(rows, 0, 1));
      break;
    case "End":
      tree.focusOn(enabledFrom(rows, rows.length - 1, -1));
      break;
    case "ArrowLeft":
    case "ArrowRight":
      handleHorizontalArrow(row, event, tree);
      break;
    case "Enter":
      tree.activate(row);
      break;
    case " ":
      tree.select(row);
      break;
    case "*":
      expandSiblings(row, tree);
      break;
    default:
      if (!isTypeAheadKey(event)) return;
      tree.typeAhead(row, event.key);
  }
  event.preventDefault();
}
