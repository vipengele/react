---
about: what is already decided for a not-yet-built AspectRatio, and that no "use client", slot/asChild or padding-hack precedent exists to follow
saw:
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/src/Stack/Stack.tsx
  - source/react-ui/packages/ui/src/Grid/Grid.tsx
  - source/react-ui/packages/ui/src/internal/space.ts
  - source/react-ui/packages/ui/src/Skeleton/Skeleton.stylesheet.ts
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/ui/.agents/rules/wrap-trigger-never-clone.md
---

Established while scoping AspectRatio (#58, Wave 1 of #40). `AspectRatio` does not exist yet
(grep `AspectRatio` finds only ADR-0019, CONTEXT.md:139 and ui/AGENTS.md).

- ADR-0019 already commits the shape: the inline property is `--vpg-aspect-ratio-ratio`, `ratio` is "a
  positive number, such as 16 / 9", a ratio is not a length so no scale applies. The primitive must
  always write it (default needed) so the stylesheet reads `var(--vpg-aspect-ratio-ratio)` bare;
  caller `style` is spread last (Stack.tsx, Grid.tsx pattern). Exact prop names/defaults are
  explicitly uncommitted.
- Siblings: Stack uses `ComponentPropsWithRef<C>` (ref reaches element), Grid uses
  `ComponentPropsWithoutRef<C>` (ref omitted); both take `as`, `Object.hasOwn` lookups so unknown
  values fall back to the default instead of passing through; both render `<><style href=
  "vpg-<name>" precedence="vpg-<name>">{sheet}</style><Component/></>`; sheet is a
  `<Name>.stylesheet.ts` string export. Grid writes `String(columns)` for its count.
- Counts/ratios go as an inline custom property, not a data attribute: ADR-0019 "Considered
  options" rejects data-attribute selectors because a number has no finite set to enumerate.
- No "use client" anywhere under source/react-ui/packages or docs (grep): no server-component
  directive convention exists. Components are not hook-free-checked anywhere either.
- No colour needed: Stack/Grid stylesheets read no colour tokens; ADR-0009 only governs
  `var(--vpg-*)` reads (bare, enforced by the glob test over every `src/**/*.ts(x)`), so a
  colourless component has nothing to satisfy. Existing `aspect-ratio: 1` appears in
  Skeleton.stylesheet.ts:61 and Button.stylesheet.ts:125 (a fixed literal, not a prop).
- Padding-bottom hack / Slot / asChild / cloneElement: no precedent or ADR. The only related rule
  is `.agents/rules/wrap-trigger-never-clone.md` (never cloneElement a caller child; wrap it),
  which argues for AspectRatio wrapping children in its own element, not cloning.
- Required companions in the same PR: bundle-check entry (`.agents/rules/
  update-bundle-check-with-every-component.md`), `src/index.ts` named export, Storybook story
  under apps/storybook/src, 100% v8 thresholds (ui/vitest.config.ts), geometry in
  `*.browser.test.tsx` (jsdom project excludes them, vitest.config.ts:~28).
- Risk analogous to Grid's accepted risk (ADR-0022): an invalid ratio value makes `aspect-ratio`
  invalid at computed-value time and the box silently collapses to auto; no console error.
