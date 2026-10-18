# @vipengele/react-tokens

Seed-and-derive theming for the Vipengele design system: `createTheme()` and the scoped
`ThemeProvider`, plus the non-visual `LocaleProvider` and `useLocale`. See the root `AGENTS.md` for monorepo-wide commands and policy, and
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

- `theme.ts` — `createTheme(seed?, overrides?)` expands a `ThemeSeed` (accent, danger, success,
  warning, info, ink, surface, radius, fontSans, fontMono — each defaulted) into a frozen
  `Theme`: a flat record of `--vpg-*` CSS custom properties, then composes `overrides` over
  the derived result.
  `danger` ramps into `--vpg-danger-hover/-press/-wash/-ring/-contrast/-visited` exactly as `accent`
  ramps into its own hover/press/wash/ring/contrast/visited family — a destructive control
  differs from a primary one only in the colour it ramps off. `success`, `warning` and `info` ramp
  into their own `-hover/-press/-wash/-ring/-contrast/-visited` families exactly as `danger` does.
  The default `warning` seed is the one status colour lighter than the contrast token's 0.68
  threshold, so `--vpg-warning-contrast` resolves to black where the others resolve to white.
  `-visited` shifts `l` the same direction as `-hover` (away from the surface), not the
  opposite direction `-wash` does — see `.agents/rules/state-ramp-shift-direction.md`.
- A `--vpg-*` property whose value depends on an environment condition the cascade resolves
  — colour mode, `prefers-reduced-motion` — is stylesheet-owned: it is absent from `createTheme`'s
  output, and both the `ThemeOverrides` type and a runtime check in `createTheme` reject naming
  one in `overrides` (`StylesheetOwnedProperty`, `STYLESHEET_OWNED_PROPERTIES` in `theme.ts`).
  `ThemeProvider` applies a `Theme` inline, and no mode rule or media query can override an
  inline declaration — see ADR-0007. The mode-resolved colours (`--vpg-accent`,
  `--vpg-danger`, `--vpg-success`, `--vpg-warning`, `--vpg-info`, `--vpg-ink`,
  `--vpg-surface`) are `light-dark()` expressions in the base stylesheet switched by
  `color-scheme` (ADR-0008); the ramp scalars and the two shadow inks are also mode-resolved;
  the three motion durations are resolved by `prefers-reduced-motion` instead.
- Hover/press/wash/dark ramps are `oklch()` relative-colour CSS expressions, resolved by the
  browser at paint time from the current `--vpg-accent` — not precomputed in JS. A theme
  change updates the seed-derived colours and the ramps follow with no re-render.
- `ThemeProvider.tsx` applies a `Theme` as inline custom properties on its own
  `.vpg-root` element (never on `:root`/`document.documentElement`), so multiple providers
  on one page stay independently themed.
- `ThemeProvider` owns a `ColorModePreference` (`'light' | 'dark' | 'system'`), controlled by
  `colorMode` or held by the provider from `defaultColorMode` (default `'system'`), reported
  through `onColorModeChange`. `'light'`/`'dark'` write `data-vpg-mode` on the provider root;
  `'system'` writes nothing, and the base stylesheet falls through to the host page's
  `[data-theme]` or `prefers-color-scheme`. The provider persists nothing.
- `color-mode.ts` — `useColorMode()` returns `{ colorMode, setColorMode, resolvedColorMode }` for
  the nearest provider and throws outside one. `resolvedColorMode` is derived for display only and
  never feeds `data-vpg-mode`; under `'system'` it is `undefined` on the server and the first
  hydration pass (ADR-0034).
- The base stylesheet is injected as a string via React 19's `<style href precedence>`
  de-duplication, not a `.css` import — this is what keeps the package `"sideEffects": false`.
  React 19 / React DOM 19 are peer dependencies for this reason.
- Besides colour, `theme.ts` also emits size, spacing, column-width
  (`--vpg-column-sm/-md/-lg/-xl`, the minimum track width of an auto-fitting grid), width
  (`--vpg-width-sm/-md/-lg/-xl`, the maximum width a container's content grows to — not the
  column scale), typography, motion (easings only — the
  durations are stylesheet-owned), elevation, focus-ring geometry (`--vpg-focus-ring-width`,
  `-offset`, shared by every component's `:focus-visible` ring) and stacking
  (`--vpg-layer-sticky/-drawer/-popover/-listbox/-menu/-tooltip`, 900 < 1000 < 1100 < 1200 = 1200 < 1300)
  and chart series colour (`--vpg-chart-1` to `--vpg-chart-6`) families of `--vpg-*` properties.
  The chart roles are `oklch(from var(--vpg-accent) …)` expressions with hue offsets of +30° to
  +330° in 60° steps and lightness alternating ±0.05. They follow the colour mode through
  `--vpg-accent`'s `light-dark()`, so they are not stylesheet-owned and add no seed fields. An
  override of one applies in both modes unless it is a `light-dark()` or `var()`-reading
  expression. Every
  `@vipengele/react-ui` component reads these bare — `var(--vpg-*)` with no literal fallback — per
  `docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md`; a token this package
  doesn't define yet belongs here, not as an inlined guess in the component.
- `LocaleProvider.tsx` is a non-visual context provider: it renders no markup and no `.vpg-root`,
  and is independent of `ThemeProvider`. `locale-context.ts` holds the unexported context,
  defaulting to `undefined`. `useLocale(locale?)` resolves the argument, else the nearest
  provider, else `Locale.default()`, and never throws outside a provider. It must not test
  `instanceof Locale`: two copies of `@vipengele/ts` give the class two identities. The default
  is memoised lazily per component (a ref filled on first need), not read at module scope, which
  keeps the package `"sideEffects": false`.
- There is deliberately no `useTheme()` hook, and the one context `ThemeProvider` shares carries
  the mode preference only, never the `Theme` or a token. `LocaleProvider`'s context is the
  carve-out, because a locale is not a theme value — see
  `docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md` and
  `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md` and
  `docs/adr/0034-themeprovider-owns-the-colour-mode-preference.md` at the repo root before
  proposing a theme hook.

## Coverage

`vitest.config.ts` sets 100% thresholds on statements, branches, functions and lines. A line no
test can reach may take `/* v8 ignore next -- <reason> */` (or a `start -- <reason>` / `stop`
pair); nothing wider is allowed. `pnpm lint` fails a pragma without a reason and any `file`,
`if`, `else`, `try`, `catch` or whole-function form. Each pragma counts against this package's
entry in `source/react-ui/coverage-ignore-budget.json`, which starts at 0 and which CI fails a package for exceeding, so adding one
means raising that number in the same diff. `docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md`
records the rule.
