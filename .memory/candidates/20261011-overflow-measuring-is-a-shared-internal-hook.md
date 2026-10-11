---
about: width-based overflow collapse is one shared internal hook plus pure helpers; Dropdown's chip row is its only consumer, observes the row's parent, and measures in place
saw:
  - source/react-ui/packages/ui/src/internal/useOverflowCollapse.ts
  - source/react-ui/packages/ui/src/internal/overflowCollapse.ts
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts
  - source/react-ui/packages/ui/src/vitest.setup.ts
---
`useOverflowCollapse` (`useOverflowCollapse.ts:40`) owns the layout effect, one synchronous `measure()`, a `ResizeObserver`
whose callback is `flushSync(measure)` (`:65-69`) and the hidden-count state. The pure arithmetic is in `overflowCollapse.ts`
(`countFitting` :9, `countHidden` :30, `measureHidden` :63). Dropdown is the only caller (`Dropdown.tsx:958`).

Attribute contract, documented on the hook: `data-collapsing` (nowrap), `data-hidden` (display none), `data-measuring`
(every item back on the row at natural width while the read happens), the row's `column-gap` as the gap, and the indicator
measured as it currently reads. The CSS for these stays in `listbox.stylesheet.ts` (`[data-collapsing]` rules), so a
second consumer has to supply equivalent rules or share that stylesheet, which would need its own `bundle-check/` marker.

The observed box is `row.parentElement`, not the row: the row's width answers its own collapse and would feed back as a
resize. The observed element is not a hook parameter because a function argument has a new identity every render and
trips biome's exhaustive-deps rule. `countHidden` always subtracts one for the indicator, so a consumer must keep its
indicator rendered (hidden or not); with an empty indicator list it under-counts by one.

jsdom's `ResizeObserver` is a no-op stub (`vitest.setup.ts:14`), so the observer wiring is provable only in
`*.browser.test.tsx`; the pure module has jsdom unit tests.
