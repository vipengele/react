---
about: a chart series takes its colour from ChartSeries.color (an 11-role union) before colorIndex, and neutral reads --vpg-ink because every other neutral grey in the theme is translucent
saw:
  - source/react-charts/packages/charts/src/internal/seriesColor.ts
  - source/react-charts/packages/charts/src/internal/types.ts
  - docs/adr/0040-chart-series-colours-rotate-hue-from-the-accent.md
  - source/react-charts/packages/charts/package.json
---
`seriesColor` resolves `series.color` (a `ChartColorRole`: `chart-1`..`chart-6`, `success`, `danger`, `warning`, `info`, `neutral`), else `chart-${colorIndex}`, else `chart-${(index % 6) + 1}`, through the `ROLE_PROPERTIES` map, and returns a bare `var(--vpg-*)` with no fallback (enforced by `src/no-fallback-var-reads.test.ts`). The theme has no neutral colour role, and `--vpg-ink-muted` (68% alpha) and `--vpg-border-strong` (32% alpha) are translucent, so a bar or area in either lets the gridlines show through; `neutral` therefore reads the opaque `--vpg-ink`, which draws in the text colour. ADR-0040's hue rotation governs the six `chart-N` roles only; the status roles and `neutral` sit outside it. The status properties (`--vpg-success`, `--vpg-warning`, `--vpg-info`) are defined by `@vipengele/react-tokens` from 0.3.0, and the published 0.2.0 defines only `--vpg-danger`, so `package.json` requires `^0.3.0` as both peer and dev dependency; under 0.2.0 those roles resolve to the initial colour (black).
