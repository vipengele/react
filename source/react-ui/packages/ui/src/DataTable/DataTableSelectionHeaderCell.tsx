import { Checkbox } from "../Checkbox/Checkbox.js";
import { Table } from "../Table/Table.js";

export interface DataTableSelectionHeaderCellProps {
  selectionMode: "single" | "multiple";
  selectAllLabel: string;
  selectionColumnLabel: string;
  /** Whether every drawn row is selected. */
  allSelected: boolean;
  /** How many drawn rows are selected. */
  selectedCount: number;
  /** Whether no row is drawn. */
  noRowsDrawn: boolean;
  onSelectAll: () => void;
}

/**
 * The selection column's header cell: the select-all checkbox in `"multiple"` mode, indeterminate
 * while some drawn rows are selected and disabled while none is drawn, and `selectionColumnLabel`
 * as visually hidden text in `"single"` mode.
 */
export function DataTableSelectionHeaderCell({
  selectionMode,
  selectAllLabel,
  selectionColumnLabel,
  allSelected,
  selectedCount,
  noRowsDrawn,
  onSelectAll,
}: DataTableSelectionHeaderCellProps) {
  return (
    <Table.HeaderCell className="vpg-data-table-select">
      {selectionMode === "multiple" ? (
        <Checkbox
          aria-label={selectAllLabel}
          checked={allSelected}
          indeterminate={selectedCount > 0 && !allSelected}
          disabled={noRowsDrawn}
          onChange={onSelectAll}
        />
      ) : (
        <span className="vpg-data-table-visually-hidden">{selectionColumnLabel}</span>
      )}
    </Table.HeaderCell>
  );
}
