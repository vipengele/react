---
about: "charts annotations (gaps, markers, referenceLines) are Recharts ReferenceArea/ReferenceLine in the shared frame; Recharts orders by z-index layer not JSX order, and discards out-of-domain elements by default, so the frame clips and overrides ifOverflow itself"
saw:
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
  - source/react-charts/packages/charts/src/internal/chartStylesheet.ts
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/src/LineChart/LineChart.browser.test.tsx
---

Read from the implementation and its tests, not from a note.

- Overflow: Recharts discards a `ReferenceLine`/`ReferenceArea` outside the domain by default. The frame
  deliberately overrides it: `referenceLines` use `ifOverflow="extendDomain"` (a threshold above the data stays
  visible and grows the y axis), `markers` use `"hidden"` after filtering to `visibleXRange` (inclusive edges),
  and `gaps` are clipped to `visibleXRange` by the frame and dropped when `start >= end`, then drawn with
  `"hidden"` so float error at a clipped edge cannot drop them (`CartesianChartFrame.tsx`, `visibleXRange`).
- Z-order: Recharts layers elements by z-index (ReferenceArea shares `Area`'s layer 100, lines sit at 400, labels
  at 2000), so JSX order alone does not decide it. Gaps are placed before `{children}`; reference lines and
  markers after; `ZoomLayer` must stay the last child of the root.
- A `referenceLines` entry can extend the y domain so `ZeroLine` (which reads `useYAxisDomain()` and needs a
  strict span) appears on an all-positive/negative chart; it does not suppress or replace the zero line.
- Annotation classes (`vpg-chart-gap`, `-marker`, `-reference-line` and their `-label`) set
  `pointer-events: none` in `chartStylesheet.ts` so a zoom drag passes through; labels take `fill` through a class
  because Recharts label text does not inherit `currentColor` for `fill`.
- Three existing notes say the LineChart bundle carries no `ReferenceLine`
  (`charts-bundle-check-chart-infrastructure-arrives-with-first-chart`,
  `charts-bundle-check-store-arrives-with-first-chart`, `recharts-store-arrives-with-chart-components`): that is
  no longer true, since the shared frame draws `ReferenceLine`/`ReferenceArea` for both charts
  (`bundle-check/run.mjs`).
