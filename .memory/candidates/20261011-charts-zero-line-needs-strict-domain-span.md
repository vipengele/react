---
about: AreaChart's zero line is drawn only when the visible y-domain strictly spans zero, because Recharts' default y domain [0, auto] puts zero exactly on an edge for all-positive or all-negative data
saw:
  - source/react-charts/packages/charts/src/AreaChart/AreaChart.tsx
  - source/react-charts/packages/charts/src/AreaChart/AreaChart.test.tsx
---

- `ZeroLine` reads the axis domain with `useYAxisDomain()` and draws `ReferenceLine y={0}` only when
  `min < 0 && max > 0`. With every value at or above zero the domain starts at exactly 0, and with
  every value at or below zero it ends at exactly 0, so a non-strict test would draw a line over the x
  axis or along the top that marks nothing.
- The domain is that of the zoomed rows the frame passes in, so the line appears and disappears as
  `zoom` changes; the y domain is not pinned, so mixed-sign data spans both signs.
- Fills are inline attributes: `fill={`oklch(from var(--vpg-chart-N) l c h / 0.2)`}` with
  `fillOpacity={1}` (Recharts' default fill opacity is 0.6). A Chromium test resolves the attribute in
  both colour modes.
