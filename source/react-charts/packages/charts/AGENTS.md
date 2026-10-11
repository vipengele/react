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
  namespace barrel, which would defeat tree-shaking. `LineChart` and `AreaChart` are the only
  exports.
- Recharts is an implementation detail. No public type may be derived from a Recharts type
  (`ComponentProps<typeof X>`, an `extends` of a Recharts props type, a re-exported alias), and no
  Recharts element, prop or event is accepted or emitted. The shared public types are written out
  in `src/internal/types.ts`; each chart's file re-exports them under its own `LineChart*` or
  `AreaChart*` names and adds the props only it has.
- `src/internal/` is never exported. `internal/types.ts` is type-only and reachable from
  `dist/index.d.ts`, so it is scanned like a public file.
- `src/internal/CartesianChartFrame/` draws everything around the series marks: the container,
  grid, axes, tooltip, legend, zoom layer and reset control, and the status message. A chart type
  supplies only its Recharts root and series marks, built with `seriesColor`.
  `src/internal/chartStylesheet.ts` is one stylesheet for every chart type, injected as
  `<style href="vpg-chart" precedence="vpg-chart">`, so a page carries it once.
- `src/internal/ThemedChartContainer/` sizes the chart and styles itself through an inline
  `<style>` (`*.stylesheet.ts`), not a `.css` import, to keep the package `"sideEffects": false`. It reads `--vpg-ink` and `--vpg-border` bare, with no `var()`
  fallback and never assigned inline, so it follows the tokens' colour mode.
  `src/no-fallback-var-reads.test.ts` enforces the no-fallback part across `src/`.
- `@vipengele/react-tokens` is a peer dependency at a published range, never `workspace:*`: this
  project is its own workspace (ADR-0015).
- React 19 / React DOM 19 are peer dependencies — the charts are React components.
- `recharts` is a regular dependency. `react-is` is a regular dependency too: it is Recharts' peer,
  and listing it here keeps it from surfacing to consumers.
- `pnpm test` also runs two checks over the built `dist/`:
  - `api-check/run.mjs` enforces the public surface. The runtime export set of `dist/index.js` must
    equal `expectedExports` (`["AreaChart","LineChart"]`) exactly, and every export's
    `dist/<Name>/<Name>.d.ts` must be reachable from `dist/index.d.ts`. No reachable declaration,
    comments included and matched case-insensitively, may mention the charting library or
    `ThemedChartContainer`, so doc comments on exported types say "the charting library". A change
    to the public surface updates `expectedExports` and `src/index.ts` together.
  - `bundle-check/run.mjs` builds three real downstream bundles. The `LineChart`-only bundle must
    carry the chart's container, Recharts' `ResponsiveContainer` and `Line` and the store, immer
    and d3 libraries beneath them, and no `Area`, `ReferenceLine` or other chart type. The
    `AreaChart`-only bundle must carry the container, `ResponsiveContainer`, `Area`,
    `ReferenceLine` and the same libraries, and no `Line` or other chart type. An all-charts
    control must carry every marker asserted absent anywhere, so an absence check cannot pass
    because a marker was renamed. Keep Recharts imports narrow.
- Tests run at the 100% coverage gate; both a jsdom suite and a `*.browser.test.tsx` (Chromium via
  Playwright) exist.
