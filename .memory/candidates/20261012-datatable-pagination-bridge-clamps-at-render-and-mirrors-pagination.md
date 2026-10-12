---
about: DataTable's page state is clamped at render and handed to the engine as controlled pagination, with the engine told never to move the page itself; Pagination and DataTable read page size, count and page through one shared module
saw:
  - source/react-ui/packages/ui/src/DataTable/usePaginationState.ts
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/Pagination/Pagination.tsx
  - source/react-ui/packages/ui/src/internal/paging.ts
  - source/react-ui/packages/ui/src/DataTable/DataTable.test.tsx
---
- `usePaginationState` holds `page` and `pageSize` through `useControllableState`, clamps the page into `1..pageCount` at
  render, and gives the engine `{ pageIndex: page - 1, pageSize }` as controlled state. No effect runs, so an out-of-range
  controlled page is drawn clamped and never reported through `onPageChange`; only the setters `Pagination` and the sort
  handler call report a change. A test renders `page={99}` under StrictMode and asserts the callback never fires.
- `DataTable.tsx` sets `manualPagination: !slicesRows` (`slicesRows` is `paginated && !manual`) and
  `autoResetPageIndex: false`, and passes no `onPaginationChange`. `manual` tables are never sliced because their `rows`
  are already the page, and the page count then comes from `totalItems` (read as `Pagination` reads it: negative or
  non-finite is `0`, fractions floor), falling back to `rows.length`. `autoResetPageIndex: false` has no failing test,
  because the controlled state overrides the engine's own atom; it is there so the engine never tries to move the page.
- A header sort change returns a client-mode paginated table to page 1: `DataTable.tsx` wraps the sort-click handler and
  calls `handleSortChange`, inside the click, not an effect. A controlled `sort` changed from outside does not reset the
  page, and a `manual` table's consumer picks the page.
- `toPageSize`, `toTotal` and `clampPage` live in `src/internal/paging.ts`, and both `Pagination.tsx` and
  `usePaginationState.ts` read through them, so the page the table draws and the page the bar shows cannot be read by two
  different rules. A new consumer of `Pagination`'s page arithmetic imports them rather than copying them.
- `Pagination`'s page-size rule (the page holding the first visible row stays in view, `floor((page-1)*size/newSize)+1`)
  is what DataTable shows after a size change; DataTable adds nothing on top of it.
