import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { Skeleton } from "../Skeleton/Skeleton.js";
import { Table } from "../Table/Table.js";
import { DataTableRow } from "./DataTableRow.js";
import type { DrawnRow, ResolvedColumn, SelectionMode } from "./model.js";
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
}

/**
 * The table body. While `loading`, it is `loadingRowCount` skeleton rows and nothing else. With
 * no rows and not loading, it is one row holding `emptyState` across every column. Otherwise it
 * is one row per drawn row.
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
}: DataTableBodyProps<Row>) {
  const selectable = selectionMode !== "none";
  const columnCount = columns.length + (selectable ? 1 : 0);
  return (
    <Table.Body>
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
      {drawnRows.map((row, displayIndex) => (
        <DataTableRow
          key={row.id}
          row={row}
          displayIndex={displayIndex}
          columns={columns}
          selectionMode={selectionMode}
          selected={selectable && engineSelection[row.id] === true}
          selectRowLabel={selectRowLabel}
          radioName={radioName}
          onSelectKeyDown={onSelectKeyDown}
          onRowToggle={onRowToggle}
        />
      ))}
    </Table.Body>
  );
}
