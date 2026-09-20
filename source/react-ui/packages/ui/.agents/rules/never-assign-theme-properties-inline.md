# Never assign a `--tandiko-*` custom property as an inline style

A component may only *read* `--tandiko-*` properties through `var()` in its stylesheet. An
inline style declaration beats every stylesheet rule for the same property on the same element,
including `@tandiko/tokens`' `ThemeProvider` dark-mode reassignment — so an inline theme property
permanently shadows it and that instance silently stops adapting to colour mode.

## Applies to

- Every component under `packages/ui/src/*/*.tsx` and its `.stylesheet.ts`.
- Any new component reading theme: forward props into `var()` lookups in the stylesheet, never
  into a `style={{ "--tandiko-...": value }}` object.

## Example

```tsx
// Correct — theme property stays a var() read in the stylesheet
<button className="tandiko-button" data-variant={variant} />

// Wrong — permanently shadows ThemeProvider's dark-mode reassignment
<button style={{ "--tandiko-accent": "#4f46e5" }} />
```

An explicit, non-theme override like `Spinner`'s `color` prop is a documented escape hatch that
opts an instance out of colour-mode adaptation on purpose — it sets a plain CSS property
(`stroke`), never a `--tandiko-*` custom property.
