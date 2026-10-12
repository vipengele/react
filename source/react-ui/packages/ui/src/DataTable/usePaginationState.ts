import { useControllableState } from "../internal/useControllableState.js";

/** A positive whole page size. Anything else reads as `1`, as `Pagination` reads it. */
function toPageSize(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
}

/** A whole, non-negative item count. Anything else reads as `0`, as `Pagination` reads it. */
function toTotal(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

/** `value` floored into `1..pageCount`, as `Pagination` clamps the page it shows. `NaN` reads as `1`. */
function clampPage(value: number, pageCount: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(Math.max(Math.floor(value), 1), pageCount);
}

interface PaginationStateOptions {
  page: number | undefined;
  defaultPage: number | undefined;
  onPageChange: ((page: number) => void) | undefined;
  pageSize: number | undefined;
  defaultPageSize: number | undefined;
  onPageSizeChange: ((pageSize: number) => void) | undefined;
  pageSizeOptions: readonly number[] | undefined;
  paginated: boolean;
  /** Whether the consumer sorts and pages the rows itself. */
  manual: boolean;
  /** The consumer's count of rows across every page, read only when `manual`. */
  totalItems: number | undefined;
}

/**
 * The table's page and page size, each controlled or not: the page shown, clamped into
 * `1..pageCount` at render exactly as `Pagination` clamps it, and the same pair as the engine
 * takes it. The page count comes from `totalItems`: the consumer's count when `manual` and
 * passed, read as `Pagination` reads it, and otherwise `rowCount`. The clamp is display-only and
 * nothing here runs in an effect, so a page out of range is never reported; only the setters,
 * which `Pagination` and the sort handler call, report a change.
 *
 * `slicesRows` is whether the engine slices the rows to the page: only for a `paginated` table
 * that is not `manual`, since a `manual` table's rows are already the page. `handleSortChange`
 * returns such a table to page 1 when the page shown is another; a `manual` table's consumer
 * chooses the page a new sort shows.
 */
export function usePaginationState(
  {
    page: pageProp,
    defaultPage,
    onPageChange,
    pageSize: pageSizeProp,
    defaultPageSize,
    onPageSizeChange,
    pageSizeOptions,
    paginated,
    manual,
    totalItems: totalItemsProp,
  }: PaginationStateOptions,
  rowCount: number,
) {
  const [rawPage, setPage] = useControllableState(pageProp, () => defaultPage ?? 1, onPageChange);
  const [rawPageSize, setPageSize] = useControllableState(
    pageSizeProp,
    () => defaultPageSize ?? pageSizeOptions?.[0] ?? 10,
    onPageSizeChange,
  );
  const slicesRows = paginated && !manual;
  const totalItems = manual && totalItemsProp !== undefined ? toTotal(totalItemsProp) : rowCount;
  const pageSize = toPageSize(rawPageSize);
  const page = clampPage(rawPage, Math.max(1, Math.ceil(totalItems / pageSize)));

  function handleSortChange() {
    if (slicesRows && page !== 1) setPage(1);
  }

  return {
    page,
    pageSize,
    totalItems,
    slicesRows,
    enginePagination: { pageIndex: page - 1, pageSize },
    setPage,
    setPageSize,
    handleSortChange,
  };
}
