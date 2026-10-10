---
about: in Recharts 3.10.1 the Redux store, immer and d3 arrive with the first chart component (a LineChart bundle is ~1 MB unminified), so a chart-type absence marker is the way to tell a tree-shaking leak from the expected cost
saw:
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/bundle-check/entry.js
  - source/react-charts/packages/charts/bundle-check/entry-charts.js
  - docs/adr/0027-charts-are-their-own-project.md
---

Measured with vite (rolldown), Recharts bundled rather than external, unminified.

- `entry.js` imports `LineChart` from `dist`: 998,081 bytes (the chart, its internal container,
  `ResponsiveContainer`, `Line`, `@reduxjs/toolkit`, `immer`, `reselect`,
  `use-sync-external-store` and the d3 modules via `victory-vendor`). `entry-charts.js` adds every
  other Recharts chart type: 1,342,448 bytes.
- `run.mjs` asserts the container, `ResponsiveContainer`, the Line markers and the store, immer and
  d3 markers (`recharts-wrapper`, `@@redux/INIT`, `[Immer]`, `invalid format: `) are present in the
  `LineChart` bundle, and that the class-name marker of every other chart type (`recharts-pie-sector`,
  `recharts-area-dots`, ...) is absent, with `entry-charts.js` as the positive control carrying every
  absent marker. A marker must be a string literal, never a bare chart name: vite's unminified output
  keeps a `//#region <path>` comment per bundled file, and those paths contain `PieChart.js` and
  `redux@5.0.1`.
- No bundle importing only the container is measured: the container is internal, so a consumer cannot
  import it alone.
- No `treeshake.moduleSideEffects` rule is needed because nothing asserts an external absent.
