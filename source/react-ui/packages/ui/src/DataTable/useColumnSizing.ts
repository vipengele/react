import { useMemo } from "react";
import { useControllableState } from "../internal/useControllableState.js";

/** A column's width in pixels when neither the column sizes nor its `size` give one. */
export const DEFAULT_COLUMN_SIZE = 150;

/** A column's narrowest width in pixels when its `minSize` does not give one. */
export const DEFAULT_MIN_COLUMN_SIZE = 20;

/** A column's size constraints, as its definition declares them. */
export interface ColumnSizeDefinition {
  size?: number;
  minSize?: number;
  maxSize?: number;
  resizable?: boolean;
}

/** A column's size constraints with every default applied. */
export interface ColumnSizing {
  id: string;
  /** The column's width while the column sizes give none, already within its bounds. */
  size: number;
  minSize: number;
  /** At least `minSize`; `Infinity` when the column sets no upper bound. */
  maxSize: number;
  resizable: boolean;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, { minSize, maxSize }: { minSize: number; maxSize: number }): number {
  return Math.min(maxSize, Math.max(minSize, value));
}

/**
 * A column's size constraints with every default applied. A `minSize` that is not finite reads as
 * the default and a negative one as `0`; a `maxSize` that is not finite, or none, sets no upper
 * bound, and one below `minSize` reads as `minSize`; a `size` that is not finite reads as the
 * default, and any `size` is clamped into the bounds.
 */
export function columnSizingOf(id: string, column: ColumnSizeDefinition): ColumnSizing {
  const minSize = Math.max(0, finiteOr(column.minSize, DEFAULT_MIN_COLUMN_SIZE));
  const maxSize = Math.max(minSize, finiteOr(column.maxSize, Number.POSITIVE_INFINITY));
  const size = clamp(finiteOr(column.size, DEFAULT_COLUMN_SIZE), { minSize, maxSize });
  return { id, size, minSize, maxSize, resizable: column.resizable ?? true };
}

/**
 * A column's base width: its entry in the column sizes, or its own size when the entry is missing
 * or not a finite number, clamped into its bounds.
 */
function baseSize(sizes: Readonly<Record<string, number>>, column: ColumnSizing): number {
  return clamp(finiteOr(sizes[column.id], column.size), column);
}

/**
 * Whether a column is drawn at exactly its base width, taking no share of a wider container: a
 * column the column sizes hold a finite entry for, and a column with `resizable: false`.
 */
function isExact(sizes: Readonly<Record<string, number>>, column: ColumnSizing): boolean {
  return !column.resizable || Number.isFinite(sizes[column.id]);
}

/**
 * The widths the columns are drawn at, given each column's base width and `maxSize`, in order, and
 * the pixels `available` to them. While the bases fall short of `available`, the whole pixels of
 * the difference are shared among the columns in proportion to their bases, each up to its
 * `maxSize`: what a capped column cannot take is shared again among the rest, until none is left
 * or every column is capped. A column with a base of `0` takes no share. Each share is rounded
 * down to whole pixels, and the pixels the rounding leaves go one each to the first columns with
 * room for them. While the bases reach or exceed `available`, every column keeps its base.
 */
export function stretchColumnSizes(columns: readonly { base: number; maxSize: number }[], available: number): number[] {
  const surplus = Math.floor(available - columns.reduce((total, { base }) => total + base, 0));
  if (surplus <= 0) return columns.map(({ base }) => base);
  const slots = columns.map(({ base, maxSize }) => ({ base, room: maxSize - base, share: 0 }));
  let rest = surplus;
  let open = slots.filter(({ base, room }) => base > 0 && room > 0);
  while (rest > 0 && open.length > 0) {
    const weight = open.reduce((total, { base }) => total + base, 0);
    const capped = open.filter(({ base, room }) => (rest * base) / weight >= room);
    if (capped.length === 0) {
      for (const slot of open) slot.share = (rest * slot.base) / weight;
      break;
    }
    for (const slot of capped) {
      slot.share = slot.room;
      rest -= slot.room;
    }
    open = open.filter((slot) => !capped.includes(slot));
  }
  let leftover = surplus - slots.reduce((total, { share }) => total + Math.floor(share), 0);
  return slots.map(({ base, room, share }) => {
    const grown = Math.floor(share);
    if (leftover < 1 || base === 0 || grown + 1 > room) return base + grown;
    leftover -= 1;
    return base + grown + 1;
  });
}

