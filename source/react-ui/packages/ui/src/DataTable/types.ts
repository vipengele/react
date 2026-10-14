import type { ReactNode } from "react";
import type { PaginationProps, PaginationVariant } from "../Pagination/Pagination.js";
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
  /**
   * The column's width in pixels in a table with `resizableColumns`, while the column sizes hold
   * no entry for it. It is clamped into `minSize` and `maxSize`, and one that is not finite reads
   * as the default, `150`. A table without `resizableColumns` sizes its columns to their content
   * and ignores it.
   */
  size?: number;
  /**
   * The narrowest the column is drawn in a table with `resizableColumns`, in pixels. Defaults to
   * `20`; a negative one reads as `0`.
   */
  minSize?: number;
  /**
   * The widest the column is drawn in a table with `resizableColumns`, in pixels, its share of a
   * container wider than the columns included. Defaults to no limit, under which the End key on
   * its resize handle does nothing; one below `minSize` reads as `minSize`.
   */
  maxSize?: number;
  /**
   * Whether the column's width can be changed from its header in a table with
   * `resizableColumns`. Defaults to `true`. A column with `resizable: false` has no resize handle,
   * and is drawn at exactly the width its `size` and the column sizes give it, taking no share of
   * a wider container.
   */
  resizable?: boolean;
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

