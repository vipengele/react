# Never use `export * from "lucide-react"` or a name-to-component lookup for icons

Icons must be re-exported as individually named exports so a consumer importing one glyph
pulls in only that glyph. A namespace barrel or a name-to-component lookup table would have to
reference the whole curated set (or all of `lucide-react`), defeating tree-shaking for every
consumer regardless of how many icons they actually use.

## Applies to

- `packages/icons/src/icons.ts` and any file adding new curated icons.

## Example

```ts
// Correct — named, tree-shakable
export const ChevronDown: IconComponent = LucideChevronDown;

// Wrong — pulls in the full set for any consumer
export * from "lucide-react";
```

Adding a new icon also means adding its lucide id to the `unrelatedCuratedIcons` list in
`packages/icons/bundle-check/run.mjs`, which is what `pnpm test` uses to prove this rule holds.
