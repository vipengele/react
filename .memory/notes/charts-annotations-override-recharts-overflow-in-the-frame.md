---
name: charts-annotations-override-recharts-overflow-in-the-frame
kind: gotcha
description: Recharts discards reference lines/areas outside the domain, so the shared frame picks ifOverflow per annotation and clips gaps and markers itself.
anchors:
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 07b43b1afe79
confidence: verified
---

Recharts drops a `ReferenceLine`/`ReferenceArea` outside the domain by default
(`CartesianChartFrame.tsx:66-67`, `:71-72`). The frame therefore sets, per annotation:

- `referenceLines`: `ifOverflow="extendDomain"` (`:202`), so a threshold above the data stays visible and grows the y axis.
- `markers`: filtered to `visibleXRange` with inclusive edges (`:140`), then `"hidden"` (`:213`).
- `gaps`: clamped to `visibleXRange` and dropped when `start >= end` (`:137-139`), then drawn with `"hidden"` (`:192`), so float error at a clipped edge cannot drop them.

`visibleXRange` (`:25`) is the zoom if set, else min/max numeric x; with no numeric x it is the empty range, so nothing is drawn.
A `referenceLines` entry can extend the y domain so the zero line appears on an all-positive chart; see [[charts-zero-line-needs-strict-domain-span]].
The bundle consequence is in [[charts-frame-recharts-parts-need-bundle-check-present-markers]].
