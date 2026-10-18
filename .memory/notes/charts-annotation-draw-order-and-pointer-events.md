---
name: charts-annotation-draw-order-and-pointer-events
kind: gotcha
description: Gaps render before chart children, reference lines and markers after, ZoomLayer last; annotation classes are pointer-events none so zoom drags pass through.
anchors:
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 236c02b2295e
  - path: source/react-charts/packages/charts/src/internal/chartStylesheet.ts
    blob: 19a59c7d482b
confidence: suspect
---

JSX order in the frame: gaps (`CartesianChartFrame.tsx:243`), `{children}` (`:253`), reference lines (`:254`), markers
(`:265`), then `ZoomLayer` last (`:278`, not rendered in band mode). Keep that order.
Suspect: the explorer reported that Recharts layers elements by z-index (ReferenceArea shares Area's layer, lines sit
higher) rather than JSX order alone; not verified here, so check before reordering.

`.vpg-chart-gap`, `-marker`, `-reference-line` and their `-label` classes set `pointer-events: none`
(`chartStylesheet.ts:43`, `:57`, `:71`) so a zoom drag passes through them. Labels take `fill` through a class because
(reported, unverified) Recharts label text does not inherit `currentColor` for `fill`.