interface DataTableOwnProps<Row> extends Omit<TableProps, "children"> {
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
   * id counts once. An id naming no drawn row stays selected, whether it names no row in `rows`
   * or a row on another page of a `paginated` table, so the selection survives the rows and the
   * page changing, and reordering the rows by a sort never changes it.
   */
  selectedRowIds?: readonly string[];
  /** The initial selection while `selectedRowIds` is not passed. Defaults to no row selected. */
  defaultSelectedRowIds?: readonly string[];
  /**
   * Called with the ids of the selected rows whenever a selection control changes them. The ids
   * keep their order in the selection, with newly selected ids at the end in the order their rows
   * are drawn; ids naming no drawn row, such as a row on another page, are kept. In `"single"`
   * mode they are at most one id.
   * An activation that leaves the same rows selected does not call it.
   */
  onSelectionChange?: (selectedRowIds: string[]) => void;
  /**
   * The accessible name of the select-all checkbox heading the selection column in
   * `"multiple"` mode. It selects, or once they are all selected deselects, the rows drawn: the
   * current page's in a `paginated` table. Defaults to `"Select all rows"`.
   */
  selectAllLabel?: string;
  /**
   * The accessible name of a row's selection control, given the row and its index in `rows`.
   * Each row's name should be its own, so assistive technology can tell the controls apart: the
   * default, `` `Select row ${rowIndex + 1}` ``, numbers rows by their place in `rows`, not the
   * order a sort draws them in, so a name drawn from the row's data, such as
   * `` (person) => `Select ${person.name}` ``, reads better.
   */
  selectRowLabel?: (row: Row, rowIndex: number) => string;
  /**
   * The selection column header's accessible name in `"single"` mode, where the header holds no
   * control; it is visually hidden. Defaults to `"Selection"`.
   */
  selectionColumnLabel?: string;
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
   * When set, the consumer sorts and pages the rows. DataTable neither reorders nor slices
   * `rows`: it draws every row it is given, in the order given. The consumer reacts to
   * `onSortChange`, `onPageChange` and `onPageSizeChange`, passes the current page's rows
   * already sorted, and with `paginated` supplies `totalItems`, the count across every page.
   * The header controls, their indicators and `aria-sort` still show the sort state, and the bar
   * still shows the page and page size and reports their changes. A sort change leaves the page
   * where it is: the consumer chooses which page a new sort shows. Defaults to `false`.
   */
  manual?: boolean;
  /**
   * Whether the rows are drawn a page at a time, with a `Pagination` bar below the table.
   * Without `manual`, the table draws only the current page's rows and the bar counts every row
   * in `rows`; with `manual`, it draws `rows` whole, as the current page, and the bar counts
   * `totalItems`. Defaults to `false`: every row is drawn and no bar renders, whatever the page
   * props say.
   */
  paginated?: boolean;
  /**
   * How many rows there are across every page of a `manual`, `paginated` table, whose `rows`
   * hold only the current page. The bar's range text and page count come from it, and the page
   * drawn is clamped against that page count. A negative or non-finite count reads as `0` and a
   * fraction is floored, as `Pagination` reads it; `rows` is drawn whole whatever it says.
   * Omitted, the count is the length of `rows`, as if `rows` held every row. In a table with
   * `onLoadMore`, whose `rows` hold the rows loaded so far, it is the count of every row the
   * source holds, when that is known, and it makes the table's `aria-rowcount` exact. Any other
   * table that is not `manual` always counts the length of `rows` and ignores it.
   */
  totalItems?: number;
  /**
   * The current page, 1-based, controlled. While it is passed, DataTable draws this page and
   * changes it only through `onPageChange`. A page out of range is drawn clamped into range, the
   * first or the last page, and the clamp is never reported: a controlled caller corrects its
   * own value.
   */
  page?: number;
  /** The initial page while `page` is not passed. Defaults to `1`. */
  defaultPage?: number;
  /**
   * Called with the page to show, never from an effect: when the bar moves to another page; when
   * a page-size change moves to the page holding the first row in view; and, unless `manual` is
   * set, when a header sort change returns a table not on page 1 to page 1, since a new order puts
   * different rows on every page. With `manual` set, the consumer reacting to `onSortChange`
   * chooses the page itself.
   */
  onPageChange?: (page: number) => void;
  /**
   * How many rows a page holds, controlled. While it is passed, DataTable draws pages of this
   * size and changes it only through `onPageSizeChange`. A size below one, or one that is not
   * finite, reads as `1`, and a fraction is floored.
   */
  pageSize?: number;
  /**
   * The initial page size while `pageSize` is not passed. Defaults to the first of
   * `pageSizeOptions`, or `10` when that is not passed or is empty.
   */
  defaultPageSize?: number;
  /** Called with the page size picked in the bar's page-size field. */
  onPageSizeChange?: (pageSize: number) => void;
  /**
   * The page sizes the bar's page-size field offers. With fewer than two distinct sizes the
   * field is not rendered. Defaults to `Pagination`'s, `[10, 20, 50]`.
   */
  pageSizeOptions?: readonly number[];
  /** The pagination bar's `variant`. Defaults to `"full"`. */
  paginationVariant?: PaginationVariant;
  /**
   * The pagination bar's strings, each passed to `Pagination` as its prop of the same name:
   * `"aria-label"` names the bar's navigation landmark, the rest name its buttons, its page-size
   * field and its status text. Each omitted string keeps `Pagination`'s English default.
   */
  paginationLabels?: Pick<
    PaginationProps,
    | "aria-label"
    | "firstPageLabel"
    | "previousPageLabel"
    | "nextPageLabel"
    | "lastPageLabel"
    | "pageLabel"
    | "pageSizeLabel"
    | "rangeLabel"
    | "emptyLabel"
    | "pageStatusLabel"
  >;
  /**
   * Whether the table lays its columns out at the widths the column sizes give them, rather
   * than sizing them to their content, and lets the user resize them. A column's size is its
   * entry in the column sizes, or its `size`, clamped into its `minSize` and `maxSize`. A column
   * the column sizes hold an entry for, and a column with `resizable: false`, is drawn at exactly
   * its size. While the sizes fall short of the scroll container's width, the other data columns
   * share the difference in proportion to their sizes, each up to its `maxSize`, so the table
   * fills its container; while they reach or exceed it, or no other column is left to share it,
   * every column keeps its size, and a table wider than its container scrolls. The selection
   * column keeps its fixed width, takes no share and is never resized.
   *
   * Each column without `resizable: false` carries a resize handle on its header's trailing edge,
   * named "Resize" and the header. Dragging it resizes the column live, from the width it is drawn
   * at; the arrow keys resize it by 10 pixels, or 50 with Shift, the arrow toward the trailing edge
   * widening it in either reading direction, and Home and End take it to its `minSize` and its
   * `maxSize`. A resize sets the column's entry, so the column is drawn at exactly that width from
   * then on and a drag moves its edge with the pointer. Resizing never sorts. Defaults to `false`:
   * the columns are sized to their content, no handle is drawn and every size prop is ignored.
   */
  resizableColumns?: boolean;
  /**
   * The column sizes, controlled: each column's width in pixels, by column id. A column with an
   * entry is drawn at exactly that width and takes no share of a wider container. While it is
   * passed, DataTable draws from these widths and changes them only through
   * `onColumnSizesChange`. A column with no entry, or an entry that is not a finite number, takes
   * its `size`. A width outside a column's `minSize` and `maxSize` is clamped into them, and the
   * clamp is never reported: a controlled caller corrects its own value. An entry naming no
   * column is ignored.
   */
  columnSizes?: Readonly<Record<string, number>>;
  /** The initial column sizes while `columnSizes` is not passed. Defaults to no entries. */
  defaultColumnSizes?: Readonly<Record<string, number>>;
  /**
   * Called with the next column sizes whenever a column is resized, on every move of a drag: the
   * sizes as they were, with the resized column's entry set to its new width, already clamped into
   * its bounds. Every other entry is kept as it was, including one naming no column, and no
   * entry is added for a column stretched into a wider container. A resize that leaves the column
   * at the width it is drawn at does not call it.
   */
  onColumnSizesChange?: (columnSizes: Record<string, number>) => void;
  /**
   * Whether the rows are still on their way. The table carries `aria-busy="true"` and draws
   * `loadingRowCount` skeleton rows in place of the body rows, rows in `rows` included. The
   * header stays, and its sort controls keep working. Skeleton rows are hidden from assistive
   * technology. Defaults to `false`.
   */
  loading?: boolean;
  /**
   * How many skeleton rows `loading` draws, and `loadingMore` after the rows loaded, each with a
   * skeleton in every column. It is clamped
   * to a non-negative integer: a fraction is truncated, and a negative or non-finite count draws
   * none. Defaults to `5`. A `paginated` table typically passes its page size, so the skeleton
   * holds the place of the page it stands in for.
   */
  loadingRowCount?: number;
  /**
   * What the body shows in place of rows when `rows` is empty and the table is not `loading`,
   * in a single cell spanning every column; in a table with `onLoadMore`, only while `hasMore` is
   * `false` and `loadingMore` is not set. Defaults to the text "No results".
   */
  emptyState?: ReactNode;
}

