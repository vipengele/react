import type { ReactNode } from "react";
import type { TableCellAlign } from "../Table/Table.js";
import type { DataTableCellContext, DataTableProps } from "./types.js";

/** A column as DataTable draws it, with its id and every default applied. */
export interface ResolvedColumn<Row> {
  id: string;
  header: ReactNode;
  align: TableCellAlign | undefined;
  sortable: boolean;
  /** Reads the column's value from a row. */
  read: (row: Row) => unknown;
  /** Draws the column's cell: the column's own renderer, else the value as text. */
  render: (context: DataTableCellContext<Row>) => ReactNode;
}

/** A row as drawn: its id, its index in `rows`, the row itself, and the toggle of its selection. */
export interface DrawnRow {
  id: string;
  index: number;
  original: unknown;
  toggleSelected: (selected: boolean) => void;
}

/** One mounted row of a virtualized table, placed in pixels from the top of the body. */
export interface WindowedRow {
  /** The row's place among the rows drawn. */
  index: number;
  start: number;
  end: number;
}

/** The rows a virtualized table mounts, in drawn order, and the height of every drawn row. */
export interface RowWindow {
  rows: readonly WindowedRow[];
  totalSize: number;
}

/** How many rows a table selects at once; `"none"` draws no selection column. */
export type SelectionMode = NonNullable<DataTableProps<unknown>["selectionMode"]>;
