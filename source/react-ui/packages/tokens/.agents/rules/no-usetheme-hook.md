# Never add a `useTheme()` hook or any context that carries theme values

Components read theme values exclusively through `--vpg-*` CSS custom properties set by
`ThemeProvider` on its scoped root. A hook or context exposing the `Theme`, a seed or any token
value would let components branch on theme values in JS, but it would also force a re-render on
every theme change, break independently themed nested `ThemeProvider`s, and couple component
logic to a specific `Theme` shape. See
`docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md` for the full trade-off.

The one context `ThemeProvider` shares is the colour mode preference read and set through
`useColorMode()` (`colorMode`, `setColorMode`, `resolvedColorMode`). It is allowed because it
carries a user's mode choice, never a `Theme` or a token — see
`docs/adr/0034-themeprovider-owns-the-colour-mode-preference.md`. Do not widen it to carry theme
values, and do not add a second context that does.

`LocaleProvider` and `useLocale()` are exempt: a locale is not a theme value and cannot be a CSS
custom property — see `docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md`.

## Applies to

- `packages/tokens` (the provider itself).
- Any component package that consumes theme values (e.g. `packages/icons`, `packages/ui`) — none
  of them may export or rely on a hook or context that returns `Theme` or token values.

## Example

A component needing a theme value in JS (e.g. a canvas-drawn chart) reads a resolved CSS
custom property off its own DOM node at render time instead of importing a hook. A component
that needs to know whether the user chose light, dark or system calls `useColorMode()`.