/**
 * The name a virtualized table requires: a `caption`, or an `aria-label`. Either one makes the
 * scroll container a named, focusable region, the tab stop a keyboard user scrolls the rows
 * outside the window into view from.
 */
type DataTableVirtualizedName =
  | {
      /** The table's caption, which names the table and its scroll region. */
      caption: Exclude<ReactNode, null | undefined | boolean>;
    }
  | {
      /** The table's name, and its scroll region's while it has no caption. */
      "aria-label": string;
    };

/** The infinite-scroll props, which only a virtualized table with `onLoadMore` takes. */
interface DataTableFiniteProps {
  onLoadMore?: never;
  hasMore?: never;
  loadingMore?: never;
  loadMoreThreshold?: never;
}

/**
 * A virtualized table that asks for more rows as its window nears the end of `rows`. It draws
 * every row it is given and never pages, so it takes none of the paging props, and `paginated`
 * only as `false`.
 */
interface DataTableInfiniteProps {
  /**
   * Called to ask for the next rows, which the consumer appends to `rows`. Passing it turns
   * infinite scroll on. It is called when `hasMore` is set, neither `loadingMore` nor `loading`
   * is, and the last row in view is within `loadMoreThreshold` rows of the last of `rows`, or at
   * once while `rows` is empty: after a scroll, and equally without one, when the rows first drawn
   * or the rows a page appended leave the end within reach. An armed table calls it at most once,
   * so it must be safe to call once per armed state, and the table is armed again only when the
   * count of `rows` changes, when `loadingMore` has been seen set, or on a header sort click:
   * scrolling away from the end and back does not call it again. A consumer that is already
   * fetching sets `loadingMore` rather than relying on not being called. A scroll container with
   * no size, under `display: none` or in an environment that lays nothing out such as jsdom, has
   * no row in view, so a table with rows never asks while its container has no size.
   *
   * The consumer owns the order: a header sort change only reports `onSortChange`, as with
   * `manual`, and the consumer passes the rows already sorted, typically refetched from the start.
   * A sort change from a header also scrolls the table back to its top. A selectable infinite
   * table supplies `getRowId`, since the index default re-targets the selection when a sort
   * replaces the rows. The scroll container needs a bounded block size, as every virtualized table
   * does: without one every row mounts, the end of the range is always the last row, and the
   * table asks for page after page until `hasMore` is `false`.
   */
  onLoadMore: () => void;
  /**
   * Whether there are rows beyond the last of `rows`. While it is `false`, `onLoadMore` is never
   * called. A page that brings no new rows while it is still `true` leaves the end within reach,
   * so `onLoadMore` is called again: the consumer sets it to `false` once the source is exhausted.
   * While it is set and `totalItems` is not passed, the table's `aria-rowcount` is `-1`, a count not
   * yet known; once it is `false`, the count is the rows loaded and the header row. With no rows,
   * `emptyState` is drawn only while it is `false` and `loadingMore` is not set.
   */
  hasMore: boolean;
  /**
   * Whether the next rows are on their way. While it is set, `onLoadMore` is not called, and
   * `loadingRowCount` skeleton rows, hidden from assistive technology, follow the rows loaded.
   * Unlike `loading`, it replaces nothing: every row already mounted stays mounted, the row holding
   * focus included. With no rows, the skeleton rows take the place of `emptyState`, and the table
   * carries `aria-busy="true"` as it does while `loading`. Defaults to `false`.
   */
  loadingMore?: boolean;
  /**
   * How close to the last of `rows`, in rows, the last row in view comes before `onLoadMore` is
   * called: it is called once the last row in view is within this many rows of the last of `rows`.
   * The rows mounted beyond the view, and the row holding focus wherever it is, do not count.
   * Defaults to `5`.
   */
  loadMoreThreshold?: number;
  /** An infinite table never pages; `paginated` may only be `false`. */
  paginated?: false;
  page?: never;
  defaultPage?: never;
  onPageChange?: never;
  pageSize?: never;
  defaultPageSize?: never;
  onPageSizeChange?: never;
  pageSizeOptions?: never;
  paginationVariant?: never;
  paginationLabels?: never;
}

