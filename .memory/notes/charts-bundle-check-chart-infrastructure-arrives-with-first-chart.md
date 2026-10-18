---
name: charts-bundle-check-chart-infrastructure-arrives-with-first-chart
kind: gotcha
description: In the charts bundle-check the Recharts store, immer and d3 arrive with any one chart type, so absence is asserted only per chart type (with an all-charts positive control), and a marker must be a string literal, never a bare chart name.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: 239c7c4ac33f
  - path: source/react-charts/packages/charts/bundle-check/entry.js
    blob: "247553702551"
  - path: source/react-charts/packages/charts/bundle-check/entry-area.js
    blob: 864a6ff1a417
  - path: source/react-charts/packages/charts/bundle-check/entry-bar.js
    blob: fa18606516ad
  - path: source/react-charts/packages/charts/bundle-check/entry-charts.js
    blob: 8d0e6a219ca8
confidence: verified
---

Recharts 3 is driven by a Redux store and d3 scales, so any bundle with one working chart carries them
(`bundle-check/run.mjs:106-111`: `recharts-wrapper`, `@@redux/INIT`, `[Immer]`, `invalid format: `, asserted
*present* in all three single-chart bundles: `entry.js` Line, `entry-area.js` Area, `entry-bar.js` StackedBarChart;
`run.mjs:116-156`). A tree-shaking leak therefore shows only as another chart type's marker appearing (each
chart's `*Absent` list holds the other two charts' markers plus `otherChartMarkers`, `run.mjs:117,131,145`), not as
bundle size. `recharts-reference-line` and `recharts-reference-area-rect` are present in all three, see
[[charts-frame-recharts-parts-need-bundle-check-present-markers]]. No container-only bundle is measured; the
container is internal.

A marker must be a string literal a module passes to its elements (`run.mjs:62-65`). The unminified bundle
keeps a `//#region <path>` comment for each bundled file, so a bare name like `PieChart` would match a
path and never fail. `entry-charts.js` imports every chart type (`:7`) and is the positive control: its
`controlled` set (`run.mjs:162`) is the union of the three absent lists, and it must carry every marker asserted
absent anywhere. No `treeshake.moduleSideEffects` rule is needed because nothing asserts an external absent
(contrast [[bundle-check-telemetry-external-needs-sideeffects-rule]]).

Line numbers in `run.mjs` drift; find the checks by symbol (`chartInfrastructureMarkers`, `lineAbsent`,
`areaAbsent`, `barAbsent`, `controlled`). See also [[charts-new-component-registration-checklist]] and
[[charts-api-check-scans-only-reachable-declarations]].
