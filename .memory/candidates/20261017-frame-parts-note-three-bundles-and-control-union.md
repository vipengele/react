---
about: with three chart types the frame's Reference parts are asserted present in three single-chart bundles, and the all-charts control's union is edited by hand when a chart is added
saw:
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/bundle-check/entry-bar.js
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
targets: charts-frame-recharts-parts-need-bundle-check-present-markers
verdict: now-false
---
The frame (`CartesianChartFrame.tsx:2`) still imports `ReferenceArea` and `ReferenceLine` unconditionally, but `run.mjs` now asserts `recharts-reference-line` and `recharts-reference-area-rect` present in three single-chart bundles (Line-only, Area-only and the `entry-bar.js` StackedBarChart-only bundle), not two. The note's last claim is false: the all-charts control's `controlled` set is `[...lineAbsent, ...areaAbsent, ...barAbsent]`, so a new chart type has to add its own absent list (`barAbsent` is the bar one) to that union by hand, or its markers are never proven present anywhere. The chart's own marker group (`stackedBarChartMarkers`, plus `rechartsBarMarkers` for `recharts-bar-rectangle`, which is no longer part of `otherChartMarkers`) also goes into the other charts' absent lists.
