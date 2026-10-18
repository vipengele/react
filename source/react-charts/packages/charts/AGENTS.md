# @vipengele/react-charts

Vipengele's themeable React charts, wrapping Recharts. See the root `AGENTS.md` for repo-wide
policy, and `README.md` in this directory for the consumer-facing API.

## Commands

```bash
pnpm --filter @vipengele/react-charts build         # tsup && tsc -p tsconfig.build.json
pnpm --filter @vipengele/react-charts type-check
pnpm --filter @vipengele/react-charts test          # vitest run --coverage, then bundle-check and api-check
```

## Architecture

- `src/index.ts` is the package entry; every public export is a plain named export — never a
  namespace barrel, which would defeat tree-shaking. `LineChart`, `AreaChart` and
  `StackedBarChart` are the only exports.
- Recharts is an implementation detail. No public type may be derived from a Recharts type
  (`ComponentProps<typeof X>`, an `extends` of a Recharts props type, a re-exported alias), and no
  Recharts element, prop or event is accepted or emitted. The shared public types are written out
  in `src/internal/types.ts`; each chart's file re-exports them under its own `LineChart*`,
  `AreaChart*` or `StackedBarChart*` names and adds the props only it has.
- `src/internal/` is never exported. `internal/types.ts` is type-only and reachable from
  `dist/index.d.ts`, so it is scanned like a public file.
- `src/internal/CartesianChartFrame/` draws everything around the series marks: the container,
  grid, axes, tooltip, legend, zoom layer and reset control, and the status message. A chart type
  supplies only its Recharts root and series marks, built with `seriesColor`. The frame's x axis is
  `"number"` by default, spanning the data edge to edge with drag-to-zoom. The internal
  `axis="band"` gives each distinct x value a slot and a tick of its own, padded by half a step at
  each end, and mounts neither the zoom layer nor the reset control: `StackedBarChart` uses it, and
  its props omit `zoom`, `onZoomChange` and `messages.resetZoom`. `axis` is not a public prop. The frame also draws
  the optional `gaps` (shaded x ranges, beneath the series), `markers` (vertical lines) and
  `referenceLines` (horizontal lines, which extend the y axis), the latter two above the series,
  none of them taking pointer events (on a band axis markers and gaps are clipped to the padded
  axis domain, half a step beyond the first and last x value), and passes `renderTooltipDetail` to the tooltip as additive content.
  `src/internal/chartStylesheet.ts` is one stylesheet for every chart type, injected as
  `<style href="vpg-chart" precedence="vpg-chart">`, so a page carries it once.
- `src/internal/ThemedChartContainer/` sizes the chart and styles itself through an inline
  `<style>` (`*.stylesheet.ts`), not a `.css` import, to keep the package `"sideEffects": false`.
  It reads `--vpg-ink` and `--vpg-border` bare, with no `var()` fallback and never assigned inline,
  so it follows the tokens' colour mode. `src/no-fallback-var-reads.test.ts` enforces the
  no-fallback part across `src/`.
- Series colour: `ChartSeries.color` names a `ChartColorRole` (`"chart-1"` to `"chart-6"`,
  `"success"`, `"danger"`, `"warning"`, `"info"`, `"neutral"`) and wins over `colorIndex`, which wins
  over the default `(i % 6) + 1`. `seriesColor` maps the role to a bare `var(--vpg-*)` read. `neutral`
  reads `--vpg-ink`: the theme has no neutral role, and its other neutral greys (`--vpg-ink-muted`,
  `--vpg-border-strong`) are translucent, so gridlines would show through a bar or area; a neutral
  series is therefore drawn in the text colour. ADR-0040's hue rotation governs the six series roles
  only; the status roles and `neutral` sit outside it, so a series pinned to a status role keeps its
  meaning whatever the accent.
- `@vipengele/react-tokens` is a peer dependency at a published range (`^0.3.0`, the release that
  supplies the status roles), never `workspace:*`: this project is its own workspace (ADR-0015).
- React 19 / React DOM 19 are peer dependencies — the charts are React components.
- `recharts` is a regular dependency. `react-is` is a regular dependency too: it is Recharts' peer,
  and listing it here keeps it from surfacing to consumers.
- `pnpm test` also runs two checks over the built `dist/`:
  - `api-check/run.mjs` enforces the public surface. The runtime export set of `dist/index.js` must
    equal `expectedExports` (`["AreaChart","LineChart","StackedBarChart"]`) exactly, and every export's
    `dist/<Name>/<Name>.d.ts` must be reachable from `dist/index.d.ts`. No reachable declaration,
    comments included and matched case-insensitively, may mention the charting library or
    `ThemedChartContainer`, so doc comments on exported types say "the charting library". A change
    to the public surface updates `expectedExports` and `src/index.ts` together.
  - `bundle-check/run.mjs` builds four real downstream bundles. The `LineChart`-only bundle must
    carry the chart's container, Recharts' `ResponsiveContainer`, `Line`, `ReferenceLine` and
    `ReferenceArea` and the store, immer and d3 libraries beneath them, and no `Area`, `Bar` or
    other chart type. The `AreaChart`-only bundle must carry the container, `ResponsiveContainer`,
    `Area`, `ReferenceLine`, `ReferenceArea` and the same libraries, and no `Line`, `Bar` or other
    chart type. The `StackedBarChart`-only bundle must carry the container, `ResponsiveContainer`,
    `Bar`, `ReferenceLine`, `ReferenceArea` and the same libraries, and no `Line`, `Area` or other
    chart type. An
    all-charts control must carry every marker asserted absent anywhere, so an absence check cannot
    pass because a marker was renamed. Keep Recharts imports narrow.
- Tests run at the 100% coverage gate; both a jsdom suite and a `*.browser.test.tsx` (Chromium via
  Playwright) exist.

## Coverage

`vitest.config.ts` sets 100% thresholds on statements, branches, functions and lines. A line no
test can reach may take `/* v8 ignore next -- <reason> */` (or a `start -- <reason>` / `stop`
pair); nothing wider is allowed. `pnpm lint` fails a pragma without a reason and any `file`,
`if`, `else`, `try`, `catch` or whole-function form. Each pragma counts against this package's
entry in `source/react-charts/coverage-ignore-budget.json`, which starts at 0 and which CI fails a package for exceeding, so adding one
means raising that number in the same diff. `docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md`
records the rule.
