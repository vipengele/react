---
name: charts-annotation-draw-order-and-pointer-events
kind: gotcha
description: Gaps render before chart children, reference lines and markers after, ZoomLayer last; annotation classes are pointer-events none so zoom drags pass through.
anchors:
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 07b43b1afe79
  - path: source/react-charts/packages/charts/src/internal/chartStylesheet.ts
    blob: 19a59c7d482b
confidence: suspect
---

JSX order in the frame: gaps (`CartesianChartFrame.tsx:187`), `{children}` (`:197`), reference lines (`:198`), markers (`:209`), then `ZoomLayer` last (`:222`). Keep that order.
Suspect: the explorer reported that Recharts layers elements by z-index (ReferenceArea shares Area's layer, lines sit higher) rather than JSX order alone; not verified here, so check before reordering.

`.vpg-chart-gap`, `-marker`, `-reference-line` and their `-label` classes set `pointer-events: none` (`chartStylesheet.ts:41-43`, `:55-57`, `:69-71`) so a zoom drag passes through them. Labels take `fill` through a class because (reported, unverified) Recharts label text does not inherit `currentColor` for `fill`.
