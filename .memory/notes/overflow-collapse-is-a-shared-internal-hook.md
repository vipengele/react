---
name: overflow-collapse-is-a-shared-internal-hook
kind: rationale
description: Width-based overflow collapse is one internal hook plus pure helpers with two consumers, Dropdown's chip row and TopNav; it observes the row's parent, and each consumer supplies its own data-attribute CSS and keeps its indicator rendered.
anchors:
  - path: source/react-ui/packages/ui/src/internal/useOverflowCollapse.ts
    blob: fc02602cbece
  - path: source/react-ui/packages/ui/src/internal/overflowCollapse.ts
    blob: d776acd9b47d
  - path: source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts
    blob: b7082a9ecf1a
  - path: source/react-ui/packages/ui/src/vitest.setup.ts
    blob: 8d1d8ceb0edd
  - path: source/react-ui/packages/ui/src/TopNav/TopNav.tsx
    blob: a234cf8ef7c2
  - path: source/react-ui/packages/ui/src/TopNav/TopNav.stylesheet.ts
    blob: 4603dd0f681e
confidence: verified
---

`useOverflowCollapse` (`useOverflowCollapse.ts:40`) owns the layout effect, one synchronous `measure()`,
a `ResizeObserver` whose callback is `flushSync(measure)` (`:65-69`) and the hidden-count state. The
pure arithmetic is in `overflowCollapse.ts` (`countFitting` :9, `countHidden` :30, `measureHidden`
:63). Dropdown (`Dropdown.tsx:958`) and TopNav (`TopNav.tsx`, in `TopNavImpl`, with `itemSelector`
`.vpg-top-nav-item` and `indicatorSelector` `.vpg-top-nav-overflow`) are the callers. TopNav follows the contract below:
`TopNav.stylesheet.ts` carries its own `data-collapsing`/`data-hidden`/`data-measuring` rules (Inline's stylesheet has
none), the measured `ul` sits inside `.vpg-top-nav-main` (the observed parent, `flex: 1 1 0; min-width: 0`), and the
overflow `<li>` is rendered even when nothing is hidden so `countHidden` can subtract it. Its `measureKey` is a JSON string
of label text, href and `current`, so a non-text label change re-measures only on resize.

The hook documents an attribute contract: `data-collapsing` (nowrap), `data-hidden` (display none),
`data-measuring` (every item back on the row at natural width during the read), the row's `column-gap`
as the gap, and the indicator measured as it currently reads. The CSS for these lives in
`listbox.stylesheet.ts`, so a second consumer must supply equivalent rules or share that stylesheet
(which would need its own `bundle-check/` marker).

The observed box is the row's parent, not the row, because the row's width answers its own collapse and
would feed back as a resize; the element is not a hook parameter because a function argument has a new
identity every render and trips biome's exhaustive-deps rule (explorer's reasoning, not re-checked).
`countHidden` always subtracts one for the indicator, so a consumer must keep its indicator rendered
(hidden or not): with an empty indicator list it under-counts by one.

jsdom's `ResizeObserver` is a no-op stub (`vitest.setup.ts:14`), so the observer wiring is provable only
in `*.browser.test.tsx`; the pure module has jsdom unit tests. See also
[[chip-row-fits-the-control-step-only-at-default-scales]].
