import { type KeyboardEvent, type MouseEvent, useMemo, useRef } from "react";
import { useControllableState } from "../internal/useControllableState.js";
import type { DataTableSortDirection, DataTableSortState } from "./types.js";

export interface SortedColumn {
  direction: DataTableSortDirection;
  /** The column's 1-based place in the sort. */
  priority: number;
}

/** One entry of the sort as the engine takes it. */
interface EngineSortEntry {
  id: string;
  desc: boolean;
}

/**
 * The sort as drawn: each sortable column's first entry, in priority order. Entries for an
 * unknown or unsortable column, and repeated entries for a column, are dropped, so the priority
 * numbers have no gaps.
 */
function effectiveSort(sort: DataTableSortState, columns: readonly { id: string; sortable: boolean }[]) {
  const sortable = new Set(columns.filter((column) => column.sortable).map((column) => column.id));
  const byColumn = new Map<string, SortedColumn>();
  const engineSorting: EngineSortEntry[] = [];
  for (const { columnId, direction } of sort) {
    if (!sortable.has(columnId) || byColumn.has(columnId)) continue;
    engineSorting.push({ id: columnId, desc: direction === "desc" });
    byColumn.set(columnId, { direction, priority: engineSorting.length });
  }
  return { byColumn, engineSorting };
}

/**
 * The sort after one activation of `columnId`'s header control. Plain, the column cycles
 * ascending, descending, unsorted and becomes the whole sort. Additive, an unsorted column joins
 * the end of the sort, an ascending one turns descending in its place, and a descending one
 * leaves it, with every other entry kept as it was.
 */
function nextSort(sort: DataTableSortState, columnId: string, additive: boolean): DataTableSortState {
  const current = sort.find((entry) => entry.columnId === columnId)?.direction;
  if (!additive) {
    if (current === undefined) return [{ columnId, direction: "asc" }];
    return current === "asc" ? [{ columnId, direction: "desc" }] : [];
  }
  if (current === undefined) return [...sort, { columnId, direction: "asc" }];
  if (current === "asc") {
    return sort.map((entry) => (entry.columnId === columnId ? { columnId, direction: "desc" } : entry));
  }
  return sort.filter((entry) => entry.columnId !== columnId);
}

interface SortStateOptions {
  sort: DataTableSortState | undefined;
  defaultSort: DataTableSortState | undefined;
  onSortChange: ((sort: DataTableSortState) => void) | undefined;
}

/**
 * The table's sort, controlled or not, as drawn and as the engine takes it, and the handlers a
 * sortable column's header button activates it with. Shift on the activating click, or on the
 * Enter or Space keydown behind it, makes the activation additive.
 */
export function useSortState(
  { sort: sortProp, defaultSort, onSortChange }: SortStateOptions,
  columns: readonly { id: string; sortable: boolean }[],
) {
  const [sort, setSort] = useControllableState(sortProp, () => defaultSort ?? [], onSortChange);
  const { byColumn, engineSorting } = useMemo(() => effectiveSort(sort, columns), [sort, columns]);

  // Whether Shift was held on the Enter or Space keydown that activates a sort button. A click
  // a key activates arrives with `detail` 0, and this keeps Shift+Enter and Shift+Space additive
  // even where that click does not carry the key's modifiers.
  const keyShiftRef = useRef(false);

  function handleSortKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Enter" || event.key === " ") keyShiftRef.current = event.shiftKey;
  }

  function handleSortClick(columnId: string, event: MouseEvent<HTMLButtonElement>) {
    const additive = event.shiftKey || (event.detail === 0 && keyShiftRef.current);
    keyShiftRef.current = false;
    setSort(nextSort(sort, columnId, additive));
  }

  return { byColumn, engineSorting, handleSortKeyDown, handleSortClick };
}
