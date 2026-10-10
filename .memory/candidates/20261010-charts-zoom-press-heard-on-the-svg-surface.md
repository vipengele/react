---
about: LineChart's zoom press is heard on the chart's whole SVG surface and hit-tested against the plot area, the in-progress drag is keyed on the data array's identity, and the browser tests render a 360px chart
saw:
  - source/react-charts/packages/charts/src/LineChart/LineChart.tsx
  - source/react-charts/packages/charts/src/LineChart/useZoom.ts
  - source/react-charts/packages/charts/src/LineChart/LineChart.browser.test.tsx
---

- `ZoomLayer` in `LineChart.tsx` reaches the chart's `<svg>` through `ownerSVGElement` and listens
  there, then checks the press against the plot area from Recharts' `usePlotArea()`, so a line or
  active dot drawn over the plot cannot swallow the press. Pointer pixels become x values only inside
  that layer (`useXAxisInverseScale()`); nothing Recharts-shaped reaches `onZoomChange`.
- `useZoom` keeps the drag in a ref as well as in state, so a release that arrives before React
  re-renders the last move still reports the full range, and tags the drag with the `data` array it
  started on. A new `data` identity discards the drag, so a parent that rebuilds `data` on every
  render cancels a drag in progress.
- A drag shorter than `MIN_DRAG_PX` (4) or covering no x range fires nothing.
- `LineChart.browser.test.tsx` sets `WIDTH = 360` and dispatches pointer events at points found with
  `document.elementFromPoint`, which only finds the chart for points inside the viewport.
