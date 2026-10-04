---
about: what must change together to add series/categorical colour roles to react-tokens, and what is (not) recorded about series palettes
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/theme.test.ts
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/tokens/vitest.config.ts
  - source/react-ui/packages/tokens/.agents/rules/environment-resolved-properties-are-stylesheet-owned.md
  - docs/adr/0007-base-stylesheet-owns-every-mode-resolved-property.md
  - docs/adr/0008-mode-resolved-colours-expressed-as-light-dark.md
  - docs/adr/0027-charts-are-their-own-project.md
  - source/react-charts/packages/charts/package.json
---
Costed ~20 reads; answers "what breaks / what constrains" for adding `--vpg-chart-N`.

- Derivation: all derived colours are `oklch(from var(--vpg-accent) ...)` relative colours in `createTheme` (`theme.ts:135`, ramps `:170-194`). Mode-resolved base colours (accent/danger/ink/surface) are `light-dark(var(--x-light), var(--x-dark))` in `base-stylesheet.ts` `.vpg-root`, switched by `color-scheme`; `-dark` arms derive from `-light` (`theme.ts:~155-165`, +0.08 L, c*0.92). Nested providers work because everything is inline custom properties on each `.vpg-root` (ADR-0001, ADR-0007).
- Seed is closed: `ThemeSeed` has 7 optional fields (`theme.ts:11-28`; `DEFAULT_SEED` `:89`). Adding an optional field is non-breaking; `createTheme` destructures explicitly (`:136`).
- A new role derived from `--vpg-accent`/`-ink` via `var()` re-derives per mode for free and belongs in `createTheme`. Only a role needing different VALUES per mode that cannot be derived must go in `STYLESHEET_OWNED_PROPERTIES` (`theme.ts:49`) + `.vpg-root` + DARK_DECLARATIONS (rule file `environment-resolved-properties-are-stylesheet-owned.md`). If derived from state-shift, mind sign (note state-shift-sign-flips-with-colour-mode).
- Enforcement: `theme.test.ts` has a hard-coded `EXPECTED_KEYS` list compared via `Object.keys(createTheme()).sort()` toEqual (`theme.test.ts:5-97, :100-108`) - any new emitted key fails the test until listed. tokens vitest coverage thresholds are 100% statements/branches/functions/lines (`vitest.config.ts`). No typed token-name union: `Theme` is `Record<`--vpg-${string}`, string>`. No generated/ dir, no tokens-reference Storybook page.
- Overrides: `createTheme(seed, overrides)` accepts any `--vpg-*` key (`ThemeOverrides`, `theme.ts:~70`), Object.assign'd last; only `STYLESHEET_OWNED_PROPERTIES` throw. So a consumer can set `--vpg-chart-3` explicitly.
- Gap: grep of docs/adr, tokens README/AGENTS, charts for categorical/series/palette/wcag/colour-vision finds nothing about series palettes, hue rotation, non-text contrast or CVD. ADR-0027 says series/categorical colours are deliberately deferred because they need new roles in react-tokens. Only contrast logic that exists: `--vpg-accent-contrast` clamp at L 0.68.
- Release: ADR-0027 "two releases": react-ui tag first, then range bump in charts. `react-charts/packages/charts/package.json` has react-tokens `^0.1.1` in BOTH peerDependencies and devDependencies. For 0.x, caret does not cross a minor: release skill says feat = minor pre-1.0 only for breaking; `feat` -> minor per skill step 1 (0.2.0) would fall outside `^0.1.1`, so range must be bumped (to `^0.2.0`, or `>=0.1.2` if shipped as patch). Needs docs/release-notes/react-ui@vX.Y.Z.md (required by workflow) and, for charts, its own release notes + react-charts tag; pnpm lockfile update in source/react-charts.
- Story rule: `.claude/rules/ship-storybook-stories-with-every-component.md` names components in tokens/icons/charts; Theming story is `source/react-ui/apps/storybook/src/Theming.stories.tsx` (only uses accent/surface/ink/radius vars, no token listing).
