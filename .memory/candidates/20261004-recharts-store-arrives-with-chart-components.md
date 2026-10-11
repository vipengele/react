---
about: in Recharts 3.10.1 the Redux store, immer and d3 arrive with the first chart component (a LineChart-only or AreaChart-only bundle is ~1 MB unminified), so a chart-type absence marker is the way to tell a tree-shaking leak from the expected cost
saw:
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/bundle-check/entry.js
  - source/react-charts/packages/charts/bundle-check/entry-area.js
  - source/react-charts/packages/charts/bundle-check/entry-charts.js
  - docs/adr/0027-charts-are-their-own-project.md
---

Measured with vite (rolldown), Recharts bundled rather than external, unminified.

- `entry.js` imports `LineChart` from `dist`: 999,266 bytes (the chart, its internal container,
  `ResponsiveContainer`, `Line`, `@reduxjs/toolkit`, `immer`, `reselect`,
  `use-sync-external-store` and the d3 modules via `victory-vendor`). `entry-area.js` imports
  `AreaChart`: 1,014,652 bytes (`Area` and `ReferenceLine` in place of `Line`). `entry-charts.js`
  imports both plus every other chart type: 1,356,618 bytes.
- The byte counts depend on the working directory the script runs from: `node bundle-check/run.mjs`
  from `packages/charts` (which is what `pnpm test` does) prints the figures above, and the same
  script run from `source/react-charts` as `node packages/charts/bundle-check/run.mjs` prints about
  2 KB less for each bundle. Quote the `pnpm test` figures.
- `run.mjs` asserts, per entry, its own chart's markers and the store, immer and d3 markers
  (`recharts-wrapper`, `@@redux/INIT`, `[Immer]`, `invalid format: `) present, and every other chart
  type's class-name marker (`recharts-pie-sector`, ...) absent: Line and Area are absent from each
  other's bundle, and `recharts-reference-line` is absent from the LineChart bundle. `entry-charts.js`
  is the positive control and must carry every marker asserted absent anywhere (18). A marker must be a string literal, never a bare chart name: vite's unminified output
  keeps a `//#region <path>` comment per bundled file, and those paths contain `PieChart.js` and
  `redux@5.0.1`.
- No bundle importing only the container is measured: the container is internal, so a consumer cannot
  import it alone.
- No `treeshake.moduleSideEffects` rule is needed because nothing asserts an external absent.
