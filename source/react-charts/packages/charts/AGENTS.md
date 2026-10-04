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
