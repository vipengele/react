---
name: charts-annotations-override-recharts-overflow-in-the-frame
kind: gotcha
description: Recharts discards reference lines/areas outside the domain, so the shared frame picks ifOverflow per annotation and clips gaps and markers itself.
anchors:
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 236c02b2295e
confidence: verified
---

Recharts drops a `ReferenceLine`/`ReferenceArea` outside the domain by default (explorer report; the frame's explicit
`ifOverflow` on each is at `CartesianChartFrame.tsx:248`, `:258`, `:269`). The frame therefore sets, per annotation:

- `referenceLines`: `ifOverflow="extendDomain"` (`:258`), so a threshold above the data stays visible and grows the y axis.
- `markers`: filtered to the visible x range with inclusive edges (`:196`), then `"hidden"` (`:269`).
- `gaps`: clamped to the visible x range and dropped when `start >= end` (`:193-195`), then drawn with `"hidden"` (`:248`), so
  float error at a clipped edge cannot drop them.

The visible range (`:192`) is `band.domain` in band mode, else `visibleXRange` (`:25`): the zoom if set, else min/max
numeric x; with no numeric x it is the empty range, so nothing is drawn. See
[[charts-band-axis-pads-by-smallest-gap-and-clips-to-padded-domain]].
A `referenceLines` entry can extend the y domain so the zero line appears on an all-positive chart; see
[[areachart-zero-line-needs-strict-domain-span]].
The bundle consequence is in [[charts-frame-recharts-parts-need-bundle-check-present-markers]].
