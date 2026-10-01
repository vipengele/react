---
about: ui-token-reads-carry-no-fallback and custom-property-read-back-is-unresolved re-read while planning Inline
saw:
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/ui/AGENTS.md
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---

Claim holds, but is incomplete for layout primitives: a primitive's stylesheet must read
`var(--vpg-inline-gap)` bare, which the glob test also covers; ADR-0019:52-54 requires the component to
always write the property so no fallback is needed. The vitest.config.ts pointers (jsdom project
excludes browser tests; `browserTests` at `:6`) still hold. `theme.ts` line pointers were not
re-checked (tokens file changed), so those specific numbers are unchecked; use `theme.ts:240-247` for
the space scale.