/**
 * Whether the rows are windowed, and whether a windowed table loads more rows as it scrolls.
 * `rowHeight` is read only with `virtualized`: it is required with `virtualized` and optional
 * without it. `onLoadMore` requires `virtualized`, and excludes paging.
 */
type DataTableWindowingProps =
  | ({
      /**
       * Whether only the rows in and near the scroll container's view are mounted. Defaults to
       * `false`: every drawn row is mounted.
       */
      virtualized?: false;
      /** The estimated height in CSS pixels of a body row, read only with `virtualized`. */
      rowHeight?: number;
    } & DataTableFiniteProps)
  | ({
      /**
       * Mounts only the drawn rows in and near the scroll container's view, inside the native
       * table, between two rows hidden from assistive technology that hold the height of the rows
       * above and below them. The scroll container needs a bounded block size, set through
       * `className` or `style`: without one it grows to every row's height and every row mounts.
       * The row holding focus stays mounted however far the container scrolls from it. A
       * virtualized table requires a `caption` or an `aria-label`, which makes the container a
       * named, focusable region a keyboard user scrolls.
       */
      virtualized: true;
      /**
       * The estimated height in CSS pixels of a body row, a positive number, which the window and
       * the height held for rows out of view are reckoned from until a row is mounted. A mounted
       * row is measured, and its measured height, a row of wrapped text drawn taller included,
       * replaces the estimate for it.
       */
      rowHeight: number;
    } & DataTableVirtualizedName &
      (DataTableFiniteProps | DataTableInfiniteProps));

export type DataTableProps<Row> = DataTableOwnProps<Row> & DataTableWindowingProps;

/**
 * `DataTableProps<Row>` without `Keys`, omitted from each arm of the props union in turn.
 * `Omit<DataTableProps<Row>, Keys>` keeps only the keys every arm has and merges their types, so
 * the result matches no arm and a wrapper spreading it onto `DataTable` does not type-check. A
 * wrapper spreads this instead:
 * `function Wrapped(props: DataTablePropsOmit<Row, "columns">) { return <DataTable columns={columns} {...props} />; }`.
 */
export type DataTablePropsOmit<Row, Keys extends PropertyKey> =
  DataTableProps<Row> extends infer Arm ? (Arm extends unknown ? Omit<Arm, Keys> : never) : never;
