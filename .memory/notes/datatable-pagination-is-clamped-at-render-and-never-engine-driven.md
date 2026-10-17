---
name: datatable-pagination-is-clamped-at-render-and-never-engine-driven
kind: invariant
description: DataTable clamps the page at render and hands the engine controlled pagination it is told never to move; Pagination and DataTable read page size, total and page through one shared internal/paging module.
anchors:
  - path: source/react-ui/packages/ui/src/DataTable/usePaginationState.ts
    blob: 08b92b0e958e
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
    blob: 7315ea2c1173
  - path: source/react-ui/packages/ui/src/Pagination/Pagination.tsx
    blob: 9d805bd9dd6b
  - path: source/react-ui/packages/ui/src/internal/paging.ts
    blob: 166da39fc128
confidence: verified
---

- `usePaginationState` holds `page` and `pageSize` through `useControllableState`, clamps the page into `1..pageCount` at render
  and gives the engine `{ pageIndex: page - 1, pageSize }` as controlled state. No effect runs, so an out-of-range controlled page
  is drawn clamped and never reported through `onPageChange`; a test renders `page={99}` under StrictMode and asserts that.
- `DataTable.tsx:397-398` sets `manualPagination: !pagination.slicesRows` and `autoResetPageIndex: false`, and passes no
  `onPaginationChange`. `manual` tables are never sliced because their `rows` are already the page; the page count then comes from
  `totalItems`, falling back to `rows.length`. `autoResetPageIndex: false` has no failing test (the controlled state overrides the
  engine's atom); it is there so the engine never tries to move the page.
- A header sort change returns a client-mode paginated table to page 1: the sort-click handler calls `handleSortChange` inside
  the click, not an effect. A controlled `sort` changed from outside does not reset the page.
- `toPageSize`, `toTotal` and `clampPage` live in `internal/paging.ts` and both `Pagination.tsx` and `usePaginationState.ts` read
  through them, so the page the table draws and the bar shows cannot be read by two rules. A new consumer of `Pagination`'s page
  arithmetic imports them rather than copying.
