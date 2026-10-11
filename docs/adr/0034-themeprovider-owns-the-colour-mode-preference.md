# `ThemeProvider` owns the colour mode preference, and `useColorMode()` reads and sets it

A consumer building a light / dark / system switch needs three things the theming system holds:
the preference in force, a way to change it, and the mode that preference actually paints in. The
first two belong to the `ThemeProvider` whose subtree they govern; the third depends on the host
page's `[data-theme]` and the user's `prefers-color-scheme`, which only the browser knows.
ADR-0001 keeps every theme value out of JS. This ADR records what crosses into JS for the mode,
and why that does not reopen ADR-0001.

## Decisions

- **The preference is `ColorModePreference`: `'light' | 'dark' | 'system'`.** `'light'` and
  `'dark'` write `data-vpg-mode` on the provider root. `'system'` writes no attribute, so the base
  stylesheet falls through to the host page's `[data-theme]` or `prefers-color-scheme` exactly as an
  omitted mode does (ADR-0007).
- **`ThemeProvider` owns the preference, controlled or uncontrolled.** `colorMode` controls it;
  omitted, the provider holds it itself, starting from `defaultColorMode` (default `'system'`).
  `onColorModeChange` is called with every preference `setColorMode` is given, in both shapes.
- **`useColorMode()` returns `{ colorMode, setColorMode, resolvedColorMode }` for the nearest
  provider.** Nested providers are independent: the hook binds to the closest one, and setting it
  leaves every other provider's mode alone. Called outside a provider it throws, since there is no
  mode to read or set.
- **The context carries the preference and its setter, never the `Theme`.** No theme value, seed
  or token is readable through it, so ADR-0001's trade-off stands unchanged for everything it was
  about: components still read theme values only through `--vpg-*` custom properties, a theme change
  re-renders nothing, and no component logic couples to the `Theme` shape. A change of mode
  re-renders only the components that call `useColorMode()`.
- **`resolvedColorMode` is `ColorMode | undefined`.** An explicit preference resolves to itself,
  on the server too. `'system'` resolves the way the base stylesheet does — `<html data-theme>`
  when it is `'light'` or `'dark'`, otherwise `prefers-color-scheme` — and is `undefined` on the
  server and on the first hydration pass, where neither can be read.
- **The provider does no persistence.** It reads no storage, writes no cookie and touches nothing
  outside its own root. A consumer that remembers a choice seeds it through `defaultColorMode` (or
  `colorMode`) and saves it from `onColorModeChange`, with whatever storage and whatever
  server-rendering strategy suits it. A provider that persisted would have to pick a storage key,
  a storage medium and a policy for two providers on one page, and every one of those is the
  consumer's call.

## Why ADR-0007's rejected listener is acceptable here

ADR-0007 rejected having `ThemeProvider` pick dark values in JS because recovering a fall-through
mode "means a media-query listener and reading ancestor DOM, which renders the wrong mode on the
server and then flashes". `useColorMode()` does read `<html data-theme>` and listens to
`prefers-color-scheme`, and the objection does not carry over, for two reasons:

- **The listener feeds `resolvedColorMode` only.** Nothing that paints is derived from it.
  `data-vpg-mode` is written from the preference alone, and under `'system'` it is absent, so the
  cascade resolves the mode exactly as ADR-0007 requires and the first paint is already correct.
- **The first server and hydration value is `undefined`, not a guess.** A consumer rendering an
  icon or label from `resolvedColorMode` sees "not known yet" rather than a wrong mode, and
  server and client agree on the first pass, so there is no hydration mismatch. What can change
  after hydration is the consumer's own UI keyed off the resolved mode, never the theme.

ADR-0007's invariant — every mode-resolved property is assigned by the base stylesheet — is
untouched.

## What this amends

- **Amends `docs/adr/0001-theming-via-css-custom-properties-no-context-hook.md`.** Its "no context
  hook" holds for theme values: there is no `useTheme()`, and no context carries a `Theme` or a
  token. The provider does share one context, carrying the mode preference and its setter, which is
  not a theme value and which ADR-0001's trade-off does not cover.

## Considered options

- **Consumer-owned state, no hook.** The consumer keeps the preference in its own state and passes
  `colorMode` down; a switch deep in the tree gets the setter by prop drilling or a context of the
  consumer's own. Rejected because every consumer then rebuilds the same context, and a switch
  shipped by this design system has no way to reach the provider it should change. It also leaves
  `'system'` resolution — mirroring the stylesheet's `[data-theme]`-then-media order — to be
  reimplemented per consumer, and a reimplementation that disagrees with the stylesheet shows the
  wrong icon for the mode on screen. The controlled `colorMode` prop keeps this shape available to
  a consumer that wants it.
- **A context that also carries the `Theme`.** One context with the mode and the theme would serve
  a component that wants to branch on a theme value in JS. Rejected because it is the `useTheme()`
  ADR-0001 declined: it would let component logic couple to the `Theme` shape and re-render every
  reader on a theme change, and once a `Theme` is readable in JS a component will branch on it. The
  mode preference is a choice the user makes, not a theme value, and keeping the context to that
  is what makes it compatible with ADR-0001.
