# @vipengele/react-tokens

Seed-and-derive theming for the vipengele design system: `createTheme` and `ThemeProvider`.

```tsx
import { createTheme, ThemeProvider } from "@vipengele/react-tokens";

const theme = createTheme({ accent: "oklch(0.62 0.19 264)" });

<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>;
```

## Seeding

A `ThemeSeed` is the small set of values a consumer supplies — `accent`, `danger`, `success`,
`warning`, `info`, `ink`, `surface`, `radius`, `fontSans`, `fontMono`. Each has a default, so `createTheme()` returns a complete
theme. `createTheme` expands the seed into a frozen `Theme`: a flat, JSON-serializable record
of `--vpg-*` CSS custom properties.

## Ramps are CSS, not JavaScript

The hover/press/wash/visited/dark ramps are `oklch()` relative-colour expressions, not colours
computed at build time:

```css
--vpg-accent-hover: oklch(
  from var(--vpg-accent) calc(l + var(--vpg-state-shift)) c h
);
```

The browser resolves them at paint time from whatever `--vpg-accent` currently is, so a
mode flip reassigns the mode-resolved colours and three scalars and the whole ramp follows —
no second theme object, no re-render.

## Status colours

`danger`, `success`, `warning` and `info` each seed a status colour (`--vpg-danger`,
`--vpg-success`, `--vpg-warning`, `--vpg-info`) and a ramp derived from it exactly as the accent
ramp is: `-hover`, `-press`, `-wash`, `-ring`, `-contrast` and `-visited`, plus the `-light`/`-dark`
variants the mode picks between. `-contrast` is black or white, whichever reads on the status
colour; the default `warning` is a light amber, so its contrast text is black.

The four base colours are mode-resolved `light-dark()` expressions owned by the base stylesheet,
so `createTheme` rejects them as overrides. Reseed them, or override their `-light`/`-dark`
variants.

## Chart series colours

`--vpg-chart-1` to `--vpg-chart-6` are six series colours for categorical data. Each is an
`oklch()` relative-colour expression off `--vpg-accent`: the hue steps round the wheel in 60°
increments from +30° to +330°, lightness alternates between +0.05 (odd roles) and −0.05 (even
roles) so neighbouring series differ in lightness as well as hue, and chroma is floored at
0.07 so a near-grey accent still yields distinguishable series.

```css
--vpg-chart-1: oklch(
  from var(--vpg-accent) calc(l + 0.05) max(c, 0.07) calc(h + 30)
);
```

`--vpg-accent` is a `light-dark()` colour, so the series follow the colour mode with no second
set of values. They add no seed fields and are not stylesheet-owned, so `createTheme(seed,
overrides)` accepts them in `overrides`. An override is applied inline and holds in both
modes, unless it is a `light-dark()` or `var()`-reading expression, which resolves per mode.

## Colour mode

`colorMode="light" | "dark"` writes `data-vpg-mode` on the provider's root. Omit it and
the base stylesheet lets the host page's `:root[data-theme="dark"]` or the OS
`prefers-color-scheme` decide; an explicit `colorMode` always wins over both.

## No `useTheme()`

There is no hook. Components read theme values through CSS custom properties in their own
stylesheets. See `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`.

## Peer dependencies

React 19 and React DOM 19. The base stylesheet is injected through React 19's
`<style href precedence>` de-duplication, which keeps this package `"sideEffects": false`.
