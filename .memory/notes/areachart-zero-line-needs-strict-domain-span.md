---
name: areachart-zero-line-needs-strict-domain-span
kind: gotcha
description: AreaChart draws its zero line only when the visible y domain strictly spans zero, because Recharts' default domain puts zero exactly on an edge for all-positive or all-negative data.
anchors:
  - path: source/react-charts/packages/charts/src/AreaChart/AreaChart.tsx
    blob: 4ba6afc54ed1
  - path: source/react-charts/packages/charts/src/AreaChart/AreaChart.test.tsx
    blob: ae5e55c0d4d9
confidence: verified
---

- `ZeroLine` reads the axis domain with `useYAxisDomain()` and returns null unless
  `min < 0 && max > 0` (`AreaChart.tsx:38-41`). With every value at or above zero the domain starts
  at exactly 0, and with every value at or below zero it ends there, so a non-strict test would draw a
  line over the x axis or along the top that marks nothing.
- The domain is that of the zoomed rows the frame passes in, so the line appears and disappears as
  `zoom` changes; the y domain is not pinned, so mixed-sign data spans both signs.
- Fills are inline attributes, `fill={`oklch(from ${color} l c h / ${FILL_ALPHA})`}` with
  `fillOpacity={1}` (`AreaChart.tsx:78-79`, `FILL_ALPHA = 0.2` at `:31`), because Recharts' default
  fill opacity is 0.6.