/**
 * The widths the columns are drawn at, given each column's base width, `maxSize` and whether it is
 * exact, in order, and the pixels `available` to them. An exact column is drawn at its base. The
 * other columns share what `available` leaves beyond the exact columns' widths, as
 * `stretchColumnSizes` shares it; with nothing left, or no column to share it, every column keeps
 * its base.
 */
export function drawColumnSizes(columns: readonly { base: number; maxSize: number; exact: boolean }[], available: number): number[] {
  const exactTotal = columns.reduce((total, { base, exact }) => (exact ? total + base : total), 0);
  const shared = stretchColumnSizes(
    columns.filter(({ exact }) => !exact),
    available - exactTotal,
  );
  let next = 0;
  return columns.map(({ base, exact }) => (exact ? base : (shared[next++] as number)));
}

/** The widths, by column id, and their sum. */
function sizeRecord(key: string) {
  const entries = JSON.parse(key) as [string, number][];
  return {
    sizes: Object.fromEntries(entries) as Readonly<Record<string, number>>,
    total: entries.reduce((total, [, size]) => total + size, 0),
  };
}

interface ColumnSizingOptions {
  columnSizes: Readonly<Record<string, number>> | undefined;
  defaultColumnSizes: Readonly<Record<string, number>> | undefined;
  onColumnSizesChange: ((columnSizes: Record<string, number>) => void) | undefined;
}

/**
 * The table's column sizes, controlled or not. `columnSizes` holds every column's base width in
 * pixels, its entry in the sizes clamped into the column's bounds. The clamp is display-only: an
 * out-of-range size is drawn clamped and never reported, and an entry naming no column is ignored
 * and kept. `drawnSizes` holds the widths the columns are drawn at in `availableWidth`, the pixels
 * the data columns have between them (see `drawColumnSizes`), and `totalDrawnSize` their sum: a
 * column with an entry, or with `resizable: false`, is drawn at exactly its base, and the others
 * share what is left. With an `availableWidth` of `0`, nothing is measured and they are the bases.
 *
 * `columnSizes` and `drawnSizes` each keep their identity until one of their widths changes,
 * whatever else renders, so anything measuring rows against the column widths can depend on
 * `drawnSizes`.
 *
 * `setColumnSize` clamps the width it is given into the column's bounds and reports the sizes
 * with that one entry replaced and every other entry as it was, so the column is drawn at exactly
 * that width from then on. It ignores a column id naming no column and a width that is not a
 * finite number, and reports nothing when the clamped width is the width the column is drawn at
 * already. `bounds`
 * holds each column's constraints by id.
 */
export function useColumnSizing(
  { columnSizes: columnSizesProp, defaultColumnSizes, onColumnSizesChange }: ColumnSizingOptions,
  columns: readonly ColumnSizing[],
  availableWidth: number,
) {
  const [sizes, setSizes] = useControllableState<Readonly<Record<string, number>>, Record<string, number>>(
    columnSizesProp,
    () => defaultColumnSizes ?? {},
    onColumnSizesChange,
  );
  const bases = columns.map((column) => ({
    id: column.id,
    base: baseSize(sizes, column),
    maxSize: column.maxSize,
    exact: isExact(sizes, column),
  }));
  const drawn = drawColumnSizes(bases, availableWidth);
  // The widths, serialised, are the memos' keys, so each record keeps its identity across a
  // render that hands in new but equal sizes, columns or width. Every width is finite, so the
  // round trip is exact.
  const basesKey = JSON.stringify(bases.map(({ id, base }) => [id, base]));
  const drawnKey = JSON.stringify(bases.map(({ id }, index) => [id, drawn[index]]));
  const columnSizes = useMemo(() => sizeRecord(basesKey).sizes, [basesKey]);
  const { sizes: drawnSizes, total: totalDrawnSize } = useMemo(() => sizeRecord(drawnKey), [drawnKey]);
  const bounds = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns]);

  function setColumnSize(columnId: string, size: number) {
    const column = bounds.get(columnId);
    if (column === undefined || !Number.isFinite(size)) return;
    const next = clamp(size, column);
    if (next === drawnSizes[columnId]) return;
    setSizes({ ...sizes, [columnId]: next });
  }

  return { columnSizes, drawnSizes, totalDrawnSize, bounds: bounds as ReadonlyMap<string, ColumnSizing>, setColumnSize };
}
