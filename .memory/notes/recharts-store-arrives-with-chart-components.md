---
name: recharts-store-arrives-with-chart-components
kind: rationale
description: In Recharts 3 the Redux store, immer and d3 arrive with the first chart type, so the charts bundle-check asserts chart-type absence markers rather than a small size.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: afcdf3ea3b2f
  - path: source/react-charts/packages/charts/bundle-check/entry.js
    blob: "247553702551"
  - path: source/react-charts/packages/charts/bundle-check/entry-area.js
    blob: 864a6ff1a417
  - path: source/react-charts/packages/charts/bundle-check/entry-charts.js
    blob: 8b54c17f03f6
confidence: suspect
---

`bundle-check/run.mjs:98-108` requires the store and d3 markers (`recharts-wrapper`, `@@redux/INIT`, `[Immer]`,
`invalid format: `) in every single-chart bundle, so a bundle without them is not a working Recharts chart. Tree
shaking is instead checked by absence: LineChart's bundle must lack Area, ReferenceLine and the other chart types'
class-name markers, AreaChart's must lack Line and the others (`:110-128`). `entry-charts.js` is the positive
control and must carry every marker asserted absent anywhere (`:130-135`).

A marker must be a string literal, never a bare chart name: the unminified bundle keeps a `//#region <path>`
comment per bundled file, and those paths contain names such as `PieChart.js` (`run.mjs:61-64`).

Suspect: the explorer measured about 1 MB unminified for a LineChart-only or AreaChart-only bundle and about 1.36 MB
for the all-charts one (Recharts 3.10.1, `package.json:37`), and that the figure shifts by about 2 KB with the
working directory the script runs from. Neither was re-measured here; `pnpm test` runs it from `packages/charts`
(`package.json:33`).
