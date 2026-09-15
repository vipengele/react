# @tandiko/ui

Tandiko's themeable React component library. See the root `AGENTS.md` for monorepo-wide commands
and policy, and `README.md` in this directory for the consumer-facing API.

## Rules

This module has prescriptive rules in `.agents/rules/`. **Read every file in that directory before making changes here, and follow each rule strictly.**
Each file contains one rule. New rules go in that directory — one file per rule, kebab-case filename matching the rule's intent.

## Commands

```bash
pnpm --filter @tandiko/ui build         # tsup && tsc -p tsconfig.build.json
pnpm --filter @tandiko/ui type-check
pnpm --filter @tandiko/ui test          # vitest run --coverage && node bundle-check/run.mjs
```

## Architecture

- One directory per component under `src/`, holding the `.tsx`, its `.stylesheet.ts` and its
  `.test.tsx`. `src/index.ts` re-exports each as a plain named export — never a namespace
  barrel, which would defeat the tree-shaking constraint.
- `src/internal/` is the one exception: code two or more components genuinely share (the
  floating-listbox keyboard hook, the listbox/option/checkbox/chip stylesheet) lives there rather
  than in one component's directory, since no component may import from another's. Nothing in
  `src/internal/` is re-exported from `src/index.ts`, and the 100% coverage threshold applies to
  it the same as to a component — through its callers' tests, if it has no suite of its own. A
  shared stylesheet gets its own `bundle-check/` marker, separate from every component's.
- Styles are a template string injected via React 19's `<style href precedence>`, never a `.css`
  or CSS Module import. CSS Modules were tried and rejected: tsup/esbuild emits an empty class
  map, which Vitest's own resolution hides, so the package tests green and ships broken.
- A component may **read** `--tandiko-*` properties through `var()` in its stylesheet, and may
  never **assign** one as an inline style. An inline declaration beats every stylesheet rule for
  the same property on the same element, including `@tandiko/tokens`' dark-mode reassignment, so
  an inline theme property silently kills colour-mode adaptation for that instance.
- Stories live in `apps/storybook/src/`, not beside the component — a story importing Storybook
  would drag it into this package's dependency graph.
- React 19 / React DOM 19 are peer dependencies. `@floating-ui/react` is the package's first real
  (non-peer) runtime dependency beyond `@tandiko/icons` — see
  `docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md` before adding another.
- Card and Tabs are compound components (`Card.Header`, `Tabs.Tab`, etc.) — the package's first
  use of this pattern and, for Tabs, its first React context. See
  `docs/adr/0003-card-compound-components-with-runtime-validation.md` and `.agents/rules/` for the
  conventions this introduces.

## `bundle-check/`

`bundle-check/` is a real downstream Vite build asserting that importing one component from this
package's built `dist/` pulls in only that component. **Every new component must be added to it
in the same change that ships the component** — a check that names only the components that
existed when it was written proves nothing about the one just added, and stays green while it
stops covering the package.

## Coverage

`vitest.config.ts` sets 100% thresholds on statements, branches, functions and lines. A new
component's tests cover every variant and every prop branch it introduces, or `pnpm test` fails.
