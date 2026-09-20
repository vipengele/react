# Never style a component with a `.css` or CSS Module import

Ship every component's styles as a template string injected via React 19's
`<style href precedence>`, never as a `.css` or CSS Module import. CSS Modules were tried and
rejected here: tsup/esbuild emits an empty class map for them, and Vitest's own module
resolution hides the breakage, so the package's tests stay green while the built package ships
with no styles at all.

## Applies to

- Every component under `packages/ui/src/*/*.tsx` — styles live in a sibling `.stylesheet.ts`
  exporting a plain string, not a `*.module.css` or `*.css` file.

## Example

```ts
// Correct — packages/ui/src/Button/Button.stylesheet.ts
export const buttonStylesheet = `
  .vpg-button { color: var(--vpg-ink-primary); }
`;
```

```ts
// Wrong — silently ships with no styles, and the tests won't catch it
import styles from "./Button.module.css";
```
