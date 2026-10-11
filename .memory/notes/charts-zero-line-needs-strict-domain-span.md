---
name: charts-zero-line-needs-strict-domain-span
kind: gotcha
description: AreaChart draws its zero line only when the visible y domain strictly spans zero, because Recharts' default domain puts zero exactly on an edge for all-positive or all-negative data.
anchors:
  - path: source/react-charts/packages/charts/src/AreaChart/AreaChart.tsx
    blob: 4ba6afc54ed1
  - path: source/react-charts/packages/charts/src/AreaChart/AreaChart.test.tsx
    blob: ae5e55c0d4d9
confidence: verified
---

`ZeroLine` reads `useYAxisDomain()` and renders `ReferenceLine y={0}` only when `min < 0 && max > 0`
(`AreaChart.tsx:39-40`). For all-non-negative data the domain starts at exactly 0 and for all-non-positive it
ends at exactly 0, so a non-strict test would draw a line over the x axis or along the top that marks
nothing. The domain is that of the zoomed rows, so the line appears and disappears as `zoom` changes.

Fills are inline attributes, `oklch(from ${color} l c h / ${FILL_ALPHA})` with `fillOpacity={1}`
(`AreaChart.tsx:78-79`), because Recharts' default fill opacity is 0.6.
