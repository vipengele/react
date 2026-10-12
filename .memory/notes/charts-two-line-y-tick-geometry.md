---
name: charts-two-line-y-tick-geometry
kind: gotcha
description: A [value, unit] y tick is a custom <text> whose dy offsets centre the pair on its gridline, and the plot's 14px top margin exists so the topmost pair is not clipped by the SVG.
anchors:
  - path: source/react-charts/packages/charts/src/internal/YAxisTick/YAxisTick.tsx
    blob: 0813efc58e1e
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 487ae38bb687
  - path: source/react-charts/packages/charts/src/internal/formatters.ts
    blob: d6ba92f7f041
confidence: verified
---

- Recharts drops a single tick line's baseline 0.355em below the tick (explorer's measurement). The
  pair's value tspan has `dy="-0.145em"` and the unit tspan `dy="1em"` (`YAxisTick.tsx:10-11`,
  `:40-43`), so the two lines sit half a line either side and the pair's midpoint stays on the gridline.
- A string tick still goes through Recharts' `Text` with class `recharts-cartesian-axis-tick-value`
  (`YAxisTick.tsx:17`, `:31`), because a function tick otherwise receives extra axis classes.
- The first y tick sits on the plot's top edge and the pair rises about 6px above it, so `PLOT_TOP` is
  14 (`CartesianChartFrame.tsx:18`, used at `:111`); the explorer found 8 clipped about 4.7px of the
  value line. It applies to every chart, one-line charts included.
- The default tooltip value for a pair is `"value unit"` with one space, from `yTickText`
  (`formatters.ts:26-28`, used at `:67`).

A newline inside a string tick is not a substitute: [[charts-y-tick-newline-does-not-break-lines]].
