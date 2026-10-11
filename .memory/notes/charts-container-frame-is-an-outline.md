---
name: charts-container-frame-is-an-outline
kind: gotcha
description: ThemedChartContainer draws its frame as an inward outline and types width as a percentage, because Recharts measures the border box on mount but the content box on resize and renders no element for numeric width with numeric height.
anchors:
  - path: source/react-charts/packages/charts/src/internal/ThemedChartContainer/ThemedChartContainer.stylesheet.ts
    blob: 001ed22df382
  - path: source/react-charts/packages/charts/src/internal/ThemedChartContainer/ThemedChartContainer.tsx
    blob: d4832a8216c7
  - path: source/react-charts/packages/charts/src/internal/ThemedChartContainer/ThemedChartContainer.browser.test.tsx
    blob: f8e435a82b54
confidence: verified
---

`ThemedChartContainer.stylesheet.ts:12-21` uses `outline: 1px solid var(--vpg-border); outline-offset: -1px`: a 1px
border would make the first frame 2px larger than it settles to after the first resize. Geometry tests are
browser-only; jsdom lays nothing out. `ThemedChartContainer.tsx:15` narrows `width` to a `${number}%` template
type: with a numeric width and numeric (or aspect-derived) height Recharts renders no wrapper, so nothing carries
the theme and nothing errors. Inside another responsive container Recharts adds no second box, so the outer frame applies.
