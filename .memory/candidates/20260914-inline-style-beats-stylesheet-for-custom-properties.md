---
about: an inline style declaration always wins over a stylesheet rule for the same CSS custom property on the same element, which breaks ThemeProvider dark-mode reassignment
saw: packages/tokens/src/base-stylesheet.ts, packages/ui/src/Spinner/Spinner.tsx, packages/ui/.agents/rules/never-assign-theme-properties-inline.md
---

CSS custom-property (`--tandiko-*`) precedence follows ordinary inline-vs-stylesheet rules: an
inline `style` declaration on an element always beats a stylesheet rule targeting the same
property on that element, with no specificity contest possible. `@tandiko/tokens`'
`ThemeProvider` relies on reassigning `--tandiko-*` values inside its own stylesheet (see
`base-stylesheet.ts`) when the color mode changes. Any component that sets one of those same
properties via the React `style` prop object permanently shadows that reassignment for that
element — the element freezes at whatever value the inline style captured and stops adapting to
light/dark mode, silently, with no error anywhere.

This exact bug broke dark mode for `@tandiko/tokens`'s Storybook manager UI (fixed in the prior
slice's PR #11, referenced by `packages/ui`'s handoff document). The convention that avoids it,
followed by every `@tandiko/ui` component so far (Spinner, Button, Typography, ButtonGroup,
Avatar, Skeleton): a component may only *read* a `--tandiko-*` property through `var()` inside
its own injected stylesheet string, never assign one inline. `packages/ui`'s tests enforce this
per-component by asserting the rendered element's `style` attribute is `null` (or contains no
`--tandiko-` key when a non-theme inline override, like `Spinner`'s `color` prop, is set).

Any future component in this repo that introduces a new mode-dependent or externally-overridable
`--tandiko-*` property must assign it only inside the component's stylesheet string, and should
add the same "style attribute has no `--tandiko-*` key" assertion to its test suite.
