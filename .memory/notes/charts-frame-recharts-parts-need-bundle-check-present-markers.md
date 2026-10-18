---
name: charts-frame-recharts-parts-need-bundle-check-present-markers
kind: gotcha
description: All three single-chart bundles assert ReferenceLine and ReferenceArea present because the shared frame draws them; a new frame-drawn Recharts part needs a marker in every present list, and a new chart type must add its absent list to the all-charts control's union by hand.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: 239c7c4ac33f
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 236c02b2295e
confidence: verified
---

The shared frame (`CartesianChartFrame.tsx:2` imports `ReferenceArea` and `ReferenceLine` unconditionally) draws them
for `referenceLines`, `markers` and `gaps`, so `bundle-check/run.mjs` lists `recharts-reference-line` and
`recharts-reference-area-rect` (`:88-89`) in the `present` list of the LineChart (`:123-124`), AreaChart (`:137-138`)
and StackedBarChart (`:151-152`) bundles. Other chart types are asserted absent (`lineAbsent`, `areaAbsent`,
`barAbsent`).

A new Recharts part drawn by the frame needs a string-literal marker (a class name the module emits, never a bare
identifier, since `//#region` comments would match) added to every `present` list by hand.

The all-charts control is not derived automatically: `controlled` is `[...lineAbsent, ...areaAbsent, ...barAbsent]`
(`run.mjs:162`), so a new chart type must add its own absent list to that union by hand, or its markers are never
proven present anywhere. Its own marker group (`stackedBarChartMarkers`, plus `rechartsBarMarkers` for
`recharts-bar-rectangle`) must also go into the other charts' absent lists (`run.mjs:117,131`).
