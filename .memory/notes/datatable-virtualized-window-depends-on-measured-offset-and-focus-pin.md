---
name: datatable-virtualized-window-depends-on-measured-offset-and-focus-pin
kind: gotcha
description: A virtualized DataTable's window depends on a measured body offset, row-id item keys, a measure-read-remeasure order after rowHeight changes, and a focus pin that clears only when focus leaves the tbody.
anchors:
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
    blob: 7315ea2c1173
  - path: source/react-ui/packages/ui/src/DataTable/DataTableBody.tsx
    blob: ad725d51f585
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.browser.test.tsx
    blob: 21f33e085ef2
confidence: suspect
---

- The virtualizer's `scrollMargin` is the body's offset below the caption and header (`useBodyOffset` in `DataTable.tsx`), read in
  a layout effect and re-read through a `ResizeObserver` on `<thead>` and `<caption>`, each read in `flushSync`. Without it the
  window drifts by the header height; without the flush it lands a frame after the resize.
- `getItemKey` returns the row id, so a measured height follows its row through a sort. It relies on
  `table.getRowModel().rows` keeping its identity between renders; a fresh array every render would lay every row out again.
- A new `rowHeight` needs `measure()`, then a `getVirtualItems()` read, then `measureElement` on each mounted row
  (`:scope > [data-index]`). `measure()` re-reckons lazily and a measurement equal to the stale size changes nothing, so skipping the
  read or the loop leaves the window reckoned at the wrong height; mounted rows raise no resize of their own.
- The focused row is pinned by id: `DataTableBody`'s tbody `onFocus` maps the target to its row's `data-index`, and `onBlur` clears
  the pin only when `relatedTarget` is outside the tbody; clearing first would let the window unmount the row between focusout and
  focusin. Focus in a portalled element (a row-action menu) is outside the tbody, so it clears the pin. A row removed without a blur
  leaves a stale id, costing one extra mounted row if it is drawn again.
- No rows mount until the scroll container has a height, so jsdom and server markup hold one spacer and no rows; the window is
  assertable only in the Chromium project. After a column resize the rows reflow at once but the bottom spacer and window follow a
  frame later, because react-virtual's resize path re-renders without `flushSync`.
