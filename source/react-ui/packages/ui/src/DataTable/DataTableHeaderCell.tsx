import { ChevronDown, ChevronUp } from "@vipengele/react-icons";
import { type KeyboardEvent, type MouseEvent, type ReactNode, useId } from "react";
import { Table, type TableCellAlign } from "../Table/Table.js";
import { DataTableResizeHandle } from "./DataTableResizeHandle.js";
import type { ColumnSizing } from "./useColumnSizing.js";
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
  /** The column's width in pixels, set on the cell; omitted, the cell takes no width of its own. */
  width?: number;
  /**
   * The column's size constraints. Given them with a `width`, a column whose `resizable` is not
   * `false` carries a resize handle on its trailing edge.
   */
  sizing?: ColumnSizing;
  onSortKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  onSortClick: (columnId: string, event: MouseEvent<HTMLButtonElement>) => void;
  /** Called with the width the handle resizes the column to, before it is clamped. */
  onResize: (columnId: string, size: number) => void;
}

function cellClass(sortable: boolean, resizable: boolean): string | undefined {
  const classes = [sortable ? "vpg-data-table-sortable" : "", resizable ? "vpg-data-table-resizable" : ""].filter(Boolean);
  return classes.length === 0 ? undefined : classes.join(" ");
}

/**
 * A column's header cell. An unsortable column's holds its header and nothing else. A sortable
 * column's is a button carrying the header, the sort direction's indicator and, while
 * `showPriority`, the column's place in the sort; a sorted column's cell carries `aria-sort`.
 * Given a `width`, the cell carries it as its inline width, which a fixed table layout reads as
 * the column's. A resizable column's cell also holds a `DataTableResizeHandle` after its content,
 * beside the sort button rather than inside it, named after the element holding the header. That
 * element names the cell too: a name taken from the cell's content would take in the handle's
 * value, and every cell of the column would be announced under a header reading as its width.
 */
export function DataTableHeaderCell({
  id,
  header,
  align,
  sortable,
  sorted,
  showPriority,
  width,
  sizing,
  onSortKeyDown,
  onSortClick,
  onResize,
}: DataTableHeaderCellProps) {
  const labelId = useId();
  const style = width === undefined ? undefined : { width };
  const handle =
    width === undefined || sizing?.resizable !== true ? null : (
      <DataTableResizeHandle
        columnId={id}
        labelId={labelId}
        width={width}
        minSize={sizing.minSize}
        maxSize={sizing.maxSize}
        onResize={onResize}
      />
    );
  const labelIdIfNamed = handle === null ? undefined : labelId;
  if (!sortable) {
    return (
      <Table.HeaderCell align={align} className={cellClass(false, handle !== null)} style={style} aria-labelledby={labelIdIfNamed}>
        {handle === null ? header : <span id={labelId}>{header}</span>}
        {handle}
      </Table.HeaderCell>
    );
  }
  const Indicator = sorted?.direction === "desc" ? ChevronDown : ChevronUp;
  return (
    <Table.HeaderCell
      align={align}
      className={cellClass(true, handle !== null)}
      style={style}
      aria-labelledby={labelIdIfNamed}
      aria-sort={sorted === undefined ? undefined : ARIA_SORT[sorted.direction]}
    >
      <button type="button" className="vpg-data-table-sort" onKeyDown={onSortKeyDown} onClick={(event) => onSortClick(id, event)}>
        <span className="vpg-data-table-sort-label" id={labelIdIfNamed}>
          {header}
        </span>
        <Indicator className="vpg-data-table-sort-indicator" data-direction={sorted?.direction ?? "none"} aria-hidden="true" />
        {showPriority && sorted !== undefined ? (
          <span className="vpg-data-table-sort-priority">
            <span aria-hidden="true">{sorted.priority}</span>
            <span className="vpg-data-table-visually-hidden">{`, sort priority ${sorted.priority}`}</span>
          </span>
        ) : null}
      </button>
      {handle}
    </Table.HeaderCell>
  );
}
