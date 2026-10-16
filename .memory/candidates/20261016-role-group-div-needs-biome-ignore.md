---
about: Biome useSemanticElements rejects role="group" on a div, so such a root carries a reasoned biome-ignore
saw:
  - source/react-ui/packages/ui/src/StatTile/StatTile.tsx
  - source/react-ui/packages/ui/src/internal/menuPanel.tsx
---
`pnpm lint` runs `biome lint --error-on-warnings`, and `lint/a11y/useSemanticElements` flags
`<div role="group">`. StatTile.tsx and internal/menuPanel.tsx suppress it with a `biome-ignore`
stating why a `<fieldset>` is wrong there (form-control semantics and its own chrome). A new
non-form grouping root needs the same ignore with a reason.
