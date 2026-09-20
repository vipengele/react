# @vipengele/react-icons

A curated, tree-shakable re-export of `lucide-react` icons, plus the `Icon` wrapper that sizes
them from `--vpg-icon-*` custom properties. See the root `AGENTS.md` for monorepo-wide
commands and policy, and `README.md` in this directory for the full sizing model.

## Rules

This module has prescriptive rules in `.agents/rules/`. **Read every file in that directory before making changes here, and follow each rule strictly.**
Each file contains one rule. New rules go in that directory — one file per rule, kebab-case filename matching the rule's intent.

## Commands

```bash
pnpm --filter @vipengele/react-icons build         # tsup && tsc -p tsconfig.build.json
pnpm --filter @vipengele/react-icons type-check
pnpm --filter @vipengele/react-icons test          # vitest run --coverage && node bundle-check/run.mjs
```

## Architecture

- `icons.ts` re-exports the curated `lucide-react` set as individually named exports (see
  `.agents/rules/` for why this must never become a barrel re-export).
- `Icon.tsx` takes the icon component itself (not a name) and forwards an explicit
  `size`/`strokeWidth` prop straight through as an SVG attribute; without one, it falls back to
  `var(--vpg-icon-size-md)` / `var(--vpg-icon-stroke-md)`, with a fallback value in this
  package's own stylesheet so it works standalone before `@vipengele/react-tokens` is present.
- `bundle-check/` is a real downstream build (Vite, not a size check on this package's own
  `dist`): `run.mjs` bundles `entry.js` (which imports exactly one icon) and asserts the
  resulting bundle contains only that icon's lucide id and none of the other curated or
  uncurated icon ids. It runs as part of `pnpm test` — adding a new curated icon means adding
  its lucide id to the `unrelatedCuratedIcons` list in `bundle-check/run.mjs` too, or the check
  stops proving anything about the new icon.
- React 19 / React DOM 19 are peer dependencies — `Icon` is a React component.
