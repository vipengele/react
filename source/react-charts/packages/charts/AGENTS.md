# @vipengele/react-charts

Vipengele's themeable React charts, wrapping Recharts. See the root `AGENTS.md` for repo-wide
policy, and `README.md` in this directory for the consumer-facing API.

## Commands

```bash
pnpm --filter @vipengele/react-charts build         # tsup && tsc -p tsconfig.build.json
pnpm --filter @vipengele/react-charts type-check
pnpm --filter @vipengele/react-charts test          # vitest run --coverage
```

## Architecture

- `src/index.ts` is the package entry; every public export is a plain named export — never a
  namespace barrel, which would defeat tree-shaking.
- `@vipengele/react-tokens` is a peer dependency at a published range, never `workspace:*`: this
  project is its own workspace (ADR-0015).
- React 19 / React DOM 19 are peer dependencies — the charts are React components.
- `ThemedChartContainer` styles itself through an inline `<style>` (`*.stylesheet.ts`), not a `.css`
  import, to keep the package `"sideEffects": false`. It reads `--vpg-ink` and `--vpg-border`
  bare, with no `var()` fallback and never assigned inline, so it follows the tokens' colour mode.
  `src/no-fallback-var-reads.test.ts` enforces the no-fallback part across `src/`.
- `pnpm test` also runs `bundle-check/run.mjs`, a real downstream bundle that fails if importing
  `ThemedChartContainer` pulls in Recharts chart types. Keep Recharts imports narrow.
- Tests run at the 100% coverage gate; both a jsdom suite and a `*.browser.test.tsx` (Chromium via
  Playwright) exist.
