import {
  type AccessorFnColumnDef,
  columnSizingFeature,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Pagination } from "../Pagination/Pagination.js";
import { Table } from "../Table/Table.js";
import { DataTableBody } from "./DataTableBody.js";
import { DataTableHeaderCell } from "./DataTableHeaderCell.js";
import { DataTableSelectionHeaderCell } from "./DataTableSelectionHeaderCell.js";
import { dataTableStylesheet } from "./DataTable.stylesheet.js";
import type { ResolvedColumn, RowWindow } from "./model.js";
import type { DataTableCellContext, DataTableColumn, DataTableProps } from "./types.js";
import { useAvailableWidth } from "./useAvailableWidth.js";
import { type ColumnSizing, columnSizingOf, useColumnSizing } from "./useColumnSizing.js";
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
 * from, row selection, row pagination and the paged row model it draws from, and column sizing.
 * Nothing else is registered, so no feature `DataTable` does not offer reaches a bundle. Module
 * scope keeps it stable across renders, which the engine requires of its feature set.
 */
const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  rowSelectionFeature,
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnSizingFeature,
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
  const sizing: ColumnSizing[] = [];
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
    const columnSizing = columnSizingOf(id, column);
    sizing.push(columnSizing);
    engineColumns.push({
      id,
      size: columnSizing.size,
      minSize: columnSizing.minSize,
      maxSize: columnSizing.maxSize,
      accessorFn: (row) => read(row as unknown as Row) ?? undefined,
      enableSorting: sortable,
      sortUndefined: "last",
      sortFn: (rowA, rowB, columnId) => compare(rowA.getValue(columnId), rowB.getValue(columnId)),
    });
  }
  return { resolved, sizing, engineColumns };
}

/**
 * The scroll container's style. With `resizableColumns` the consumer's style gains the data
 * columns' drawn widths summed as `--vpg-data-table-columns-width`, a length in pixels the fixed
 * layout's table width reads; the consumer's own entries win.
 */
function containerStyle(style: CSSProperties | undefined, resizableColumns: boolean, totalSize: number): CSSProperties | undefined {
  if (!resizableColumns) return style;
  return { "--vpg-data-table-columns-width": `${totalSize}px`, ...style } as CSSProperties;
}

function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") ref(node);
  else if (ref) ref.current = node;
}

/** Whether `caption` renders a caption, by the same test `Table` makes. */
function hasCaption(caption: ReactNode): boolean {
  return caption !== undefined && caption !== null && caption !== false && caption !== "";
}

/**
 * How far below the top of the scroll container's content the body starts, in whole pixels: the
 * height of the caption and the header row above it.
 */
function bodyOffsetIn(container: HTMLElement, body: HTMLElement): number {
  return Math.round(body.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop + container.scrollTop);
}

/**
 * The body's offset in the scroll container's content while `enabled`, which the virtualizer takes
 * as its scroll margin, so the window it reckons from the scroll offset is the rows actually in
 * view below the caption and the header. It is read in a layout effect and, because a header or
 * caption that wraps changes it without a render, re-read whenever either changes size, each read
 * flushed so the window moves in the frame of the resize. `captioned` re-runs the effect, because
 * the caption it observes comes and goes with it. It is `0` until it is first read.
 */
