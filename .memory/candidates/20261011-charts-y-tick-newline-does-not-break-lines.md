---
about: a newline in a LineChart or AreaChart formatY result does not render as a second tick line, because Recharts' tick text treats it as breaking whitespace and wraps by the 48px axis width
saw:
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
---

The y axis in `CartesianChartFrame` is `width={48}`. A `formatY` returning `"-3000\nMB/s"` rendered as
two tspans only because it overflowed 48px, and `"-3\nB"` rendered on one line as `-3 B`, so a line
break depends on width and font and is not a usable two-line tick (number, then unit). A reliable one
needs an API decision (a `[value, unit]` pair from `ChartYFormatter`, a unit prop, or an explicit
newline convention honoured by a custom tick); none exists.
