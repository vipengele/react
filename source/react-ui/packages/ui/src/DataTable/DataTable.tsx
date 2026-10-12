import {
  type AccessorFnColumnDef,
  createSortedRowModel,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "@vipengele/react-icons";
import { type KeyboardEvent, type MouseEvent, type ReactNode, useMemo, useRef } from "react";
import { useControllableState } from "../internal/useControllableState.js";
import { Table, type TableCellAlign } from "../Table/Table.js";
import { dataTableStylesheet } from "./DataTable.stylesheet.js";
import type { DataTableCellContext, DataTableColumn, DataTableProps, DataTableSortDirection, DataTableSortState } from "./types.js";

export type {
  DataTableCellContext,
  DataTableColumn,
  DataTableFunctionColumn,
  DataTableKeyColumn,
  DataTableProps,
  DataTableSortDirection,
  DataTableSortState,
} from "./types.js";

/**
 * The engine's feature set: the core row model plus row sorting and the sorted row model it
 * draws from. Nothing else is registered, so no feature `DataTable` does not offer reaches a
 * bundle. Module scope keeps it stable across renders, which the engine requires of its feature
 * set.
 */
const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });

type Features = typeof features;

/**
 * The engine's row type. The engine constrains rows to records or arrays, which `Row` is not
 * declared to be; it never reads a row itself, only hands it back to the accessor, so rows pass
 * through as this opaque type and are read as `Row` again on the way out.
 */
type EngineRow = Record<string, unknown>;

function joinClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function defaultRowId(_row: unknown, index: number): string {
  return String(index);
}

function columnIdOf<Row>(column: DataTableColumn<Row>): string {
  if (column.id !== undefined) return column.id;
  if (typeof column.accessor === "string") return column.accessor;
  throw new Error("A DataTable column with a function accessor requires an id.");
}

function readerOf<Row>(column: DataTableColumn<Row>): (row: Row) => unknown {
  const { accessor } = column;
  return typeof accessor === "function" ? accessor : (row) => row[accessor];
}

interface ResolvedColumn<Row> {
  id: string;
  header: ReactNode;
  align: TableCellAlign | undefined;
  sortable: boolean;
  /** Reads the column's value from a row. */
  read: (row: Row) => unknown;
  /** Draws the column's cell: the column's own renderer, else the value as text. */
  render: (context: DataTableCellContext<Row>) => ReactNode;
}

/** Orders the kinds of value the default comparator meets when one column holds several. */
function kindRank(value: unknown): number {
  if (typeof value === "boolean") return 0;
  if (typeof value === "number" || typeof value === "bigint") return 1;
  if (value instanceof Date) return 2;
  if (typeof value === "string") return 3;
  return 4;
}

/**
 * Compares two numbers or bigints, in any mix of the two. `NaN` ties with `NaN` and comes after
 * every other value, so the order stays total and a sort over it stays consistent.
 */
function compareNumeric(a: number | bigint, b: number | bigint): number {
  const aNaN = typeof a === "number" && Number.isNaN(a);
  const bNaN = typeof b === "number" && Number.isNaN(b);
  if (aNaN || bNaN) return Number(aNaN) - Number(bNaN);
  return a < b ? -1 : a > b ? 1 : 0;
}

let collator: Intl.Collator | undefined;

/**
 * Compares strings for the runtime's default locale, with numeric collation so runs of digits
 * compare by their value. The collator is built on first use rather than at import.
 */
function compareStrings(a: string, b: string): number {
  collator ??= new Intl.Collator(undefined, { numeric: true });
  return collator.compare(a, b);
}

/**
 * The comparator a column without its own `sortFn` sorts by, ascending. It is never called with
 * `null` or `undefined`, which the engine places last before any comparator runs.
 */
function compareValues(a: unknown, b: unknown): number {
  const rankA = kindRank(a);
  const rankB = kindRank(b);
  if (rankA !== rankB) return rankA - rankB;
  if (typeof a === "boolean") return Number(a) - Number(b);
  if (typeof a === "number" || typeof a === "bigint") return compareNumeric(a, b as number | bigint);
  if (a instanceof Date) return compareNumeric(a.getTime(), (b as Date).getTime());
  return compareStrings(String(a), String(b));
}

function renderAsText({ value }: DataTableCellContext<unknown>): ReactNode {
  return value === null || value === undefined ? null : String(value);
}

/**
 * Each column with its id, in display order, and the column definitions the engine derives its
 * row model from. Every value is read through the column's own reader, so a key is always a plain
 * property name and never interpreted as a path.
 *
 * The engine places `undefined` last in either direction but treats `null` as a value, so the
 * engine's reader hands it `null` as `undefined`, and cells read their value through the column's
 * own reader, which keeps `null`.
 */