function useBodyOffset(
  enabled: boolean,
  captioned: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
  bodyRef: RefObject<HTMLTableSectionElement | null>,
): number {
  const [offset, setOffset] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `captioned` is a re-observe trigger, explained above
  useLayoutEffect(() => {
    const container = containerRef.current;
    const body = bodyRef.current;
    if (!enabled || container === null || body === null) return;
    function measure() {
      setOffset(bodyOffsetIn(container as HTMLElement, body as HTMLElement));
    }
    measure();
    const table = body.parentElement as HTMLTableElement;
    const observer = new ResizeObserver(() => {
      // An update scheduled from an observer callback lands after the paint it was meant to
      // precede; flushing it keeps the resize and the moved window in one frame.
      flushSync(measure);
    });
    for (const box of [table.tHead, table.caption]) if (box !== null) observer.observe(box);
    return () => {
      observer.disconnect();
    };
  }, [enabled, captioned, containerRef, bodyRef]);

  return offset;
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
 * drawn, which are the current page's, and a selection holds ids across pages: select-all on a
 * page never selects or deselects a row of another, and a page's select-all reads as checked once
 * that page is fully selected, whatever the others hold. A Shift range reaches only drawn rows, so
 * a last toggled row on another page leaves the Shift-click toggling the one row. In a `manual`
 * table the rows drawn are the page the consumer passed.
 *
 * With `manual`, the consumer sorts and pages: DataTable draws `rows` as given, neither reordered
 * nor sliced, and the bar pages through `totalItems` rows, so `rows` is the current page the
 * consumer fetched in answer to `onSortChange`, `onPageChange` and `onPageSizeChange`.
 *
 * While `loading`, the body is `loadingRowCount` skeleton rows and nothing else. With no rows and
 * not loading, the body is one row holding `emptyState` across every column.
 *
 * With `resizableColumns`, the table takes a fixed layout. A column's size is its entry in the
 * column sizes or else its `size`, clamped into its `minSize` and `maxSize`. A column the sizes
 * hold an entry for, and a column with `resizable: false`, is drawn at exactly its size. While the
 * sizes and the selection column fall short of the scroll container's width, the other data
 * columns share the difference in proportion to their sizes, each up to its `maxSize`, and the
 * selection column keeps its own width; while they reach or exceed it, every column keeps its size
 * and the table scrolls. Each column header carries the width it is drawn at. The column sizes are
 * controlled or held by the table and are never the stretched widths, and an out-of-range size is
 * drawn clamped and never reported. Without it the layout is automatic and every size is ignored.
 *
 * Each resizable column's header carries a resize handle on its trailing edge, a focusable
 * `separator` named "Resize" and the header, whose value is the column's drawn width. Dragging it
 * resizes the column live from the width it is drawn at, the pointer captured so the drag follows
 * it anywhere; the arrow keys resize it by 10 pixels, or 50 with Shift, the arrow toward the
 * trailing edge widening it in either reading direction, and Home and End take it to its `minSize`
 * and its `maxSize`. Every resize sets the column's entry in the column sizes, so the column is
 * drawn at exactly that width from then on and a drag moves its trailing edge with the pointer.
 * The handle sits beside the sort button, so resizing never sorts. The selection column has none.
 *
 * With `virtualized`, only the drawn rows in and near the scroll container's view are mounted,
 * inside the native table: a spacer row before them holds the height of the rows above, and one
 * after them the height of the rows below, each a single cell across every column, hidden from
 * assistive technology. Rows are reckoned from the top of the body, below the caption and the
 * header, at `rowHeight` each until they are mounted, and at their measured height from then on:
 * a row drawn taller, its text wrapping, is measured as it mounts and again whenever its height
 * changes, a column resize included, and the spacers and the window follow. A measured height
 * stays with its row through a sort. The container needs a bounded block size, set through
 * `className` or `style`; without one it grows to the height of every row and every row mounts.
 * The table then carries `aria-rowcount`, the header row and every row of the whole set counted,
 * and each mounted row its `aria-rowindex`, the header row being 1: the whole set is every row of
 * a table that is not `paginated`, and every page's rows of one that is, each row's index counting
 * the rows of the pages before its own. Selection, select-all and Shift range selection work over
 * every drawn row, mounted or not. While `loading`, or with no rows, nothing is windowed. A
 * virtualized table requires a `caption` or an `aria-label`, which makes the scroll container a
 * named, focusable region a keyboard user scrolls the rows into view from; controls in a row that
 * is not mounted are not in the tab order.
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
  totalItems,
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
  resizableColumns = false,
  columnSizes: columnSizesProp,
  defaultColumnSizes,
  onColumnSizesChange,
  virtualized = false,
  rowHeight,
  scrollRef,
  className,
  style,
  ...tableProps
}: DataTableProps<Row>) {
  const { resolved, sizing, engineColumns } = useMemo(() => resolveColumns(columns), [columns]);
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
      paginated,
      manual,
      totalItems,
    },
    rows.length,
  );
  const { rowRef: headRowRef, availableWidth } = useAvailableWidth(resizableColumns, selectionMode !== "none");
  const { columnSizes, drawnSizes, totalDrawnSize, bounds, setColumnSize } = useColumnSizing(
    { columnSizes: columnSizesProp, defaultColumnSizes, onColumnSizesChange },
    sizing,
    availableWidth,
  );
  const radioName = useId();
  const scrollElementRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLTableSectionElement | null>(null);
  // The container is rendered by `Table`, a child, whose ref is attached before this component's
  // layout effects run, so the virtualizer finds it on mount and the first window renders then.
  const handleScrollRef = useCallback(
    (node: HTMLDivElement | null) => {
      scrollElementRef.current = node;
      assignRef(scrollRef, node);
    },
    [scrollRef],
  );

  const table = useTable({
    features,
    columns: engineColumns,
    data: rows as unknown as readonly EngineRow[],
    getRowId: getRowId === undefined ? defaultRowId : (row, index) => getRowId(row as unknown as Row, index),
    // The selection reaches the engine as controlled state and every change it computes comes
    // back through this handler, so it leaves only through `onSelectionChange`.
    // The page reaches the engine already clamped, as controlled state. With no change handler
    // and no automatic reset, the engine never moves the page itself.
    // The column sizes reach it as bases, already clamped; nothing calls the engine's own sizing
    // setters, so it never changes them.
    state: {
      sorting: engineSorting,
      rowSelection: engineSelection,
      pagination: pagination.enginePagination,
      columnSizing: columnSizes,
    },
    onRowSelectionChange: (updater) => handleSelectionChange(updater, drawnIds),
    enableRowSelection: selectionMode !== "none",
    enableMultiRowSelection: selectionMode === "multiple",
    enableSubRowSelection: false,
    // Range selection is DataTable's own, applying the last toggled row's state rather than the
    // clicked control's.
    enableRowRangeSelection: false,
    manualSorting: manual,
    manualPagination: !pagination.slicesRows,
    autoResetPageIndex: false,
  });
  const renderedRows = loading ? [] : table.getRowModel().rows;
  const drawnIds = renderedRows.map((row) => row.id);
  const windowed = virtualized && renderedRows.length > 0;
  const bodyOffset = useBodyOffset(windowed, hasCaption(tableProps.caption), scrollElementRef, bodyRef);
  const estimateSize = useCallback(() => rowHeight ?? 0, [rowHeight]);
  // Rows are keyed by id, so a measured height stays with its row when a sort or a page change
  // moves it. The key changes identity with the drawn rows, which is what makes the virtualizer
  // lay every row out again in the new order.
  const getItemKey = useCallback((index: number) => (renderedRows[index] as (typeof renderedRows)[number]).id, [renderedRows]);
  const virtualizer = useVirtualizer({
    count: renderedRows.length,
    enabled: windowed,
    getScrollElement: () => scrollElementRef.current,
    estimateSize,
    getItemKey,
    scrollMargin: bodyOffset,
  });
  // The virtualizer keeps each row's size until it is told to measure again, so a new estimate
  // reaches rows already reckoned only through `measure`. That forgets every measured height, and
  // a mounted row whose height has not changed raises no resize to be measured by again, so each
  // one is measured on the spot. `measure` reckons the rows afresh only when they are next read,
  // and a measurement re-sizes a row only when it differs from the size last reckoned for it, so
  // the rows are read at the new estimate before the mounted ones are measured against it.
  const estimatedRowHeight = useRef(rowHeight);
  useLayoutEffect(() => {
    if (estimatedRowHeight.current === rowHeight) return;
    estimatedRowHeight.current = rowHeight;
    virtualizer.measure();
    virtualizer.getVirtualItems();
    const body = bodyRef.current as HTMLTableSectionElement;
    for (const row of body.querySelectorAll<HTMLTableRowElement>(":scope > [data-index]")) virtualizer.measureElement(row);
  }, [virtualizer, rowHeight]);
  const rowWindow: RowWindow | undefined = windowed
    ? {
        rows: virtualizer.getVirtualItems().map(({ index, start, end }) => ({ index, start: start - bodyOffset, end: end - bodyOffset })),
        totalSize: virtualizer.getTotalSize(),
        measureRow: virtualizer.measureElement,
      }
    : undefined;
  // The rows drawn are one page of a `paginated` table, so the whole set counts every page's rows
  // and a drawn row's index counts the rows of the pages before.
  const pageStart = paginated ? (pagination.page - 1) * pagination.pageSize : 0;
  const rowCount = Math.max(paginated ? pagination.totalItems : renderedRows.length, pageStart + renderedRows.length);
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
      <Table
        {...tableProps}
        aria-busy={loading ? true : tableProps["aria-busy"]}
        aria-rowcount={windowed ? rowCount + 1 : tableProps["aria-rowcount"]}
        scrollRef={handleScrollRef}
        className={joinClasses("vpg-data-table", resizableColumns ? "vpg-data-table-fixed" : undefined, className)}
        style={containerStyle(style, resizableColumns, totalDrawnSize)}
      >
        <Table.Head>
          <Table.Row ref={headRowRef} aria-rowindex={windowed ? 1 : undefined}>
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
                width={resizableColumns ? drawnSizes[id] : undefined}
                sizing={resizableColumns ? bounds.get(id) : undefined}
                onSortKeyDown={handleSortKeyDown}
                onSortClick={handleSortActivate}
                onResize={setColumnSize}
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
          rowWindow={rowWindow}
          firstRowIndex={windowed ? pageStart + 2 : undefined}
          bodyRef={bodyRef}
        />
      </Table>
      {paginated ? (
        <Pagination
          {...paginationLabels}
          totalItems={pagination.totalItems}
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
