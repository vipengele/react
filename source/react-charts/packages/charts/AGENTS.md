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
  namespace barrel, which would defeat tree-shaking. `LineChart` is the only export.
- Recharts is an implementation detail. No public type may be derived from a Recharts type
  (`ComponentProps<typeof X>`, an `extends` of a Recharts props type, a re-exported alias), and no
  Recharts element, prop or event is accepted or emitted. Public types are written out in
  `src/LineChart/LineChart.tsx`.
- `src/internal/ThemedChartContainer/` is internal and never exported. It sizes the chart and
  styles itself through an inline `<style>` (`*.stylesheet.ts`), not a `.css` import, to keep the
  package `"sideEffects": false`. It reads `--vpg-ink` and `--vpg-border` bare, with no `var()`
  fallback and never assigned inline, so it follows the tokens' colour mode.
  `src/no-fallback-var-reads.test.ts` enforces the no-fallback part across `src/`.
- `@vipengele/react-tokens` is a peer dependency at a published range, never `workspace:*`: this
  project is its own workspace (ADR-0015).
- React 19 / React DOM 19 are peer dependencies — the charts are React components.
- `recharts` is a regular dependency. `react-is` is a regular dependency too: it is Recharts' peer,
  and listing it here keeps it from surfacing to consumers.
- `pnpm test` also runs two checks over the built `dist/`:
  - `api-check/run.mjs` enforces the public surface. The runtime export set of `dist/index.js` must
    equal `expectedExports` exactly, and no declaration file reachable from `dist/index.d.ts` may
    name Recharts or `ThemedChartContainer`. A change to the public surface updates
    `expectedExports` in the same change.
  - `bundle-check/run.mjs` is a real downstream bundle of `LineChart`. It must carry the chart's
    container, Recharts' `ResponsiveContainer` and `Line` and the store and d3 libraries beneath
    them, and no other Recharts chart type. Keep Recharts imports narrow.
- Tests run at the 100% coverage gate; both a jsdom suite and a `*.browser.test.tsx` (Chromium via
  Playwright) exist.
