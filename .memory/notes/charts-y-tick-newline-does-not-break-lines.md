---
name: charts-y-tick-newline-does-not-break-lines
kind: dead-end
description: "A newline in a chart formatY string does not render as a second tick line: Recharts' tick text wraps by the 48px axis width, so use the [value, unit] pair instead."
anchors:
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 487ae38bb687
  - path: source/react-charts/packages/charts/src/internal/YAxisTick/YAxisTick.tsx
    blob: 0813efc58e1e
confidence: suspect
---

The y axis is `width={48}` (`CartesianChartFrame.tsx:125`). The explorer saw `"-3000\nMB/s"` render as
two tspans only because it overflowed 48px, and `"-3\nB"` render on one line as `-3 B`: Recharts' tick
`Text` treats the newline as breaking whitespace, so a break depends on width and font. Not
re-verified here (suspect).

The reliable two-line tick is the `[value, unit]` pair, drawn by a custom tick —
[[charts-two-line-y-tick-geometry]] (`YAxisTick.tsx:36-46`).
