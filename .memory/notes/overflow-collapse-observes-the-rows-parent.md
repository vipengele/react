---
name: overflow-collapse-observes-the-rows-parent
kind: gotcha
description: useOverflowCollapse observes row.parentElement not the row and flushSyncs its measure, countHidden is said to reserve one slot for the indicator, and jsdom's ResizeObserver is a no-op.
anchors:
  - path: source/react-ui/packages/ui/src/internal/useOverflowCollapse.ts
    blob: fc02602cbece
  - path: source/react-ui/packages/ui/src/internal/overflowCollapse.ts
    blob: d776acd9b47d
  - path: source/react-ui/packages/ui/src/vitest.setup.ts
    blob: bfbc85972c5a
confidence: suspect
---

- The observer watches `row.parentElement` (`useOverflowCollapse.ts:71`): the row's own width is the answer to
  its collapse and would feed back as a resize. The callback is `flushSync(measure)` (`:65-69`).
- `measureHidden` sets `data-measuring` so every item is at natural width during the read, then removes it in
  the same synchronous call (`overflowCollapse.ts:58-66`), and measures the indicator as it currently
  reads, so a count crossing a digit boundary is a fraction of a character out until the next measure.
- Per the staging note, `countHidden` always subtracts one slot for the indicator, so a consumer must keep it
  rendered (hidden or not). Not re-read.
- `vitest.setup.ts:14` stubs `ResizeObserver` with a no-op, so the observer wiring is provable only in
  `*.browser.test.tsx`.
