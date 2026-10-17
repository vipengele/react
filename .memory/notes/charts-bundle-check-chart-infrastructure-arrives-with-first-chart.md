---
name: charts-bundle-check-chart-infrastructure-arrives-with-first-chart
kind: gotcha
description: In the charts bundle-check the Recharts store, immer and d3 arrive with the first chart type, so absence is asserted only per chart type, and a marker must be a string literal, never a bare chart name.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: afcdf3ea3b2f
  - path: source/react-charts/packages/charts/bundle-check/entry.js
    blob: "247553702551"
  - path: source/react-charts/packages/charts/bundle-check/entry-area.js
    blob: 864a6ff1a417
  - path: source/react-charts/packages/charts/bundle-check/entry-charts.js
    blob: 8b54c17f03f6
confidence: verified
---

Recharts 3 is driven by a Redux store and d3 scales, so any bundle with one working chart carries them
(`bundle-check/run.mjs:98-106`: `recharts-wrapper`, `@@redux/INIT`, `[Immer]`, `invalid format: `, asserted
*present* in the single-chart bundles). A tree-shaking leak therefore shows only as another chart type's
marker appearing (`run.mjs:108-125`: Line and Area absent from each other, `recharts-reference-line` absent
from the LineChart bundle), not as bundle size. No container-only bundle is measured; the container is
internal.

A marker must be a string literal a module passes to its elements (`run.mjs:61-64`). The unminified bundle
keeps a `//#region <path>` comment for each bundled file, so a bare name like `PieChart` would match a
path and never fail. `entry-charts.js` imports every chart type and is the positive control for every
marker asserted absent elsewhere.

Line numbers in `run.mjs` drift; find the checks by symbol (`chartInfrastructureMarkers`, `lineAbsent`, `areaAbsent`,
`controlled`). Re-checked: the infrastructure markers are still asserted present in single-chart bundles and
`entry-charts.js` is still the positive control. See also [[charts-new-component-registration-checklist]] and
[[charts-api-check-scans-only-reachable-declarations]].