function resolveColumns<Row>(columns: readonly DataTableColumn<Row>[]) {
  const resolved: ResolvedColumn<Row>[] = [];
  const ids = new Set<string>();
  const engineColumns: AccessorFnColumnDef<Features, EngineRow>[] = [];
  for (const column of columns) {
    const id = columnIdOf(column);
    if (ids.has(id)) throw new Error(`DataTable column ids must be unique; "${id}" appears more than once.`);
    ids.add(id);
    const read = readerOf(column);
    const sortable = column.sortable ?? true;
    resolved.push({ id, header: column.header, align: column.align, sortable, read, render: column.cell ?? renderAsText });
    const compare = column.sortFn ?? compareValues;
    engineColumns.push({
      id,
      accessorFn: (row) => read(row as unknown as Row) ?? undefined,
      enableSorting: sortable,
      sortUndefined: "last",
      sortFn: (rowA, rowB, columnId) => compare(rowA.getValue(columnId), rowB.getValue(columnId)),
    });
  }
  return { resolved, engineColumns };
}

interface SortedColumn {
  direction: DataTableSortDirection;
  /** The column's 1-based place in the sort. */
  priority: number;
}

/**
 * The sort as drawn: each sortable column's first entry, in priority order. Entries for an
 * unknown or unsortable column, and repeated entries for a column, are dropped, so the priority
 * numbers have no gaps.
 */
function effectiveSort<Row>(sort: DataTableSortState, columns: readonly ResolvedColumn<Row>[]) {
  const sortable = new Set(columns.filter((column) => column.sortable).map((column) => column.id));
  const byColumn = new Map<string, SortedColumn>();
  const engineSorting: SortingState = [];
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

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/**
 * A table of `rows` drawn by `columns`, rendered through `Table` and its parts with native table
 * semantics: a header row of column headers, then one body row per row, each cell holding its
 * column's value. Rows and cells are not focusable. Everything `Table` takes besides its children
 * passes through to it, `className` and `style` to its scroll container and `ref` to the
 * `<table>`.
 *
 * A sortable column's header is a button, and those buttons are the table's tab stops. A sorted
 * column's header carries `aria-sort` and shows its direction, and while more than one column is
 * sorted, its place in the sort.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  sort: sortProp,
  defaultSort,
  onSortChange,
  manual = false,
  className,
  ...tableProps
}: DataTableProps<Row>) {
  const { resolved, engineColumns } = useMemo(() => resolveColumns(columns), [columns]);
  const [sort, setSort] = useControllableState(sortProp, () => defaultSort ?? [], onSortChange);
  const { byColumn, engineSorting } = useMemo(() => effectiveSort(sort, resolved), [sort, resolved]);
  const showPriority = engineSorting.length > 1;

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

  const table = useTable({
    features,
    columns: engineColumns,
    data: rows as unknown as readonly EngineRow[],
    getRowId: getRowId === undefined ? defaultRowId : (row, index) => getRowId(row as unknown as Row, index),
    state: { sorting: engineSorting },
    manualSorting: manual,
  });

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N data tables on a page inject one
        stylesheet.
      */}
      <style href="vpg-data-table" precedence="vpg-data-table">
        {dataTableStylesheet}
      </style>
      <Table {...tableProps} className={joinClasses("vpg-data-table", className)}>
        <Table.Head>
          <Table.Row>
            {resolved.map(({ id, header, align, sortable }) => {
              if (!sortable) {
                return (
                  <Table.HeaderCell key={id} align={align}>
                    {header}
                  </Table.HeaderCell>
                );
              }
              const sorted = byColumn.get(id);
              const Indicator = sorted?.direction === "desc" ? ChevronDown : ChevronUp;
              return (
                <Table.HeaderCell
                  key={id}
                  align={align}
                  className="vpg-data-table-sortable"
                  aria-sort={sorted === undefined ? undefined : ARIA_SORT[sorted.direction]}
                >
                  <button
                    type="button"
                    className="vpg-data-table-sort"
                    onKeyDown={handleSortKeyDown}
                    onClick={(event) => handleSortClick(id, event)}
                  >
                    <span className="vpg-data-table-sort-label">{header}</span>
                    <Indicator className="vpg-data-table-sort-indicator" data-direction={sorted?.direction ?? "none"} aria-hidden="true" />
                    {showPriority && sorted !== undefined ? (
                      <span className="vpg-data-table-sort-priority">
                        <span aria-hidden="true">{sorted.priority}</span>
                        <span className="vpg-data-table-visually-hidden">{`, sort priority ${sorted.priority}`}</span>
                      </span>
                    ) : null}
                  </button>
                </Table.HeaderCell>
              );
            })}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {resolved.map(({ id, align, read, render }) => {
                const original = row.original as unknown as Row;
                return (
                  <Table.Cell key={id} align={align}>
                    {render({ row: original, value: read(original), rowIndex: row.index })}
                  </Table.Cell>
                );
              })}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </>
  );
}
