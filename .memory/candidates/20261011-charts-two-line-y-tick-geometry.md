---
about: a [value, unit] y tick is drawn by a custom tick whose dy offsets centre it on its gridline, and the plot's top margin is 14px so the topmost pair is not clipped by the SVG
saw:
  - source/react-charts/packages/charts/src/internal/YAxisTick/YAxisTick.tsx
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
---

- Recharts drops a single tick line's baseline 0.355em below the tick. The pair's value tspan has
  `dy="-0.145em"` and the unit tspan `dy="1em"`, so the two lines sit half a line either side of that
  and the pair's midpoint stays on the gridline (Chromium test, within 1px).
- A string tick still goes through Recharts' `Text` with the class
  `recharts-cartesian-axis-tick-value` (a function tick otherwise receives extra axis classes), and a
  test compares its markup with the default tick's.
- The first y tick sits on the plot's top edge and the pair rises about 6px above it, so
  `PLOT_TOP` is 14 (8 clipped about 4.7px of the value line). It applies to every chart, one-line
  charts included.
- The default tooltip value for a pair is `"value unit"` (one space), defined in `yTickText` in
  `formatters.ts`; `formatTooltipValue` still returns a string.
