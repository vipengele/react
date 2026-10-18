---
name: charts-series-colour-role-beats-colorindex-and-neutral-reads-ink
kind: rationale
description: A chart series takes its colour from ChartSeries.color (an 11-role union) before colorIndex, and neutral reads --vpg-ink because every other neutral grey in the theme is translucent.
anchors:
  - path: source/react-charts/packages/charts/src/internal/seriesColor.ts
    blob: 0ddb83d2ca98
  - path: source/react-charts/packages/charts/src/internal/types.ts
    blob: 25fe32462a72
  - path: docs/adr/0040-chart-series-colours-rotate-hue-from-the-accent.md
    blob: d0ff87f87968
  - path: source/react-charts/packages/charts/package.json
    blob: b18fb76e6bda
confidence: suspect
---

`seriesColor` (`seriesColor.ts:27-28`) resolves `series.color` (a `ChartColorRole`: `chart-1`..`chart-6`, `success`,
`danger`, `warning`, `info`, `neutral`), else `chart-${colorIndex}`, else `chart-${(index % 6) + 1}`, through
`ROLE_PROPERTIES` (`:8-19`), and returns a bare `var(--vpg-*)` with no fallback (enforced by
`src/no-fallback-var-reads.test.ts`, not re-read). `neutral` maps to the opaque `--vpg-ink` (`:19`); the comment at `:4-6`
gives the reason: the theme has no neutral role and `--vpg-ink-muted` and `--vpg-border-strong` are translucent (68% and
32% alpha per the explorer, not re-measured), so a bar or area in either lets gridlines show through. ADR-0040's hue
rotation governs the six `chart-N` roles only.

`package.json:40,47` requires `@vipengele/react-tokens` `^0.3.0` as peer and dev dependency. The explorer reported that
`--vpg-success`, `--vpg-warning` and `--vpg-info` exist only from tokens 0.3.0 and that under 0.2.0 those roles resolve to
the initial colour (black); that was not re-verified here.
