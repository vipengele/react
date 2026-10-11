---
name: charts-two-line-y-tick-geometry
kind: gotcha
description: A [value, unit] y tick centres on its gridline only through dy offsets of -0.145em and 1em, and PLOT_TOP is 14 so the topmost pair is not clipped by the SVG.
anchors:
  - path: source/react-charts/packages/charts/src/internal/YAxisTick/YAxisTick.tsx
    blob: 0813efc58e1e
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 487ae38bb687
  - path: source/react-charts/packages/charts/src/internal/formatters.ts
    blob: d6ba92f7f041
confidence: verified
---

- Recharts centres a one-line tick by dropping its baseline 0.355em; the pair's value tspan uses
  `VALUE_DY = "-0.145em"` and the unit `UNIT_DY = "1em"` (`YAxisTick.tsx:9-10`, reasoning `:5-8`) so the pair's
  midpoint stays on the gridline.
- A string tick still goes through Recharts' `Text` with class `recharts-cartesian-axis-tick-value`
  (`YAxisTick.tsx:17-20,31-35`); a custom tick otherwise gets extra axis classes, and Recharts reads the tick
  font size from the first element with that class.
- The first y tick sits on the plot's top edge and the pair rises about 6px above it, so `PLOT_TOP = 14`
  (`CartesianChartFrame.tsx:18`, used `:111`); 8 clipped about 4.7px. It applies to every chart.
- A newline in a string tick is not a line break: Recharts wraps by the 48px axis width
  (`CartesianChartFrame.tsx:125`), so use the pair form. The default tooltip value for a pair is
  `"value unit"` (`yTickText`, `formatters.ts:26`).
