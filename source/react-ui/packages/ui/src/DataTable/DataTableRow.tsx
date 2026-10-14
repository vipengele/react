import type { ChangeEvent, KeyboardEvent, Ref } from "react";
import { Table } from "../Table/Table.js";
import { DataTableSelectionControl } from "./DataTableSelectionControl.js";
import type { DrawnRow, ResolvedColumn, SelectionMode } from "./model.js";

export interface DataTableRowProps<Row> {
  row: DrawnRow;
  /** The row's place among the rows drawn. */
  displayIndex: number;
  /** The row's `aria-rowindex`, set while the rows are windowed. */
  ariaRowIndex?: number;
  /**
   * Measures the row's height, set while the rows are windowed; the row then carries its
   * `displayIndex` as `data-index`, which the measurement reads its place from.
   */
  measureRef?: Ref<HTMLTableRowElement>;
  columns: readonly ResolvedColumn<Row>[];
  selectionMode: SelectionMode;
  selected: boolean;
  selectRowLabel: (row: Row, rowIndex: number) => string;
  radioName: string;
  onSelectKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Handles a `"multiple"` mode row's checkbox toggling. */
  onRowToggle: (rowId: string, displayIndex: number, event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * One body row: its selection control in a leading cell unless `selectionMode` is `"none"`, then
 * each column's cell. A selected row carries the selected-row class.
 */
export function DataTableRow<Row>({
  row,
  displayIndex,
  ariaRowIndex,
  measureRef,
  columns,
  selectionMode,
  selected,
  selectRowLabel,
  radioName,
  onSelectKeyDown,
  onRowToggle,
}: DataTableRowProps<Row>) {
  const original = row.original as Row;
  const handleChange =
    selectionMode === "multiple"
      ? (event: ChangeEvent<HTMLInputElement>) => onRowToggle(row.id, displayIndex, event)
      : (event: ChangeEvent<HTMLInputElement>) => row.toggleSelected(event.currentTarget.checked);
  return (
    <Table.Row
      ref={measureRef}
      data-index={measureRef === undefined ? undefined : displayIndex}
      aria-rowindex={ariaRowIndex}
      className={selected ? "vpg-data-table-row-selected" : undefined}
    >
      {selectionMode === "none" ? null : (
        <Table.Cell className="vpg-data-table-select">
          <DataTableSelectionControl
            selectionMode={selectionMode}
            label={selectRowLabel(original, row.index)}
            checked={selected}
            radioName={radioName}
            onKeyDown={onSelectKeyDown}
            onChange={handleChange}
          />
        </Table.Cell>
      )}
      {columns.map(({ id, align, read, render }) => (
        <Table.Cell key={id} align={align}>
          {render({ row: original, value: read(original), rowIndex: row.index })}
        </Table.Cell>
      ))}
    </Table.Row>
  );
}
