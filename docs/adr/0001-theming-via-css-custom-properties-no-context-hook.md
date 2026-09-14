# Theme values flow through CSS custom properties only, never a `useTheme()` hook

`@tandiko/ui` components read theme exclusively via `--tandiko-*` CSS custom properties set by
`ThemeProvider` on a scoped root element; no context-based `useTheme()` hook is exposed. This
follows the pattern proven in `hatua/main/source/packages/react/src/theme/HatuaProvider.tsx`
rather than the more common React pattern of a theme context consumers read in JS.

The trade-off: a JS-readable theme would let components branch on theme values (e.g. picking an
icon colour prop conditionally) and would be the more familiar API to a React developer. CSS-var
consumption gives up that JS branching in exchange for zero re-renders on theme change, correct
behaviour with multiple independently-themed `ThemeProvider` instances on one page without prop
drilling, and no coupling between component logic and a specific theme shape — a component that
never imports the theme type cannot become the reason bumping `ThemeSeed` requires touching every
component.

`ThemeProvider` also relies on React 19's `<style href precedence>` for base-stylesheet injection,
making React 19 a peer-dependency floor for `@tandiko/tokens` and `@tandiko/icons` (both render
React) — a real constraint on consumers, not an implementation detail, since it excludes anyone
still on React 18.

A component that genuinely needs a theme value in JS (a canvas-drawn chart, say) can still read a
resolved CSS custom property off its own DOM node at render time; this has not yet been needed and
is deferred until a real case shows up.
