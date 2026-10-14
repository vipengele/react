import type { ChangeEvent, KeyboardEvent, ReactNode, Ref } from "react";
import { Skeleton } from "../Skeleton/Skeleton.js";
import { Table } from "../Table/Table.js";
import { DataTableRow } from "./DataTableRow.js";
import type { DrawnRow, ResolvedColumn, RowWindow, SelectionMode } from "./model.js";
import type { RowSelection } from "./useSelectionState.js";

/**
 * The keys of the skeleton rows to draw: one per row, a non-negative integer's worth, `0` rows for
 * a negative or non-finite count.
 */
function skeletonRowKeys(count: number): string[] {
  const length = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return Array.from({ length }, (_, index) => `skeleton-${index}`);
}

export interface DataTableBodyProps<Row> {
  columns: readonly ResolvedColumn<Row>[];
  /** The rows to draw, in drawn order. */
  drawnRows: readonly DrawnRow[];
  /** Whether `rows` is empty. */
  empty: boolean;
  loading: boolean;
  loadingRowCount: number;
  emptyState: ReactNode;
  selectionMode: SelectionMode;
  engineSelection: RowSelection;
  selectRowLabel: (row: Row, rowIndex: number) => string;
  radioName: string;
  onSelectKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onRowToggle: (rowId: string, displayIndex: number, event: ChangeEvent<HTMLInputElement>) => void;
  /** The rows to mount of a virtualized table; without it every drawn row is mounted. */
  rowWindow?: RowWindow;
  /** The `aria-rowindex` of the first drawn row, set while the rows are windowed. */
  firstRowIndex?: number;
  bodyRef?: Ref<HTMLTableSectionElement>;
}

/**
 * A row standing in for the rows out of view between two mounted ones, or before the first or
 * after the last: one cell across every column, as tall as the rows it stands in for, hidden from
 * assistive technology, which counts the rows through `aria-rowcount` instead.
 */
function SpacerRow({ height, columnCount }: { height: number; columnCount: number }) {
  return (
    <Table.Row aria-hidden="true" className="vpg-data-table-spacer">
      <Table.Cell colSpan={columnCount} style={{ blockSize: `${height}px` }} />
    </Table.Row>
  );
}

/**
 * The table body. While `loading`, it is `loadingRowCount` skeleton rows and nothing else. With
 * no rows and not loading, it is one row holding `emptyState` across every column. Otherwise it
 * is one row per drawn row, or with a `rowWindow`, one row per windowed row, a spacer row before
 * the first and after the last, and a spacer row between two windowed rows that are not
 * neighbours. Each windowed row's `displayIndex` is still its place among every drawn row, which
 * is what a Shift range selection spans.
 */
export function DataTableBody<Row>({
  columns,
  drawnRows,
  empty,
  loading,
  loadingRowCount,
  emptyState,
  selectionMode,
  engineSelection,
  selectRowLabel,
  radioName,
  onSelectKeyDown,
  onRowToggle,
  rowWindow,
  firstRowIndex,
  bodyRef,
}: DataTableBodyProps<Row>) {
  const selectable = selectionMode !== "none";
  const columnCount = columns.length + (selectable ? 1 : 0);

  function renderRow(row: DrawnRow, displayIndex: number) {
    return (
      <DataTableRow
        key={row.id}
        row={row}
        displayIndex={displayIndex}
        ariaRowIndex={firstRowIndex === undefined ? undefined : firstRowIndex + displayIndex}
        columns={columns}
        selectionMode={selectionMode}
        selected={selectable && engineSelection[row.id] === true}
        selectRowLabel={selectRowLabel}
        radioName={radioName}
        onSelectKeyDown={onSelectKeyDown}
        onRowToggle={onRowToggle}
      />
    );
  }

  function renderWindow({ rows, totalSize }: RowWindow) {
    const mounted: ReactNode[] = [];
    let end = 0;
    for (const [position, { index, start, end: rowEnd }] of rows.entries()) {
      // The leading spacer is always mounted, so it keeps its element as the window moves.
      if (position === 0) mounted.push(<SpacerRow key="spacer-start" height={start} columnCount={columnCount} />);
      else if (start > end) mounted.push(<SpacerRow key={`spacer-${index}`} height={start - end} columnCount={columnCount} />);
      mounted.push(renderRow(drawnRows[index] as DrawnRow, index));
      end = rowEnd;
    }
    mounted.push(<SpacerRow key="spacer-end" height={Math.max(0, totalSize - end)} columnCount={columnCount} />);
    return mounted;
  }

  return (
    <Table.Body ref={bodyRef}>
      {loading
        ? skeletonRowKeys(loadingRowCount).map((key) => (
            // The rows only stand in for data, so they stay out of the accessibility tree; the
            // table's `aria-busy` says it is loading.
            <Table.Row key={key} aria-hidden="true">
              {selectable ? <Table.Cell className="vpg-data-table-select" /> : null}
              {columns.map(({ id, align }) => (
                <Table.Cell key={id} align={align}>
                  <Skeleton />
                </Table.Cell>
              ))}
            </Table.Row>
          ))
        : null}
      {!loading && empty ? (
        <Table.Row>
          <Table.Cell colSpan={Math.max(1, columnCount)} className="vpg-data-table-empty">
            {emptyState}
          </Table.Cell>
        </Table.Row>
      ) : null}
      {rowWindow === undefined ? drawnRows.map(renderRow) : renderWindow(rowWindow)}
    </Table.Body>
  );
}
