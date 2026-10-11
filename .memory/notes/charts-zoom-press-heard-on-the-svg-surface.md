---
name: charts-zoom-press-heard-on-the-svg-surface
kind: gotcha
description: The shared zoom layer listens on the chart's whole SVG and hit-tests against the plot area, a drag is discarded when the data array's identity changes, and one pointer owns a drag.
anchors:
  - path: source/react-charts/packages/charts/src/internal/zoom/ZoomLayer.tsx
    blob: e4b48ffb8949
  - path: source/react-charts/packages/charts/src/internal/zoom/useZoom.ts
    blob: 7ce362701a20
  - path: source/react-charts/packages/charts/src/LineChart/LineChart.browser.test.tsx
    blob: 938a0e317dd6
confidence: verified
---

- `ZoomLayer` reaches the `<svg>` through `ownerSVGElement` (`ZoomLayer.tsx:36`) and listens there, then
  checks the press against `usePlotArea()` (`:25`), so a line or dot drawn over the plot cannot swallow it.
  Pointer pixels become x values only here, via `useXAxisInverseScale()` (`:26`).
- `useZoom` tags the drag with the `data` array it began on (`useZoom.ts:63,73,82`). A new `data`
  identity discards it, so a parent that rebuilds `data` every render cancels a drag in progress. The drag is
  also held in `dragRef` (`:50`) so a release before React re-renders still reports the full range.
- The pointer that starts a drag owns it (`owner`, `ZoomLayer.tsx:49,84`); other pointers are ignored
  (`:65,70,82`) until it ends. A drag under `MIN_DRAG_PX` (4, `useZoom.ts:5,76`) fires nothing.
- `LineChart.browser.test.tsx:19` renders at `WIDTH = 360` and finds targets with `elementFromPoint` (`:79`),
  which only locates points inside the viewport.
