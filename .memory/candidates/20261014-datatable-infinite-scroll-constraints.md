---
about: what constrains DataTable's infinite scroll — a virtualized mode whose end-reached call comes from an effect, with a scroll-pending hold, a rows-replaced re-arm, an unknown-total aria-rowcount and no engine sorting
saw:
  - source/react-ui/packages/ui/src/DataTable/useEndReached.ts
  - source/react-ui/packages/ui/src/DataTable/useRowWindow.ts
  - source/react-ui/packages/ui/src/DataTable/rowCounts.ts
  - source/react-ui/packages/ui/src/DataTable/DataTableBody.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTableErrorRow.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/types.ts
  - docs/adr/0051-datatable-infinite-scroll-is-a-virtualized-mode-with-an-effect-driven-load-more.md
---
Infinite mode is `onLoadMore` set on a `virtualized`, non-`paginated` table (`loadMoreState` in `rowCounts.ts`); the
decisions are in ADR 0051. What constrains the code:

- `useEndReached.ts` tests the end with the virtualizer's `range.endIndex` (exposed on `RowWindow`), never the last mounted
  item: `useRowWindow`'s `rangeExtractor` adds the pinned focused row, so the last mounted index can be a pinned row far
  from the end. `range.endIndex` excludes overscan, and `range` is `null` while the container has no height (jsdom, SSR), so
  no end-reached call is observable in jsdom; the behaviour is covered in the Chromium project.
- The call comes from an effect and is deduped by `firedRef`, which survives StrictMode's simulated remount. It re-arms when
  `rows.length` changes, when `loadingMore` is seen true, and when `rows` is replaced after `rearm()`. The `rows` array
  identity matters: a consumer that builds a new array every render re-arms on the first commit after a sort click.
- A sort click (`handleSortActivate` in `DataTable.tsx`) calls `scrollToTop()` and `rearm()` only when infinite. The range
  stays reckoned from the old offset until the scroll event after the reset, so `useScrollToTop` in `useRowWindow.ts`
  reports `scrollPending` until `virtualizer.scrollOffset` is 0, and `useEndReached` fires nothing meanwhile. `rearm()`
  alone arms nothing: it waits for new rows, because a short list has its end in view at the top and would otherwise ask
  again for the order being replaced.
- `manualSorting` is `manual || loadMore.infinite`: the table never reorders the loaded rows of an infinite table.
- While `loading`, `renderedRows` is `[]` and the skeleton rows replace the body, so `loadingMore` cannot reuse it; it
  appends skeleton rows after the end spacer and keeps the loaded rows (and the pinned row) mounted. The empty state draws
  only when nothing is loading, `hasMore` is not set and `loadMoreError` is not set.
- `loadMoreError` (any value but `null`/`undefined`) holds the `useEndReached` effect back, because a failed request leaves
  the end in reach and every re-arm would otherwise ask again in a loop. The error row (`DataTableErrorRow.tsx`, drawn
  after the loaded rows by `DataTableBody`, in the empty state's place with no rows) is neither `aria-hidden` nor given an
  `aria-rowindex`, and is never drawn with the skeleton rows: `loadingMore` wins (`drawsErrorRow` in `rowCounts.ts`). Its
  Retry button calls `retry` from `useEndReached`, which sets `firedRef` and starts `onLoadMore` in the same scope.
- `windowedRowCounts` (`rowCounts.ts`) sets `aria-rowcount` to `-1` while `hasMore` and no `totalItems`, to
  `max(total, loaded) + 1` with a known total, and to `loaded + 1` once `hasMore` is false. It overrides a consumer's
  `aria-rowcount` while windowed, as before.
- `onLoadMore` starts inside `Scope.propagate(scopeRef.current, ...)`, the scope held in a ref written in an earlier effect,
  as Dropdown does; `.agents/rules/start-consumer-io-in-the-enclosing-scope.md` requires a jsdom scope test.
- `DataTableProps` is `DataTableOwnProps & DataTableWindowingProps`, whose virtualized arm is `DataTableFiniteProps |
  DataTableInfiniteProps`. `Omit` does not distribute over that union, so code that omits keys from the props uses
  `DataTablePropsOmit<Row, Keys>`.
- Selection ids are keyed by row id, so appended rows are safe; a consumer must supply `getRowId`, because the default id
  is the index and a replaced dataset re-targets it.
