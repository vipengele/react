---
name: datatable-infinite-scroll-end-reached-constraints
kind: gotcha
description: DataTable infinite scroll fires onLoadMore from an effect keyed on the virtualizer's range.endIndex, with a scroll-pending hold, re-arm rules, an error-row hold and an unknown-total aria-rowcount; none of it is observable in jsdom.
anchors:
  - path: source/react-ui/packages/ui/src/DataTable/useEndReached.ts
    blob: 4b8e7904ea89
  - path: source/react-ui/packages/ui/src/DataTable/useRowWindow.ts
    blob: a29a15d63d60
  - path: source/react-ui/packages/ui/src/DataTable/rowCounts.ts
    blob: bfc673cc8bf1
  - path: source/react-ui/packages/ui/src/DataTable/DataTableBody.tsx
    blob: ad725d51f585
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
    blob: 7315ea2c1173
  - path: docs/adr/0051-datatable-infinite-scroll-is-a-virtualized-mode-with-an-effect-driven-load-more.md
    blob: 408f15f513fa
confidence: suspect
---

Infinite mode is `onLoadMore` on a `virtualized`, non-`paginated` table (`loadMoreState` in `rowCounts.ts`); decisions are in
ADR 0051. What constrains the code:

- `useEndReached.ts` tests the end with the virtualizer's `range.endIndex` (exposed on `RowWindow`), never the last mounted item:
  `useRowWindow`'s `rangeExtractor` adds the pinned focused row, so the last mounted index can be a pinned row far from the end.
  `range` is `null` while the container has no height (jsdom, SSR), so no end-reached call is observable in jsdom; it is covered in
  the Chromium project.
- The call comes from an effect deduped by `firedRef`, which survives StrictMode's simulated remount. It re-arms when `rows.length`
  changes, when `loadingMore` is seen true, and when `rows` is replaced after `rearm()`. `rows` identity matters: a consumer that
  builds a new array every render re-arms on the first commit after a sort click.
- A sort click (`handleSortActivate` in `DataTable.tsx`) calls `scrollToTop()` and `rearm()` only when infinite. The range stays
  reckoned from the old offset until the scroll event after the reset, so `useScrollToTop` in `useRowWindow.ts` reports
  `scrollPending` until `virtualizer.scrollOffset` is 0 and `useEndReached` fires nothing meanwhile. `rearm()` alone arms nothing: it
  waits for new rows, because a short list has its end in view at the top and would otherwise ask again for the order being replaced.
- `manualSorting` is `manual || loadMore.infinite`: the table never reorders the loaded rows of an infinite table.
- While `loading`, `renderedRows` is `[]` and skeleton rows replace the body, so `loadingMore` cannot reuse it; it appends skeleton
  rows after the end spacer and keeps the loaded (and pinned) rows mounted.
- `loadMoreError` (anything but `null`/`undefined`) holds the effect back, because a failed request leaves the end in reach and every
  re-arm would otherwise ask again in a loop. The error row (`DataTableErrorRow.tsx`, drawn by `DataTableBody`) is neither
  `aria-hidden` nor given an `aria-rowindex`, and `loadingMore` wins over it (`drawsErrorRow` in `rowCounts.ts`). Its Retry button
  calls `retry` from `useEndReached`.
- `windowedRowCounts` (`rowCounts.ts`) sets `aria-rowcount` to `-1` while `hasMore` and no `totalItems`, to `max(total, loaded) + 1`
  with a known total, and to `loaded + 1` once `hasMore` is false; it overrides a consumer's `aria-rowcount` while windowed.
- `onLoadMore` starts inside `Scope.propagate(scopeRef.current, ...)`, as Dropdown does (see
  [[scope-is-lost-after-native-await-in-browser]]).
- `DataTableProps` is `DataTableOwnProps & DataTableWindowingProps`, whose virtualized arm is a union, and `Omit` does not
  distribute over a union, so code omitting keys uses `DataTablePropsOmit<Row, Keys>`.
- Selection ids are keyed by row id, so appended rows are safe; the default id is the index, so a consumer must supply `getRowId`.
