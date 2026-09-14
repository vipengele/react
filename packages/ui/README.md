# @tandiko/ui

Tandiko's themeable React component library. Components read theme exclusively through
`--tandiko-*` CSS custom properties set by `@tandiko/tokens`' `ThemeProvider` — there is no
`useTheme()` hook (see `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`).

```tsx
import { Spinner } from "@tandiko/ui";

<Spinner size="md" />;
```

## Tree-shaking

Components are plain named exports — never a namespace barrel — so a consumer importing one
component pulls in only that component and its stylesheet.

## Styling

Each component ships its styles as a string injected through React 19's
`<style href precedence>`, not as a `.css` import: a stylesheet import is the module side effect
that `"sideEffects": false` would have to carve an exception for. React hoists and de-duplicates
by `href`, so N instances inject one stylesheet.

Theme properties are only ever *read* through `var()` in those stylesheets, never assigned as an
inline style. An inline declaration beats any stylesheet rule for the same property on the same
element, so an inline `--tandiko-*` value would permanently shadow `ThemeProvider`'s dark-mode
reassignment and that instance would stop adapting to colour mode.

## Components

### `Spinner`

An indeterminate loading indicator. Sizes `sm | md | lg` (from `--tandiko-spinner-size-*`, with
fallbacks baked into its own stylesheet), stroked in `var(--tandiko-accent)`, rotated by a CSS
`@keyframes` rule that slows under `prefers-reduced-motion: reduce`. Exposes `role="status"` with
a `label` (default `"Loading"`) as its accessible name.

`color` sets an inline stroke override. It is an opt-in escape hatch for a spinner sitting on a
ground the theme doesn't know about: that instance no longer adapts to light/dark.

## Peer dependencies

React 19 and React DOM 19 — components render React and rely on `<style href precedence>`.
