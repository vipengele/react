# Never assign a theme-assigned `--vpg-*` custom property as an inline style

A component may only *read* `--vpg-*` properties through `var()` in its stylesheet. An
inline style declaration beats every stylesheet rule for the same property on the same element,
including `@vipengele/react-tokens`' `ThemeProvider` dark-mode reassignment — so an inline theme property
permanently shadows it and that instance silently stops adapting to colour mode.

The one exception is a layout primitive's own component-scoped property,
`--vpg-<primitive>-<prop>` (`--vpg-stack-gap`), which no theme or stylesheet assigns. A primitive
sets it inline, and only to a `var()` read of a theme token, `0`, a mapped keyword, or a count or
ratio — never a resolved length — so the instance still follows the theme
(`docs/adr/0019-layout-primitives-accept-token-values-only.md`).

## Applies to

- Every component under `packages/ui/src/*/*.tsx` and its `.stylesheet.ts`.
- Any new component reading theme: forward props into `var()` lookups in the stylesheet, never
  into a `style={{ "--vpg-...": value }}` object.

## Example

```tsx
// Correct — theme property stays a var() read in the stylesheet
<button className="vpg-button" data-variant={variant} />

// Wrong — permanently shadows ThemeProvider's dark-mode reassignment
<button style={{ "--vpg-accent": "#4f46e5" }} />

// Correct — a layout primitive's own property, pointing at a theme token
<div className="vpg-stack" style={{ "--vpg-stack-gap": "var(--vpg-space-3)" }} />

// Wrong — a resolved length stops following the theme's spacing scale
<div className="vpg-stack" style={{ "--vpg-stack-gap": "13px" }} />
```

An explicit, non-theme override like `Spinner`'s `color` prop is a documented escape hatch that
opts an instance out of colour-mode adaptation on purpose — it sets a plain CSS property
(`stroke`), never a `--vpg-*` custom property.
