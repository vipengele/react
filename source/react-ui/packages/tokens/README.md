# @tandiko/tokens

Seed-and-derive theming for the tandiko design system: `createTheme` and `ThemeProvider`.

```tsx
import { createTheme, ThemeProvider } from "@tandiko/tokens";

const theme = createTheme({ accent: "oklch(0.62 0.19 264)" });

<ThemeProvider theme={theme}>
  <App />
</ThemeProvider>;
```

## Seeding

A `ThemeSeed` is the small set of values a consumer supplies — `accent`, `ink`, `surface`,
`radius`, `fontSans`, `fontMono`. Each has a default, so `createTheme()` returns a complete
theme. `createTheme` expands the seed into a frozen `Theme`: a flat, JSON-serializable record
of `--tandiko-*` CSS custom properties.

## Ramps are CSS, not JavaScript

The hover/press/wash/dark ramps are `oklch()` relative-colour expressions, not colours
computed at build time:

```css
--tandiko-accent-hover: oklch(
  from var(--tandiko-accent) calc(l + var(--tandiko-state-shift)) c h
);
```

The browser resolves them at paint time from whatever `--tandiko-accent` currently is, so a
mode flip reassigns three colours and three scalars and the whole ramp follows — no second
theme object, no re-render.

## Colour mode

`colorMode="light" | "dark"` writes `data-tandiko-mode` on the provider's root. Omit it and
the base stylesheet lets the host page's `:root[data-theme="dark"]` or the OS
`prefers-color-scheme` decide; an explicit `colorMode` always wins over both.

## No `useTheme()`

There is no hook. Components read theme values through CSS custom properties in their own
stylesheets. See `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`.

## Peer dependencies

React 19 and React DOM 19. The base stylesheet is injected through React 19's
`<style href precedence>` de-duplication, which keeps this package `"sideEffects": false`.
