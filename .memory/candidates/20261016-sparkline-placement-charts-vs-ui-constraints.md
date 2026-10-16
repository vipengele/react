---
about: Where a Sparkline can live - the charts "frame" is cartesian-only with no a11y or tone, ui has StatTile.visual and a tone vocabulary but no Recharts, and charts exports are pinned by api-check
saw:
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
  - source/react-charts/packages/charts/src/internal/ThemedChartContainer/ThemedChartContainer.tsx
  - source/react-charts/packages/charts/src/internal/seriesColor.ts
  - source/react-charts/packages/charts/src/internal/types.ts
  - source/react-charts/packages/charts/api-check/run.mjs
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/package.json
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/ui/src/StatTile/StatTile.tsx
  - source/react-ui/packages/ui/src/Spinner/Spinner.tsx
  - source/react-ui/packages/tokens/src/theme.ts
  - docs/adr/0041-charts-are-their-own-project.md
  - docs/adr/0040-chart-series-colours-rotate-hue-from-the-accent.md
  - docs/adr/0018-statepanel-default-art-is-inline-svg-in-the-ui-package.md
---

Findings from planning issue #200 (Sparkline). All read from code on 2026-10-16.

**"The frame" is `CartesianChartFrame`** (`charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx`,
described in `charts/AGENTS.md`): container, grid, axes, tooltip, legend, zoom layer, status message. A chart
supplies only a Recharts `root` and series marks. It is built for axes/legend/zoom, so an axis-less sparkline
would either bypass it (use only `ThemedChartContainer`, which gives `--vpg-ink` colour and a 1px
`--vpg-border` outline frame - `ThemedChartContainer.stylesheet.ts`) or need the frame to grow switches. The
container's outline would draw a border around a table-cell sparkline.

**No accessible-name concept in charts.** `grep -n aria|role|title|desc` over the frame, ChartMessage and
SeriesKey finds only `role=status|alert` on ChartMessage (`ChartMessage.tsx:28`) and `aria-hidden` on the
legend swatch (`SeriesKey.tsx:9`). Charts never set `role="img"`/`aria-label`; ADR-0040 says series are named
by legend/tooltip instead. A sparkline's trend summary is new surface.

**Gaps**: `ChartRow` allows `null | undefined` as "a gap" (`types.ts`); LineChart/AreaChart pass
`connectNulls={connectGaps}` with default `false` (`LineChart.tsx`, `AreaChart.tsx:81`).

**Colour**: charts read series colour bare as `var(--vpg-chart-N)` via `seriesColor` (`seriesColor.ts`);
ChartSeries has `colorIndex` 1..6, no `tone`. Status roles exist in tokens: `--vpg-accent|danger|success|warning|info`
plus `-hover/-press/-wash/-ring/-contrast` (`tokens/src/theme.ts:183-247`). ui already has tone vocabularies:
`ToastTone` neutral|success|warning|info|danger (`Toast/toaster.ts:2`), `StatTileTone` (`StatTile.tsx:5`),
`LinkTone` accent|danger. So `tone` has precedent in ui, not in charts. Charts are `@vipengele/react-tokens ^0.2.0`
peers; a NEW token role costs two releases (ADR-0041 Running cost), reading an existing one costs none.

**ui side**: `StatTile` has `visual?: ReactNode` "a trailing node beside the text, such as a sparkline"
(`StatTile.tsx:18`), so the tile expects a sparkline from outside. ui deps are floating-ui, tanstack, icons, ts
(`ui/package.json:35-41`); no Recharts. ui already draws inline SVG (`Spinner.tsx`, StatePanel illustrations,
ADR-0018 says why inline SVG: custom properties resolve only in an in-document SVG). So a dependency-free SVG
sparkline in ui is feasible and costs no charting dependency; ui coverage gate is 80% (ADR-0048), charts 100%.

**Charts constraints**: public surface pinned - `api-check/run.mjs` `expectedExports` (`["AreaChart","LineChart"]`)
must change together with `src/index.ts`; no reachable `.d.ts` may mention the charting library or
`ThemedChartContainer`. bundle-check (`bundle-check/run.mjs`) has per-chart-type entries (`entry.js`,
`entry-area.js`, `entry-charts.js`); a Recharts-backed Sparkline needs its own entry and markers, and
`entry-charts.js` must carry every marker asserted absent. Any Recharts chart carries store+immer+d3 (~1MB
unminified), so a "tile sparkline" via Recharts is heavy; ADR-0041 "Bundle cost" states this. A hand-rolled SVG
sparkline in charts would be a first chart-package component that pulls no Recharts at all (and `sideEffects:false`).
