---
name: role-group-div-needs-biome-ignore
kind: gotcha
description: Biome's useSemanticElements rejects role="group" on a div, so a non-form grouping root carries a biome-ignore with a reason why a fieldset is wrong.
anchors:
  - path: source/react-ui/packages/ui/src/StatTile/StatTile.tsx
    blob: e470965a1d89
  - path: source/react-ui/packages/ui/src/internal/menuPanel.tsx
    blob: 02d787a37486
  - path: source/react-ui/packages/ui/src/TimeField/TimeField.tsx
    blob: 4dc29d5a34da
confidence: verified
---

`pnpm lint` runs `biome lint --error-on-warnings`, and `lint/a11y/useSemanticElements` flags `<div role="group">`.
`StatTile.tsx:84`, `internal/menuPanel.tsx:538` and `TimeField.tsx:142` suppress it with a `biome-ignore` stating why a
`<fieldset>` is wrong there (form-control semantics and its own chrome). A new non-form grouping root needs the same ignore
with a reason.
