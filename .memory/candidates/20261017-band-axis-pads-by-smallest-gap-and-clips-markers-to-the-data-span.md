---
about: the frame's band axis pads the x domain by half the smallest non-coincident gap, but markers and gaps are still clipped to the first-to-last x value
saw:
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.browser.test.tsx
---
`bandAxis` in `CartesianChartFrame.tsx` takes the distinct finite x values sorted ascending, uses the smallest gap that exceeds `COINCIDENT_GAP` (1e-4 of the widest gap) as the step, pads the domain by half a step at each end and returns one tick per value; a single value takes a step of 1. The threshold mirrors how Recharts sizes a bar on a numeric axis, so the padding is always at least half a bar and edge bars are not clipped (`CartesianChartFrame.browser.test.tsx` measures this against the numeric axis, where edge bars overhang). In band mode the frame treats `zoom` as null, so `visibleXRange` returns the data's own minimum and maximum: a `marker` in the outer half step is not drawn and a `gap` there is cut short, although the axis extends past it. No test pins that clipping.
