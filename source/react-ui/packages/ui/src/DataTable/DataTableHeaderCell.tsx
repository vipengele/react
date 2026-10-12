import { ChevronDown, ChevronUp } from "@vipengele/react-icons";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Table, type TableCellAlign } from "../Table/Table.js";
import type { SortedColumn } from "./useSortState.js";

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

export interface DataTableHeaderCellProps {
  id: string;
  header: ReactNode;
  align: TableCellAlign | undefined;
  sortable: boolean;
  /** The column's place in the sort, when it is sorted. */
  sorted: SortedColumn | undefined;
  /** Whether the sort's priority number is drawn, which it is while more than one column is sorted. */
  showPriority: boolean;
  onSortKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onSortClick: (columnId: string, event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * A column's header cell. An unsortable column's holds its header and nothing else. A sortable
 * column's is a button carrying the header, the sort direction's indicator and, while
 * `showPriority`, the column's place in the sort; a sorted column's cell carries `aria-sort`.
 */
export function DataTableHeaderCell({
  id,
  header,
  align,
  sortable,
  sorted,
  showPriority,
  onSortKeyDown,
  onSortClick,
}: DataTableHeaderCellProps) {
  if (!sortable) return <Table.HeaderCell align={align}>{header}</Table.HeaderCell>;
  const Indicator = sorted?.direction === "desc" ? ChevronDown : ChevronUp;
  return (
    <Table.HeaderCell
      align={align}
      className="vpg-data-table-sortable"
      aria-sort={sorted === undefined ? undefined : ARIA_SORT[sorted.direction]}
    >
      <button type="button" className="vpg-data-table-sort" onKeyDown={onSortKeyDown} onClick={(event) => onSortClick(id, event)}>
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
}
