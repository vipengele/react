# Tandiko Design System

The monorepo's design-system context: the themeable component library consumers use to build
Tandiko-branded UI, the tooling that packages it, and the sites that showcase it.

## Language

**Seed**:
The small set of user-supplied values (accent colour, ink, surface, radius, font families) that
`createTheme` expands into a full `Theme`. A consumer customizes a theme by overriding seeds, not
by hand-authoring every derived value.
_Avoid_: theme input, config

**Theme**:
The frozen, complete set of `--tandiko-*` CSS custom properties produced by `createTheme` from a
seed — ramps (hover/press/wash states, dark variants) included. What `ThemeProvider` applies to
its root element.
_Avoid_: theme object, tokens (tokens is the package name, not this value)

**ThemeProvider**:
The composition-root component from `@tandiko/tokens` that applies a `Theme` as inline CSS custom
properties on a scoped root element and sets `colorMode`. Components never read theme via a hook —
only via CSS custom properties in their own stylesheets.
_Avoid_: TandikoProvider (rejected — see below), useTheme (no such hook exists)

**ColorMode**:
`'light' | 'dark'`, applied as `data-tandiko-mode` on `ThemeProvider`'s root. Omitted, it inherits
the host page's own `[data-theme]` attribute or `prefers-color-scheme`.
_Avoid_: theme mode, dark mode flag

**Slice**:
One landable, independently mergeable pull request in the design-system feature's build order.
Each slice ships its own components' Storybook stories in the same PR — Storybook is never left
behind a component that already exists.
_Avoid_: phase, milestone (this repo's usage is specifically about PR-sized, CI-green units)

## Flagged ambiguities

**"Themeable"** — the request asked for controls to be themeable via "a theme provider that allows
easy ui colors, sizes, etc to be customized." Resolved as: consumers override `ThemeSeed` values
(not individual component styles) and everything else derives. Per-component style overrides are
out of scope for the theming system itself; consumers wanting that reach for `className`/CSS
Modules composition as usual.

**Namespaced JSX (`<tandiko:card>`)** — raised and rejected: JSX does not support colon-namespaced
custom component tags. The closest equivalent, a namespace-import barrel (`import * as Tandiko
from '@tandiko/ui'`), was also rejected because it conflicts with the tree-shaking requirement on
`@tandiko/ui`. Resolution: plain named exports, direct imports only
(`import { Button } from '@tandiko/ui'`).

## Example dialogue

> **Dev:** Does a consumer who wants a different accent colour write CSS overriding
> `--tandiko-accent`, or pass a seed?
> **Design-system owner:** They pass a seed — `<ThemeProvider theme={createTheme({ accent: '...' })}>`.
> Overriding the CSS variable directly works too since it's just a custom property, but the
> supported path is the seed, because that's what keeps hover/press/dark ramps coherent with it.
> **Dev:** And if two `<ThemeProvider>`s are nested with different seeds?
> **Design-system owner:** Each is scoped to its own root element via inline styles, so the inner
> one's subtree gets its own theme — they don't merge.
