---
about: a virtualized DataTable's window depends on a measured body offset, row-id keys, a re-measure order after rowHeight changes, and a focus pin that clears when focus leaves the tbody
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTableBody.tsx
  - source/react-ui/packages/ui/src/DataTable/DataTable.browser.test.tsx
---
- The virtualizer's `scrollMargin` is the body's offset below the caption and header (`useBodyOffset` in `DataTable.tsx`),
  read in a layout effect and re-read through a `ResizeObserver` on `<thead>` and `<caption>`, each read in `flushSync`.
  Without it the window drifts by the header's height; without the flush it lands a frame after the resize.
- `getItemKey` returns the row id, so a measured height follows its row through a sort. It depends on
  `table.getRowModel().rows` keeping its identity between renders; a fresh array every render would lay every row out
  again each time.
- A new `rowHeight` needs `measure()`, then a `getVirtualItems()` read, then `measureElement` on each mounted row
  (`:scope > [data-index]`). `measure()` re-reckons lazily and a measurement equal to the stale size changes nothing, so
  skipping the read or the loop leaves the window reckoned at the wrong height. Mounted rows raise no resize of their own.
- The focused row is pinned by id: `DataTableBody`'s tbody `onFocus` maps the target to its row's `data-index`, and
  `onBlur` clears the pin only when `relatedTarget` is outside the tbody; clearing first would let the window unmount the
  row between focusout and focusin. Focus in a portalled element (a row-action menu) is outside the tbody, so it clears
  the pin. A row removed without a blur leaves a stale id, which costs one extra mounted row if it is drawn again.
- No rows mount until the scroll container has a height, so jsdom and server markup hold one spacer and no rows. The
  window can only be asserted in the Chromium project; the gap-spacer branch of `DataTableBody` is reached only with a
  pinned row away from the window.
- After a column resize the rows reflow at once but the bottom spacer and window follow a frame later: react-virtual's
  resize path re-renders without `flushSync`.
