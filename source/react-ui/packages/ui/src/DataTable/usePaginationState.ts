import { useControllableState } from "../internal/useControllableState.js";

/** A positive whole page size. Anything else reads as `1`, as `Pagination` reads it. */
function toPageSize(value: number): number {
  return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
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
  /** Whether a sort change returns the table to page 1. */
  resetPageOnSort: boolean;
}

/**
 * The table's page and page size, each controlled or not, over `totalItems` rows: the page shown,
 * clamped into `1..pageCount` at render exactly as `Pagination` clamps it, and the same pair as
 * the engine takes it. The clamp is display-only and nothing here runs in an effect, so a page out
 * of range is never reported; only the setters, which `Pagination` and the sort handler call,
 * report a change. `handleSortChange` returns to page 1 when `resetPageOnSort` is set and the page
 * shown is another.
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
    resetPageOnSort,
  }: PaginationStateOptions,
  totalItems: number,
) {
  const [rawPage, setPage] = useControllableState(pageProp, () => defaultPage ?? 1, onPageChange);
  const [rawPageSize, setPageSize] = useControllableState(
    pageSizeProp,
    () => defaultPageSize ?? pageSizeOptions?.[0] ?? 10,
    onPageSizeChange,
  );
  const pageSize = toPageSize(rawPageSize);
  const page = clampPage(rawPage, Math.max(1, Math.ceil(totalItems / pageSize)));

  function handleSortChange() {
    if (resetPageOnSort && page !== 1) setPage(1);
  }

  return { page, pageSize, enginePagination: { pageIndex: page - 1, pageSize }, setPage, setPageSize, handleSortChange };
}
