import type { ReactNode } from "react";
import type { TableCellAlign, TableProps } from "../Table/Table.js";

/** What a column's `cell` renderer is told about the cell it draws. */
export interface DataTableCellContext<Row> {
  /** The row object, as passed in `rows`. */
  row: Row;
  /**
   * The column's accessor value for this row. It is `unknown` for every column, so one renderer
   * type fits every column; a renderer that needs the property's own type reads it off `row`.
   */
  value: unknown;
  /**
   * The row's position in `rows` as passed in. Sorting changes the order rows are drawn in, never
   * this index.
   */
  rowIndex: number;
}

interface DataTableColumnBase<Row> {
  /** The column header's content. It is inline content: phrasing, never a block or a control. */
  header: ReactNode;
  /**
   * Draws the column's cell for one row. Without it the value renders as text, and `null` or
   * `undefined` renders an empty cell.
   */
  cell?: (context: DataTableCellContext<Row>) => ReactNode;
  /** Inline alignment of the column's header and cells. Defaults to `"start"`. */
  align?: TableCellAlign;
  /**
   * Whether the column can be sorted from its header. Defaults to `true`. A column with
   * `sortable: false` has a plain header with no sort control, and an entry for it in the sort
   * state is ignored.
   */
  sortable?: boolean;
  /**
   * Compares two of the column's values for an ascending sort: negative when `a` comes first,
   * positive when `b` does, `0` when they tie. A descending sort inverts it. It is only called
   * with values that are neither `null` nor `undefined`: those always sort last, in either
   * direction.
   *
   * Without it, numbers and bigints compare numerically (`NaN` after every other number), dates
   * by time (an invalid date after every valid one), booleans `false` before `true`, and strings
   * by an `Intl.Collator` for the runtime's default locale with numeric collation, so `"item 2"`
   * comes before `"item 10"`. Values of different kinds sort booleans first, then numbers, dates,
   * strings, and any other value last, compared by its string form.
   */
  sortFn?: (a: unknown, b: unknown) => number;
}

/** A column reading one property of the row. Its `id` defaults to the property's name. */
export interface DataTableKeyColumn<Row> extends DataTableColumnBase<Row> {
  /** The property of the row this column shows, read as a plain property name, never a path. */
  accessor: keyof Row & string;
  /** The column's id, unique among the table's columns. Defaults to `accessor`. */
  id?: string;
}

/** A column computing its value from the row. A function has no name to derive an id from, so `id` is required. */
export interface DataTableFunctionColumn<Row> extends DataTableColumnBase<Row> {
  /** Computes the column's value from the row. */
  accessor: (row: Row) => unknown;
  /** The column's id, unique among the table's columns. */
  id: string;
}

/** One column of a `DataTable`: a property of the row, or a value computed from it. */
export type DataTableColumn<Row> = DataTableKeyColumn<Row> | DataTableFunctionColumn<Row>;

/** The direction of one sorted column. */
export type DataTableSortDirection = "asc" | "desc";

/**
 * The sorted columns, in priority order: rows are ordered by the first entry, rows tying on it by
 * the second, and so on. Rows tying on every entry keep their order in `rows`. An empty array is
 * no sort. An entry whose `columnId` names no column, or a column with `sortable: false`, is
 * ignored, as is any entry after the first for the same column.
 */
export type DataTableSortState = { columnId: string; direction: DataTableSortDirection }[];

export interface DataTableProps<Row> extends Omit<TableProps, "children"> {
  /** The columns, in display order. Every column's id is unique. */
  columns: readonly DataTableColumn<Row>[];
  /** The rows, in display order. */
  rows: readonly Row[];
  /**
   * A row's identity, unique among the rows. A row keeps its rendered elements across renders
   * for as long as its id is unchanged, so an id taken from the data keeps them with the row when
   * rows are inserted, removed or reordered. Defaults to the row's index in `rows`.
   */
  getRowId?: (row: Row, index: number) => string;
  /**
   * The sort, controlled. While it is passed, DataTable draws this sort and changes it only
   * through `onSortChange`.
   */
  sort?: DataTableSortState;
  /** The initial sort while `sort` is not passed. Defaults to no sort. */
  defaultSort?: DataTableSortState;
  /**
   * Called with the next sort whenever a header control changes it. A plain click or Enter or
   * Space on a column's header cycles that column through ascending, descending and unsorted,
   * and makes it the only sorted column. Holding Shift adds the column at the end of the sort
   * when it is not sorted, or cycles it through ascending, descending and removed in its place,
   * keeping the other sorted columns.
   */
  onSortChange?: (sort: DataTableSortState) => void;
  /**
   * When set, DataTable does not reorder `rows`: it draws them in the order given and the
   * consumer, reacting to `onSortChange`, passes them already sorted. The header controls,
   * their indicators and `aria-sort` still show the sort state.
   */
  manual?: boolean;
}
