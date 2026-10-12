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
  /** The row's position in `rows`. */
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
}
