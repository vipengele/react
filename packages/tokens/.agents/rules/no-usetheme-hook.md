# Never add a `useTheme()` hook or any other JS-readable theme context

Components read theme values exclusively through `--tandiko-*` CSS custom properties set by
`ThemeProvider` on its scoped root. A context-based hook would let components branch on theme
values in JS, but it would also force a re-render on every theme change, break independently
themed nested `ThemeProvider`s, and couple component logic to a specific `Theme` shape. See
`docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md` for the full trade-off.

## Applies to

- `packages/tokens` (the provider itself).
- Any component package that consumes theme values (e.g. `packages/icons`, future
  `packages/ui`) — none of them may export or rely on a theme context/hook.

## Example

A component needing a theme value in JS (e.g. a canvas-drawn chart) reads a resolved CSS
custom property off its own DOM node at render time instead of importing a hook.
