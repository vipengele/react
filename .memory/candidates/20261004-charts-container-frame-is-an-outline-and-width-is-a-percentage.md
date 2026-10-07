---
about: ThemedChartContainer draws its frame as an inward outline and types width as a percentage, because Recharts' ResponsiveContainer measures the outer box on mount but the inner box on resize, and renders no element of its own for a numeric width with a numeric height
saw:
  - source/react-charts/packages/charts/src/ThemedChartContainer/ThemedChartContainer.stylesheet.ts
  - source/react-charts/packages/charts/src/ThemedChartContainer/ThemedChartContainer.tsx
  - source/react-charts/packages/charts/src/ThemedChartContainer/ThemedChartContainer.browser.test.tsx
---

- A 1px `border` (with `box-sizing: border-box`) makes the first frame lay out 2px larger than the
  space it settles into after the first resize, because Recharts reads the border box on mount and
  the content box on every later resize. `outline: 1px solid var(--vpg-border); outline-offset: -1px`
  takes no space, so both measurements agree. The browser project's geometry tests catch the
  difference; jsdom lays nothing out and cannot.
- `ThemedChartContainerProps` narrows `width` to `` `${number}%` ``. With a numeric width and a
  numeric (or `aspect`-derived) height Recharts renders no element of its own and hands the size
  straight to the chart, so no box carries the theme and nothing errors.
- Inside another responsive container Recharts adds no second box, so the outer container's frame
  and ink are the ones that apply.
