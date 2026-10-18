---
name: charts-null-values-are-gaps-by-default
kind: rationale
description: "Null series values are deliberate gaps: data goes to Recharts uncoerced and connectGaps (default false) maps to connectNulls, so line-break on null already exists."
anchors:
  - path: source/react-charts/packages/charts/src/internal/types.ts
    blob: 25fe32462a72
  - path: source/react-charts/packages/charts/src/LineChart/LineChart.tsx
    blob: 49fdf35a1032
  - path: source/react-charts/packages/charts/src/AreaChart/AreaChart.tsx
    blob: a8e8b8855853
  - path: source/react-charts/packages/charts/src/internal/SeriesKey/SeriesKey.tsx
    blob: 58048957785d
confidence: verified
---

`ChartRow` allows `null | undefined` as "a gap in that series" (`types.ts:8-13`). Data reaches Recharts uncoerced;
`connectGaps` (default false, `LineChart.tsx:41`, `AreaChart.tsx:66`) maps to `connectNulls` in both charts
(`LineChart.tsx:53`, `AreaChart.tsx:82`). `seriesTooltip` skips non-number values (`SeriesKey.tsx:61`). Breaking at null is
therefore already the default; only interpolation or zero-fill would be new behaviour.
