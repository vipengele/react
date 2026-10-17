---
about: the store, immer and d3 still arrive with any one chart, absence is still asserted per chart type, and a marker is still a string literal, now across three chart types
saw:
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/bundle-check/entry-bar.js
  - source/react-charts/packages/charts/bundle-check/entry-charts.js
targets: charts-bundle-check-chart-infrastructure-arrives-with-first-chart
verdict: still-true
---
`chartInfrastructureMarkers` (`recharts-wrapper`, `@@redux/INIT`, `[Immer]`, `invalid format: `) are asserted present in all three single-chart bundles (`entry.js`, `entry-area.js`, `entry-bar.js`), and a leak shows only as another chart type's marker appearing, never as bundle size. `entry-charts.js` still imports every chart and is the positive control. The note's anchors name only Line and Area; `entry-bar.js` is a third single-chart entry.
