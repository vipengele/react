---
about: the frame's band axis pads the x domain by half the smallest non-coincident gap, and markers and gaps are clipped to that padded domain
saw:
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.test.tsx
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.browser.test.tsx
---
`bandAxis` in `CartesianChartFrame.tsx` takes the distinct finite x values sorted ascending, uses the smallest gap that exceeds `COINCIDENT_GAP` (1e-4 of the widest gap; a gap exactly at the threshold is a near-coincidence) as the step, pads the domain by half a step at each end and returns one tick per value; a single value takes a step of 1. The threshold mirrors how Recharts sizes a bar on a numeric axis, so the padding is always at least half a bar and edge bars are not clipped (`CartesianChartFrame.browser.test.tsx` measures this against the numeric axis, where edge bars overhang). In band mode the frame treats `zoom` as null and takes the visible x range from `band.domain` rather than `visibleXRange`, so a `marker` or `gap` in the outer half step is drawn and clipped only at the padded edge; `CartesianChartFrame.test.tsx` pins both the threshold boundary and that clipping on each side. Without a finite x value `bandAxis` is null and the frame falls back to `visibleXRange`, an empty range.
