import type { FlatRow } from "./flatten.js";

/** What focus recovery knows of the row that last held the focus position. */
export interface FocusAnchor {
  /** Its ancestors' ids, nearest first. */
  ancestors: string[];
  index: number;
}

export function anchorOf<T>(row: FlatRow<T>, byId: ReadonlyMap<string, FlatRow<T>>): FocusAnchor {
  const ancestors: string[] = [];
  for (let parent = byId.get(row.parentId as string); parent !== undefined; parent = byId.get(parent.parentId as string)) {
    ancestors.push(parent.id);
  }
  return { ancestors, index: row.index };
}

/** The first enabled row from `start` stepping by `step`, or `undefined` past either end. */
export function enabledFrom<T>(rows: readonly FlatRow<T>[], start: number, step: 1 | -1): FlatRow<T> | undefined {
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

/**
 * The row with `tabIndex={0}`: the row the user last moved the focus position to, else, once
 * that row has left the model or become disabled, its replacement, else the selected row, else
 * the first enabled row. `undefined` only when no row is enabled.
 */
export function tabbableRow<T>(
  rows: readonly FlatRow<T>[],
  byId: ReadonlyMap<string, FlatRow<T>>,
  focusId: string | undefined,
  selectedId: string | null,
  anchor: FocusAnchor | undefined,
): FlatRow<T> | undefined {
  const focusRow = byId.get(focusId as string);
  if (focusRow !== undefined && !focusRow.disabled) return focusRow;
  // `focusId` is only ever set to a row that was committed, and every commit that renders a
  // tabbable row records its anchor, so the anchor exists whenever `focusId` does.
  if (focusId !== undefined) return recover(rows, byId, anchor as FocusAnchor);
  const selectedRow = byId.get(selectedId as string);
  if (selectedRow !== undefined && !selectedRow.disabled) return selectedRow;
  return enabledFrom(rows, 0, 1);
}

/**
 * The next enabled row, wrapping, from `from` whose label starts with `buffer`, which is
 * lower-case. A one-character buffer looks past the row at `from`, so typing that character
 * again cycles through the rows it starts; a longer prefix may still match it.
 */
export function findTypeAheadMatch<T>(rows: readonly FlatRow<T>[], from: number, buffer: string): FlatRow<T> | undefined {
  const offset = buffer.length === 1 ? 1 : 0;
  for (let step = 0; step < rows.length; step += 1) {
    const candidate = rows[(from + offset + step) % rows.length] as FlatRow<T>;
    if (!candidate.disabled && candidate.label.toLowerCase().startsWith(buffer)) return candidate;
  }
  return undefined;
}
