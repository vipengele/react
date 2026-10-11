---
name: charts-zoom-press-heard-on-the-svg-surface
kind: gotcha
description: The shared zoom layer hears presses on the chart's whole SVG and hit-tests them against the plot area, keys a drag on the data array's identity, and lets only the pointer that started a drag own it.
anchors:
  - path: source/react-charts/packages/charts/src/internal/zoom/ZoomLayer.tsx
    blob: e4b48ffb8949
  - path: source/react-charts/packages/charts/src/internal/zoom/useZoom.ts
    blob: 7ce362701a20
  - path: source/react-charts/packages/charts/src/LineChart/LineChart.browser.test.tsx
    blob: 938a0e317dd6
confidence: verified
---

- `ZoomLayer` reaches the chart's `<svg>` through `ownerSVGElement` (`ZoomLayer.tsx:36`) and listens
  there, then checks the press against Recharts' `usePlotArea()` (`:25`, `inPlot` `:38-45`), so a line
  or active dot drawn over the plot cannot swallow the press. Pointer pixels become x values only in
  this layer (`useXAxisInverseScale()`, `:26`); nothing Recharts-shaped reaches `onZoomChange`.
- `useZoom` keeps the drag in a ref as well as state (`useZoom.ts:50`), so a release arriving before
  React re-renders the last move still reports the full range, and tags the drag with the `data` array
  it started on (`:15`, `:73`). A new `data` identity discards the drag, so a parent that rebuilds
  `data` on every render cancels a drag in progress.
- The pointer whose press starts a drag owns it (`owner`, `ZoomLayer.tsx:49`): other pointers' move,
  release and cancel are ignored (`:62-70`) until `stop()` clears the owner (`:50-55`); a press from the
  owner itself re-anchors (`:82`), so a release the window never heard cannot leave the chart refusing
  later presses.
- A drag shorter than `MIN_DRAG_PX` (4, `useZoom.ts:5`, check `:76`) or covering no x range fires nothing.
- `LineChart.browser.test.tsx` sets `WIDTH = 360` (`:19`) and dispatches pointer events at points found
  with `document.elementFromPoint` (`:79`), which only finds the chart for points inside the viewport.
