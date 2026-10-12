---
name: charts-bundle-check-store-arrives-with-first-chart
kind: gotcha
description: In the charts bundle-check the Redux store, immer and d3 come with any single chart, so only per-chart-type absence markers (with an all-charts positive control) can tell a tree-shaking leak from the expected cost.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: afcdf3ea3b2f
  - path: source/react-charts/packages/charts/bundle-check/entry-charts.js
    blob: 8b54c17f03f6
  - path: source/react-charts/packages/charts/bundle-check/entry.js
    blob: "247553702551"
  - path: source/react-charts/packages/charts/bundle-check/entry-area.js
    blob: 864a6ff1a417
confidence: verified
---

Recharts 3 charts are driven by a Redux store and draw through d3, so the store, immer and d3 arrive
with the first chart type (`run.mjs:103` lists `recharts-wrapper`, `@@redux/INIT`, `[Immer]` and
`invalid format: `, asserted present in every single-chart bundle). The explorer measured a
LineChart-only or AreaChart-only bundle at about 1 MB unminified (Recharts bundled, not external —
`run.mjs:40`; sizes not re-measured), so size alone never shows a leak; only what is *absent* does.

- Line and Area are asserted absent from each other's bundle, and every other chart type's class-name
  marker (`recharts-pie-sector`, ...) from both (`run.mjs:86`, `:113`). `recharts-reference-line` is
  absent from the LineChart bundle.
- `entry-charts.js` is the positive control (`run.mjs:135`): it imports both charts plus every
  other Recharts chart type, so each marker asserted absent anywhere (18) appears there.
- A marker must be a string literal such as a class name, never a bare chart name: the unminified
  bundle keeps a `//#region <path>` comment per file, and those paths contain `PieChart.js` and the
  like (`run.mjs:61-64`).
- No container-only bundle is measured: the container is internal, so a consumer cannot import it
  alone. No `treeshake.moduleSideEffects` rule is needed because nothing asserts an external absent
  (contrast [[bundle-check-telemetry-external-needs-sideeffects-rule]]).
