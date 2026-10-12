import { type AccessorFnColumnDef, tableFeatures, useTable } from "@tanstack/react-table";
import { type ReactNode, useMemo } from "react";
import { Table, type TableCellAlign } from "../Table/Table.js";
import { dataTableStylesheet } from "./DataTable.stylesheet.js";
import type { DataTableCellContext, DataTableColumn, DataTableProps } from "./types.js";

export type {
  DataTableCellContext,
  DataTableColumn,
  DataTableFunctionColumn,
  DataTableKeyColumn,
  DataTableProps,
} from "./types.js";

/**
 * The engine's feature set. Only the core row model is registered, so no feature `DataTable`
 * does not offer reaches a bundle. Module scope keeps it stable across renders, which the engine
 * requires of its feature set.
 */
const features = tableFeatures({});

type Features = typeof features;

/**
 * The engine's row type. The engine constrains rows to records or arrays, which `Row` is not
 * declared to be; it never reads a row itself, only hands it back to the accessor, so rows pass
 * through as this opaque type and are read as `Row` again on the way out.
 */
type EngineRow = Record<string, unknown>;

function joinClasses(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

function defaultRowId(_row: unknown, index: number): string {
  return String(index);
}

function columnIdOf<Row>(column: DataTableColumn<Row>): string {
  if (column.id !== undefined) return column.id;
  if (typeof column.accessor === "string") return column.accessor;
  throw new Error("A DataTable column with a function accessor requires an id.");
}

function readerOf<Row>(column: DataTableColumn<Row>): (row: Row) => unknown {
  const { accessor } = column;
  return typeof accessor === "function" ? accessor : (row) => row[accessor];
}

interface ResolvedColumn<Row> {
  id: string;
  header: ReactNode;
  align: TableCellAlign | undefined;
  /** Draws the column's cell: the column's own renderer, else the value as text. */
  render: (context: DataTableCellContext<Row>) => ReactNode;
}

function renderAsText({ value }: DataTableCellContext<unknown>): ReactNode {
  return value === null || value === undefined ? null : String(value);
}

/**
 * Each column with its id, in display order, and the column definitions the engine derives its
 * row model from. Every value is read through the column's own reader, so a key is always a plain
 * property name and never interpreted as a path.
 */
function resolveColumns<Row>(columns: readonly DataTableColumn<Row>[]) {
  const resolved: ResolvedColumn<Row>[] = [];
  const ids = new Set<string>();
  const engineColumns: AccessorFnColumnDef<Features, EngineRow>[] = [];
  for (const column of columns) {
    const id = columnIdOf(column);
    if (ids.has(id)) throw new Error(`DataTable column ids must be unique; "${id}" appears more than once.`);
    ids.add(id);
    resolved.push({ id, header: column.header, align: column.align, render: column.cell ?? renderAsText });
    const read = readerOf(column);
    engineColumns.push({ id, accessorFn: (row) => read(row as unknown as Row) });
  }
  return { resolved, engineColumns };
}

/**
 * A table of `rows` drawn by `columns`, rendered through `Table` and its parts with native table
 * semantics: a header row of column headers, then one body row per row, each cell holding its
 * column's value. Rows and cells are not focusable. Everything `Table` takes besides its children
 * passes through to it, `className` and `style` to its scroll container and `ref` to the
 * `<table>`.
 */
export function DataTable<Row>({ columns, rows, getRowId, className, ...tableProps }: DataTableProps<Row>) {
  const { resolved, engineColumns } = useMemo(() => resolveColumns(columns), [columns]);
  const table = useTable({
    features,
    columns: engineColumns,
    data: rows as unknown as readonly EngineRow[],
    getRowId: getRowId === undefined ? defaultRowId : (row, index) => getRowId(row as unknown as Row, index),
  });

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N data tables on a page inject one
        stylesheet.
      */}
      <style href="vpg-data-table" precedence="vpg-data-table">
        {dataTableStylesheet}
      </style>
      <Table {...tableProps} className={joinClasses("vpg-data-table", className)}>
        <Table.Head>
          <Table.Row>
            {resolved.map(({ id, header, align }) => (
              <Table.HeaderCell key={id} align={align}>
                {header}
              </Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {table.getRowModel().rows.map((row) => (
            <Table.Row key={row.id}>
              {resolved.map(({ id, align, render }) => (
                <Table.Cell key={id} align={align}>
                  {render({ row: row.original as unknown as Row, value: row.getValue(id), rowIndex: row.index })}
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </>
  );
}
