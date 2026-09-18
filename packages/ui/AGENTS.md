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
- `src/internal/` holds code two or more components genuinely share (the floating-listbox
  keyboard hook, the listbox/option/checkbox/chip stylesheet) rather than one component's
  directory reaching into another's internals. Nothing in `src/internal/` is re-exported from
  `src/index.ts`, and the 100% coverage threshold applies to it the same as to a component —
  through its callers' tests, if it has no suite of its own. A shared stylesheet gets its own
  `bundle-check/` marker, separate from every component's.
- A component may compose another component only if that component is itself exported from
  `src/index.ts` — importing a sibling's internals, or two components importing each other, is
  what `src/internal/` exists to prevent. `FieldShell` is exported for exactly this reason:
  `TextField` and `PasswordInput` compose it. See `docs/adr/0011-the-field-shell-as-keystone.md`.
- Styles are a template string injected via React 19's `<style href precedence>`, never a `.css`
  or CSS Module import. CSS Modules were tried and rejected: tsup/esbuild emits an empty class
  map, which Vitest's own resolution hides, so the package tests green and ships broken.
- A component may **read** `--tandiko-*` properties through `var()` in its stylesheet, and may
  never **assign** one as an inline style. An inline declaration beats every stylesheet rule for
  the same property on the same element, including `@tandiko/tokens`' dark-mode reassignment, so
  an inline theme property silently kills colour-mode adaptation for that instance.
- Every such read is bare — `var(--tandiko-space-2)`, never with a literal fallback — per
  `docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md` and
  `.agents/rules/no-literal-fallback-in-token-reads.md`.
  `src/no-fallback-var-reads.test.ts` globs the package's own source tree and fails the build on
  any offending read, including in a component that doesn't exist yet when the check is written.
- Stories live in `apps/storybook/src/`, not beside the component — a story importing Storybook
  would drag it into this package's dependency graph.
- React 19 / React DOM 19 and `@tandiko/tokens` are peer dependencies — every component reads the
  token substrate that `@tandiko/tokens` defines, so a consumer supplies both from the same tree
  rather than this package bundling its own copy. `@floating-ui/react` is the package's first real
  (non-peer) runtime dependency beyond `@tandiko/icons` — see
  `docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md` before adding another.
- Every floating surface (listbox, popover, tooltip) stacks via the token layers
  `--tandiko-layer-listbox`/`-popover`/`-tooltip` from `@tandiko/tokens`, never a component-local
  `z-index` literal — see that package's `AGENTS.md` for the containment order they encode.
- Card and Tabs are compound components (`Card.Header`, `Tabs.Tab`, etc.) — the package's first
  use of this pattern and, for Tabs, its first React context. See
  `docs/adr/0003-card-compound-components-with-runtime-validation.md` and `.agents/rules/` for the
  conventions this introduces.
- Dropdown and Autocomplete take `Dropdown.Option`/`Autocomplete.Option` compound children rather
  than a data-array prop, matching Card/Tabs' idiom — see
  `docs/adr/0005-dropdown-autocomplete-compound-option-children.md`. Both track the highlighted
  option via `aria-activedescendant` rather than moving real DOM focus (`FloatingFocusManager` is
  deliberately absent), and share that keyboard/highlight handling through
  `src/internal/useListboxKeyboard.ts` — see
  `docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`.

## `bundle-check/`

`bundle-check/` is a real downstream Vite build asserting that importing one component from this
package's built `dist/` pulls in only that component. **Every new component must be added to it
in the same change that ships the component** — a check that names only the components that
existed when it was written proves nothing about the one just added, and stays green while it
stops covering the package.

## Coverage

`vitest.config.ts` sets 100% thresholds on statements, branches, functions and lines. A new
component's tests cover every variant and every prop branch it introduces, or `pnpm test` fails.

## Two Vitest projects

`vitest.config.ts` runs two projects. A `*.test.tsx` file runs under `jsdom`; a
`*.browser.test.{ts,tsx}` file runs under a real headless Chromium instead, driven by
`@vitest/browser-playwright`. See `.agents/rules/browser-test-for-anything-jsdom-cannot-resolve.md`
for which kind a given assertion belongs in.

A fresh clone fails `pnpm test` until Playwright's Chromium build is installed by hand — Playwright
ships no postinstall hook to fetch it:

```bash
pnpm --filter @tandiko/ui exec playwright install chromium
```

Run it filtered to this workspace, not as a bare `pnpm exec playwright install chromium` from the
repo root: pnpm's isolated `node_modules` keeps a workspace's own devDependency out of the root
bin directory, so the bare form fails with `Command "playwright" not found`.
