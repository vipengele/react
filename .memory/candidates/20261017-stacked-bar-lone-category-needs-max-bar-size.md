---
about: StackedBarChart sets maxBarSize because Recharts draws no bar at all for a single category, and a zero or null value draws no segment
saw:
  - source/react-charts/packages/charts/src/StackedBarChart/StackedBarChart.tsx
  - source/react-charts/packages/charts/src/StackedBarChart/StackedBarChart.browser.test.tsx
  - source/react-charts/packages/charts/src/StackedBarChart/StackedBarChart.test.tsx
---
With fewer than two category ticks, Recharts 3.10.1 has no neighbour to size a bar's slot from and falls back to `maxBarSize`, and to 0 when that is unset, so a lone category draws no rectangle. `StackedBarChart.tsx` sets `MAX_BAR_SIZE = 48` on every `Bar`; a lone bar then measures about 38px (its slot less the default category gap) and is centred, and bars narrow below the cap as categories crowd the plot (`StackedBarChart.browser.test.tsx`). In the jsdom tests (`StackedBarChart.test.tsx`), a `null`, a missing value and a `0` each draw no `.recharts-bar-rectangle` (a zero has no height), and a category where every series is null or zero draws no bar but keeps its tick. The stacked tooltip's `item.value` is the series' raw number, not a `[start, end]` pair, so `seriesTooltip` needs no change for stacks; a `0` is listed and a `null` is left out.
