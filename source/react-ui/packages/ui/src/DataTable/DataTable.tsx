import {
  type AccessorFnColumnDef,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { type MouseEvent, type ReactNode, useId, useMemo } from "react";
import { Pagination } from "../Pagination/Pagination.js";
import { Table } from "../Table/Table.js";
import { DataTableBody } from "./DataTableBody.js";
import { DataTableHeaderCell } from "./DataTableHeaderCell.js";
import { DataTableSelectionHeaderCell } from "./DataTableSelectionHeaderCell.js";
import { dataTableStylesheet } from "./DataTable.stylesheet.js";
import type { ResolvedColumn } from "./model.js";
import type { DataTableCellContext, DataTableColumn, DataTableProps } from "./types.js";
import { usePaginationState } from "./usePaginationState.js";
import { useSelectionControls, useSelectionState } from "./useSelectionState.js";
import { useSortState } from "./useSortState.js";

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
 * The engine's feature set: the core row model, row sorting and the sorted row model it draws
 * from, row selection, and row pagination and the paged row model it draws from. Nothing else is
 * registered, so no feature `DataTable` does not offer reaches a bundle. Module scope keeps it
 * stable across renders, which the engine requires of its feature set.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowSelectionFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

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

function defaultSelectRowLabel(_row: unknown, rowIndex: number): string {
  return `Select row ${rowIndex + 1}`;
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
 *
 * With a `selectionMode` other than `"none"`, a leading column of fixed width holds each row's
 * selection control: a checkbox in `"multiple"` mode, a radio button in `"single"` mode, each
 * named by `selectRowLabel`. The selection is a set of row ids that sorting never changes, and a
 * selected row is drawn on the accent wash. The checked control is what tells assistive
 * technology a row is selected; rows carry no `aria-selected`, since they are not focusable
 * widgets. Clicking a row anywhere but its control selects nothing.
 *
 * In `"multiple"` mode the column header holds a select-all checkbox over the rows drawn: checked
 * while every one is selected, indeterminate while some are. Activating it selects every drawn
 * row, or deselects them all once all are selected, and keeps every id naming a row not drawn.
 * With no rows drawn it is disabled. Shift-click on a row's checkbox, or Shift+Space on a
 * focused one, gives every row from the last row toggled to that one, in drawn order, the state
 * the last toggle gave, and that row becomes the one last toggled. With no last row toggled
 * among the drawn rows, or on the last toggled row itself, it toggles the one row. In
 * `"single"` mode the column header holds `selectionColumnLabel` as visually hidden text, so the
 * column still has a name.
 *
 * With `paginated`, the rows drawn are the current page's, and a `Pagination` bar below the table
 * pages through every row in `rows`. The page and page size are each controlled or held by the
 * table, and the page drawn is clamped into range at render the way the bar clamps the page it
 * shows, so the two always agree; no effect ever reports a page. Unless `manual` is set, a header
 * sort change returns the table to page 1. Select-all and Shift range selection work over the rows
 * drawn, which are the current page's.
 *
 * While `loading`, the body is `loadingRowCount` skeleton rows and nothing else. With no rows and
 * not loading, the body is one row holding `emptyState` across every column.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  sort: sortProp,
  defaultSort,
  onSortChange,
  manual = false,
  paginated = false,
  page,
  defaultPage,
  onPageChange,
  pageSize,
  defaultPageSize,
  onPageSizeChange,
  pageSizeOptions,
  paginationVariant,
  paginationLabels,
  selectionMode = "none",
  selectedRowIds,
  defaultSelectedRowIds,
  onSelectionChange,
  selectAllLabel = "Select all rows",
  selectRowLabel = defaultSelectRowLabel,
  selectionColumnLabel = "Selection",
  loading = false,
  loadingRowCount = 5,
  emptyState = "No results",
  className,
  ...tableProps
}: DataTableProps<Row>) {
  const { resolved, engineColumns } = useMemo(() => resolveColumns(columns), [columns]);
  const { byColumn, engineSorting, handleSortKeyDown, handleSortClick } = useSortState(
    { sort: sortProp, defaultSort, onSortChange },
    resolved,
  );
  const { engineSelection, handleSelectionChange } = useSelectionState({ selectedRowIds, defaultSelectedRowIds, onSelectionChange });
  const pagination = usePaginationState(
    {
      page,
      defaultPage,
      onPageChange,
      pageSize,
      defaultPageSize,
      onPageSizeChange,
      pageSizeOptions,
      resetPageOnSort: paginated && !manual,
    },
    rows.length,
  );
  const radioName = useId();

  const table = useTable({
    features,
    columns: engineColumns,
    data: rows as unknown as readonly EngineRow[],
    getRowId: getRowId === undefined ? defaultRowId : (row, index) => getRowId(row as unknown as Row, index),
    // The selection reaches the engine as controlled state and every change it computes comes
    // back through this handler, so it leaves only through `onSelectionChange`.
    // The page reaches the engine already clamped, as controlled state. With no change handler
    // and no automatic reset, the engine never moves the page itself.
    state: { sorting: engineSorting, rowSelection: engineSelection, pagination: pagination.enginePagination },
    onRowSelectionChange: (updater) => handleSelectionChange(updater, drawnIds),
    enableRowSelection: selectionMode !== "none",
    enableMultiRowSelection: selectionMode === "multiple",
    enableSubRowSelection: false,
    // Range selection is DataTable's own, applying the last toggled row's state rather than the
    // clicked control's.
    enableRowRangeSelection: false,
    manualSorting: manual,
    manualPagination: !paginated,
    autoResetPageIndex: false,
  });
  const renderedRows = loading ? [] : table.getRowModel().rows;
  const drawnIds = renderedRows.map((row) => row.id);
  const { selectedCount, allSelected, handleSelectKeyDown, handleSelectAll, handleRowToggle } = useSelectionControls(
    drawnIds,
    engineSelection,
    table.setRowSelection,
  );

  function handleSortActivate(columnId: string, event: MouseEvent<HTMLButtonElement>) {
    handleSortClick(columnId, event);
    pagination.handleSortChange();
  }

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N data tables on a page inject one
        stylesheet.
      */}
      <style href="vpg-data-table" precedence="vpg-data-table">
        {dataTableStylesheet}
      </style>
      <Table {...tableProps} aria-busy={loading ? true : tableProps["aria-busy"]} className={joinClasses("vpg-data-table", className)}>
        <Table.Head>
          <Table.Row>
            {selectionMode === "none" ? null : (
              <DataTableSelectionHeaderCell
                selectionMode={selectionMode}
                selectAllLabel={selectAllLabel}
                selectionColumnLabel={selectionColumnLabel}
                allSelected={allSelected}
                selectedCount={selectedCount}
                noRowsDrawn={renderedRows.length === 0}
                onSelectAll={handleSelectAll}
              />
            )}
            {resolved.map(({ id, header, align, sortable }) => (
              <DataTableHeaderCell
                key={id}
                id={id}
                header={header}
                align={align}
                sortable={sortable}
                sorted={byColumn.get(id)}
                showPriority={engineSorting.length > 1}
                onSortKeyDown={handleSortKeyDown}
                onSortClick={handleSortActivate}
              />
            ))}
          </Table.Row>
        </Table.Head>
        <DataTableBody
          columns={resolved}
          drawnRows={renderedRows}
          empty={rows.length === 0}
          loading={loading}
          loadingRowCount={loadingRowCount}
          emptyState={emptyState}
          selectionMode={selectionMode}
          engineSelection={engineSelection}
          selectRowLabel={selectRowLabel}
          radioName={radioName}
          onSelectKeyDown={handleSelectKeyDown}
          onRowToggle={handleRowToggle}
        />
      </Table>
      {paginated ? (
        <Pagination
          {...paginationLabels}
          totalItems={rows.length}
          page={pagination.page}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
          pageSizeOptions={pageSizeOptions}
          variant={paginationVariant}
        />
      ) : null}
    </>
  );
}
