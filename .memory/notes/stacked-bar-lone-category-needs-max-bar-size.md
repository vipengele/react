---
name: stacked-bar-lone-category-needs-max-bar-size
kind: gotcha
description: StackedBarChart sets maxBarSize because Recharts draws no bar at all for a single category, and a zero or null value draws no segment.
anchors:
  - path: source/react-charts/packages/charts/src/StackedBarChart/StackedBarChart.tsx
    blob: 603a48433cc9
  - path: source/react-charts/packages/charts/src/StackedBarChart/StackedBarChart.browser.test.tsx
    blob: eac4ed42ba6c
  - path: source/react-charts/packages/charts/src/StackedBarChart/StackedBarChart.test.tsx
    blob: b52c14d9ef8d
confidence: suspect
---

With fewer than two category ticks, Recharts 3.10.1 has no neighbour to size a bar's slot from and falls back to
`maxBarSize`, and to 0 when that is unset, so a lone category draws no rectangle. `StackedBarChart.tsx:34` sets
`MAX_BAR_SIZE = 48` and passes it as `maxBarSize` on every `Bar` (`:63`); a lone bar then measures about 38px (its slot
less the default category gap) and is centred, and bars narrow below the cap as categories crowd the plot
(`StackedBarChart.browser.test.tsx`). The Recharts behaviour and the measurements are the explorer's, not re-run here.

In the jsdom tests (`StackedBarChart.test.tsx`), a `null`, a missing value and a `0` each draw no
`.recharts-bar-rectangle` (a zero has no height), and a category where every series is null or zero draws no bar but keeps
its tick. The stacked tooltip's `item.value` is the series' raw number, not a `[start, end]` pair, so `seriesTooltip`
needs no change for stacks; a `0` is listed and a `null` is left out (explorer report).
