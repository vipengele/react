# @vipengele/react-tokens

Seed-and-derive theming for the Vipengele design system: `createTheme()` and the scoped
`ThemeProvider`. See the root `AGENTS.md` for monorepo-wide commands and policy, and
`README.md` in this directory for the full seed/ramp/colour-mode model.

## Rules

This module has prescriptive rules in `.agents/rules/`. **Read every file in that directory before making changes here, and follow each rule strictly.**
Each file contains one rule. New rules go in that directory — one file per rule, kebab-case filename matching the rule's intent.

## Commands

```bash
pnpm --filter @vipengele/react-tokens build        # tsup && tsc -p tsconfig.build.json
pnpm --filter @vipengele/react-tokens type-check
pnpm --filter @vipengele/react-tokens test         # vitest run --coverage
```

## Architecture

- `theme.ts` — `createTheme(seed?, overrides?)` expands a `ThemeSeed` (accent, danger, ink,
  surface, radius, fontSans, fontMono — each defaulted) into a frozen `Theme`: a flat record of
  `--vpg-*` CSS custom properties, then composes `overrides` over the derived result.
  `danger` ramps into `--vpg-danger-hover/-press/-ring/-contrast/-visited` exactly as `accent`
  ramps into its own hover/press/wash/ring/contrast/visited family — a destructive control
  differs from a primary one only in the colour it ramps off. `-visited` shifts `l` the same
  direction as `-hover` (away from the surface), not the opposite direction `-wash` does — see
  `.agents/rules/state-ramp-shift-direction.md`.
- A `--vpg-*` property whose value depends on an environment condition the cascade resolves
  — colour mode, `prefers-reduced-motion` — is stylesheet-owned: it is absent from `createTheme`'s
  output, and both the `ThemeOverrides` type and a runtime check in `createTheme` reject naming
  one in `overrides` (`StylesheetOwnedProperty`, `STYLESHEET_OWNED_PROPERTIES` in `theme.ts`).
  `ThemeProvider` applies a `Theme` inline, and no mode rule or media query can override an
  inline declaration — see ADR-0007. The mode-resolved colours (`--vpg-accent`,
  `--vpg-danger`, `--vpg-ink`, `--vpg-surface`) are `light-dark()` expressions in
  the base stylesheet switched by `color-scheme` (ADR-0008); the ramp scalars and the two
  shadow inks are also mode-resolved; the three motion durations are resolved by
  `prefers-reduced-motion` instead.
- Hover/press/wash/dark ramps are `oklch()` relative-colour CSS expressions, resolved by the
  browser at paint time from the current `--vpg-accent` — not precomputed in JS. A theme
  change updates the seed-derived colours and the ramps follow with no re-render.
- `ThemeProvider.tsx` applies a `Theme` as inline custom properties on its own
  `.vpg-root` element (never on `:root`/`document.documentElement`), so multiple providers
  on one page stay independently themed.
- `colorMode` writes `data-vpg-mode` on the provider root; omitted, the base stylesheet
  falls through to the host page's `[data-theme]` or `prefers-color-scheme`.
- The base stylesheet is injected as a string via React 19's `<style href precedence>`
  de-duplication, not a `.css` import — this is what keeps the package `"sideEffects": false`.
  React 19 / React DOM 19 are peer dependencies for this reason.
- Besides colour, `theme.ts` also emits size, spacing, typography, motion (easings only — the
  durations are stylesheet-owned), elevation, focus-ring geometry (`--vpg-focus-ring-width`,
  `-offset`, shared by every component's `:focus-visible` ring) and stacking
  (`--vpg-layer-listbox/-popover/-tooltip`) families of `--vpg-*` properties. Every
  `@vipengele/react-ui` component reads these bare — `var(--vpg-*)` with no literal fallback — per
  `docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md`; a token this package
  doesn't define yet belongs here, not as an inlined guess in the component.
- There is deliberately no `useTheme()` hook — see `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`
  at the repo root before proposing one.
