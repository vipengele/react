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
   * rows are inserted, removed or reordered. It is also the id the selection holds. Defaults to
   * the row's index in `rows`, which names a position rather than a row: a selectable table
   * supplies it, or a selected id moves to whichever row takes that position.
   */
  getRowId?: (row: Row, index: number) => string;
  /**
   * Whether rows can be selected, and how many at once. `"multiple"` selects any number of rows,
   * `"single"` at most one: selecting a row replaces the selection. With `"none"` no row is
   * selectable and none is drawn selected, whatever the selection holds. Defaults to `"none"`.
   */
  selectionMode?: "none" | "single" | "multiple";
  /**
   * The ids of the selected rows, as `getRowId` gives them, controlled. While it is passed,
   * DataTable draws this selection and changes it only through `onSelectionChange`. A repeated
   * id counts once. An id naming no row in `rows` stays selected, so the selection survives the
   * rows changing, and reordering the rows by a sort never changes it.
   */
  selectedRowIds?: readonly string[];
  /** The initial selection while `selectedRowIds` is not passed. Defaults to no row selected. */
  defaultSelectedRowIds?: readonly string[];
  /**
   * Called with the ids of the selected rows whenever a selection control changes them. The ids
   * keep their order in the selection, with a newly selected id at the end; ids naming no row in
   * `rows` are kept. In `"single"` mode they are at most one id.
   */
  onSelectionChange?: (selectedRowIds: string[]) => void;
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
  /**
   * Whether the rows are still on their way. The table carries `aria-busy="true"` and draws
   * `loadingRowCount` skeleton rows in place of the body rows, rows in `rows` included. The
   * header stays, and its sort controls keep working. Skeleton rows are hidden from assistive
   * technology. Defaults to `false`.
   */
  loading?: boolean;
  /**
   * How many skeleton rows `loading` draws, each with a skeleton in every column. It is clamped
   * to a non-negative integer: a fraction is truncated, and a negative or non-finite count draws
   * none. Defaults to `5`.
   */
  loadingRowCount?: number;
  /**
   * What the body shows in place of rows when `rows` is empty and the table is not `loading`,
   * in a single cell spanning every column. Defaults to the text "No results".
   */
  emptyState?: ReactNode;
}
