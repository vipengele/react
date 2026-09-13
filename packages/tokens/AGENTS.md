# @tandiko/tokens

Seed-and-derive theming for the Tandiko design system: `createTheme()` and the scoped
`ThemeProvider`. See the root `AGENTS.md` for monorepo-wide commands and policy, and
`README.md` in this directory for the full seed/ramp/colour-mode model.

## Rules

This module has prescriptive rules in `.agents/rules/`. **Read every file in that directory before making changes here, and follow each rule strictly.**
Each file contains one rule. New rules go in that directory — one file per rule, kebab-case filename matching the rule's intent.

## Commands

```bash
pnpm --filter @tandiko/tokens build        # tsup && tsc -p tsconfig.build.json
pnpm --filter @tandiko/tokens type-check
pnpm --filter @tandiko/tokens test         # vitest run --coverage
```

## Architecture

- `theme.ts` — `createTheme(seed?)` expands a `ThemeSeed` (accent, ink, surface, radius,
  fontSans, fontMono — each defaulted) into a frozen `Theme`: a flat record of `--tandiko-*`
  CSS custom properties.
- Hover/press/wash/dark ramps are `oklch()` relative-colour CSS expressions, resolved by the
  browser at paint time from the current `--tandiko-accent` — not precomputed in JS. A theme
  change updates three colours/scalars and the ramps follow with no re-render.
- `ThemeProvider.tsx` applies a `Theme` as inline custom properties on its own
  `.tandiko-root` element (never on `:root`/`document.documentElement`), so multiple providers
  on one page stay independently themed.
- `colorMode` writes `data-tandiko-mode` on the provider root; omitted, the base stylesheet
  falls through to the host page's `[data-theme]` or `prefers-color-scheme`.
- The base stylesheet is injected as a string via React 19's `<style href precedence>`
  de-duplication, not a `.css` import — this is what keeps the package `"sideEffects": false`.
  React 19 / React DOM 19 are peer dependencies for this reason.
- There is deliberately no `useTheme()` hook — see `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`
  at the repo root before proposing one.
