---
name: overflow-collapse-hook-contract
kind: gotcha
description: useOverflowCollapse needs the caller to supply data-collapsing, data-hidden and data-measuring styling, observes the row's parent rather than the row, and its ResizeObserver wiring is provable only in browser tests.
anchors:
  - path: source/react-ui/packages/ui/src/internal/useOverflowCollapse.ts
    blob: fc02602cbece
  - path: source/react-ui/packages/ui/src/internal/overflowCollapse.ts
    blob: d776acd9b47d
  - path: source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts
    blob: b7082a9ecf1a
  - path: source/react-ui/packages/ui/src/vitest.setup.ts
    blob: 8d1d8ceb0edd
confidence: verified
---

`useOverflowCollapse` (`useOverflowCollapse.ts:40`) runs one synchronous `measure()` in a layout effect and a
`ResizeObserver` whose callback is `flushSync(measure)` (`:65-70`), so the resized container and the recollapsed row
land in one frame. The arithmetic is pure, in `overflowCollapse.ts` (`countFitting` :9, `countHidden` :30,
`measureHidden` :63). Dropdown's chip row is the only caller (`Dropdown.tsx:958`).

Attribute contract (documented `useOverflowCollapse.ts:22-30`): `data-collapsing` (nowrap), `data-hidden`
(`display: none`), `data-measuring` (set by the hook around one read so every item sits on the row at natural
width), the row's `column-gap` as the gap, and the indicator measured as it currently reads, so it stays rendered.
The CSS lives in `listbox.stylesheet.ts` (`[data-collapsing]` rules, `:259-272`), so a second consumer must supply
equivalent rules or share that stylesheet.

The observed box is `row.parentElement` (`:71`, rationale in the header `:32-34`), not the row: the row's own width answers the collapse the hook
causes, and observing it would feed every collapse back as a resize.

jsdom's `ResizeObserver` is a no-op stub (`vitest.setup.ts:14`), so the observer wiring is provable only in
`*.browser.test.tsx`; the pure module has jsdom unit tests.
