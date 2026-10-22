---
name: charts-band-axis-pads-by-smallest-gap-and-clips-to-padded-domain
kind: invariant
description: The frame's band axis pads the x domain by half the smallest non-coincident gap, and in band mode markers and gaps are clipped to that padded domain, not to the data range.
anchors:
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
    blob: 236c02b2295e
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.test.tsx
    blob: 0c933dd103e0
  - path: source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.browser.test.tsx
    blob: 3958be08a345
confidence: verified
---

`bandAxis` (`CartesianChartFrame.tsx:72`) takes the distinct finite x values sorted ascending, uses the smallest gap
that exceeds `COINCIDENT_GAP` (`:63`, 1e-4 of the widest gap; a gap exactly at the threshold is a near-coincidence,
`:83`) as the step, pads the domain by half a step at each end and returns one tick per value; a single value takes a
step of 1. The threshold mirrors how Recharts sizes a bar on a numeric axis, so the padding is at least half a bar and
edge bars are not clipped (`CartesianChartFrame.browser.test.tsx` measures this against the numeric axis, where edge
bars overhang).

In band mode the frame takes the visible x range from `band.domain` rather than `visibleXRange` (`:192`) and passes
`band.domain` as the axis domain (`:231`), so a `marker` or `gap` in the outer half step is drawn and clipped only at
the padded edge; `CartesianChartFrame.test.tsx` pins the threshold boundary and the clipping on each side (explorer
report, test bodies not re-read). Without a finite x value `bandAxis` is null and the frame falls back to
`visibleXRange`, an empty range.
