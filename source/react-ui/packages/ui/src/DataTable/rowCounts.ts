import { toTotal } from "../internal/paging.js";

interface LoadMoreOptions {
  onLoadMore: (() => void) | undefined;
  hasMore: boolean | undefined;
  loadingMore: boolean | undefined;
  /** The consumer's count of every row the source holds, when it is known. */
  totalItems: number | undefined;
  virtualized: boolean;
  /** Paging wins over `onLoadMore`: a `paginated` table is never infinite. */
  paginated: boolean;
  loading: boolean;
}

/** What the table draws around its rows, and how it counts them, given its infinite-scroll props. */
export interface LoadMoreState {
  /** Whether the table is infinite: `virtualized`, with `onLoadMore`, and not `paginated`. */
  infinite: boolean;
  /** Whether an infinite table has rows beyond those loaded. */
  hasMore: boolean;
  totalItems: number | undefined;
  /** Whether skeleton rows follow the loaded rows: an infinite table `loadingMore`, not `loading`. */
  appending: boolean;
  /**
   * Whether the body draws `emptyState`: with no rows and not `loading`, and for an infinite table
   * only once `hasMore` is `false` and `loadingMore` is not set, since until then rows may come.
   */
  drawsEmptyState: boolean;
  /** Whether the table is `aria-busy`: while `loading`, and while skeleton rows are all an infinite table draws. */
  busy: boolean;
}

/** The infinite-scroll state of a table holding `rowCount` rows. */
export function loadMoreState(
  { onLoadMore, hasMore = false, loadingMore = false, totalItems, virtualized, paginated, loading }: LoadMoreOptions,
  rowCount: number,
): LoadMoreState {
  const infinite = onLoadMore !== undefined && virtualized && !paginated;
  const appending = infinite && loadingMore && !loading;
  const empty = rowCount === 0;
  return {
    infinite,
    hasMore,
    totalItems,
    appending,
    drawsEmptyState: empty && !loading && !(infinite && (hasMore || loadingMore)),
    busy: loading || (empty && appending),
  };
}

/**
 * The `aria-rowcount` of an infinite table with `loadedCount` rows loaded, the header row counted:
 * `totalItems` and the header row while `totalItems` is known, read as `Pagination` reads a count
 * and never fewer than the rows loaded; `-1`, an unknown count, while `hasMore` is set without it;
 * and the rows loaded and the header row once `hasMore` is `false`.
 */
function infiniteRowCount({ hasMore, totalItems }: LoadMoreState, loadedCount: number): number {
  if (totalItems !== undefined) return Math.max(toTotal(totalItems), loadedCount) + 1;
  return hasMore ? -1 : loadedCount + 1;
}

interface RowCountOptions {
  paginated: boolean;
  /** The page shown, its size and the count of rows across every page, read only when `paginated`. */
  pagination: { page: number; pageSize: number; totalItems: number };
  loadMore: LoadMoreState;
}

/**
 * A windowed table's `aria-rowcount`, and the `aria-rowindex` of the first of its `drawnCount` drawn
 * rows, the header row being 1. The rows drawn are one page of a `paginated` table, so its whole set
 * counts every page's rows, never fewer than the pages before and the page drawn, and a drawn row's
 * index counts the rows of the pages before. An infinite table counts as `infiniteRowCount` reads it.
 */
export function windowedRowCounts({ paginated, pagination, loadMore }: RowCountOptions, drawnCount: number) {
  const pageStart = paginated ? (pagination.page - 1) * pagination.pageSize : 0;
  const ariaRowCount = loadMore.infinite
    ? infiniteRowCount(loadMore, drawnCount)
    : Math.max(paginated ? pagination.totalItems : drawnCount, pageStart + drawnCount) + 1;
  return { ariaRowCount, firstRowIndex: pageStart + 2 };
}
