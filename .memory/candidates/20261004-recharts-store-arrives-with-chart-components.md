---
about: in Recharts 3.10.1 a consumer importing only ResponsiveContainer bundles ~23 KB; the Redux store, immer and d3 arrive with the first chart component, so a chart-type absence marker is the way to tell a tree-shaking leak from the expected cost
saw:
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/bundle-check/entry.js
  - source/react-charts/packages/charts/bundle-check/entry-charts.js
  - docs/adr/0027-charts-are-their-own-project.md
---

Measured with vite (rolldown), Recharts bundled rather than external, unminified.

- `entry.js` imports only `ThemedChartContainer`: 22,905 bytes (clsx, `ResponsiveContainer` and its
  utils, es-toolkit `debounce`/`throttle`, the package's `dist`). No Redux, immer, reselect or d3.
- One chart type with the container is roughly 590-745 KB; every chart type together is about
  1.17 MB (`entry-charts.js`). Every single-chart bundle pulls in `@reduxjs/toolkit`, `immer`,
  `reselect`, `use-sync-external-store` and the d3 modules via `victory-vendor`.
- `run.mjs` asserts class-name markers for each chart type (`recharts-pie-sector`,
  `recharts-line-curve`, ...) plus `recharts-wrapper`, `@@redux/INIT`, `[Immer]` and
  `invalid format: ` are absent, and that `entry-charts.js` carries every one (the positive
  control). A marker must be a string literal, never a bare chart name: vite's unminified output
  keeps a `//#region <path>` comment per bundled file, and those paths contain `PieChart.js` and
  `redux@5.0.1`.
- No `treeshake.moduleSideEffects` rule is needed because nothing asserts an external absent.
