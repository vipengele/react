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
- Series palette: `--vpg-chart-1..6` are `oklch(from var(--vpg-accent) calc(l ± 0.05) max(c, 0.07) calc(h + 30..330))` in `createTheme`, recorded in ADR `0030-chart-series-colours-rotate-hue-from-the-accent`, which also states that a pairwise distance check cannot prove colour-blind safety. The other contrast logic is `--vpg-accent-contrast`, a clamp at L 0.68.
- Release: ADR-0027 "two releases": react-ui tag first, then range bump in charts. `react-charts/packages/charts/package.json` has react-tokens in BOTH peerDependencies and devDependencies (and the Storybook in dependencies). For 0.x, a caret range does not cross a minor, so a react-tokens minor release needs a range bump in all three and in `source/react-charts/pnpm-lock.yaml`. A release needs `docs/release-notes/<tag>.md` (required by the workflow); charts has its own notes and tag.
- Story rule: `.claude/rules/ship-storybook-stories-with-every-component.md` names components in tokens/icons/charts; Theming story is `source/react-ui/apps/storybook/src/Theming.stories.tsx` (only uses accent/surface/ink/radius vars, no token listing).
