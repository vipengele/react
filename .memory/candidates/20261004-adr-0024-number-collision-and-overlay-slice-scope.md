---
about: two ADRs are numbered 0024; cite by filename. The overlay one is implemented (useOverlayRoot, overlayTree, five-step layer scale) and carries no status block
saw:
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
  - docs/adr/0024-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md
  - docs/adr/0026-menu-and-dropdown-are-separate-components.md
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/internal/overlayTree.tsx
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
---
`ls docs/adr | grep 0024` -> two files. Tree.tsx, ui/README.md and ui/AGENTS.md cite "ADR 0024"
meaning the Tree ADR; ADR-0026 cites "ADR-0024" meaning the overlay ADR. Bare "ADR 0024" is
ambiguous; cite by filename.

The overlay ADR is implemented. Every overlay (Popover, Tooltip, Menu, the Dropdown listbox) portals
through `useOverlayRoot` and joins one `FloatingTree` through `OverlayTreeShell` /
`useOverlayTreeNode`. `theme.ts` carries five layer tokens: drawer 1000, popover 1100, listbox and
menu 1200, tooltip 1300. `Dialog/Dialog.tsx` is the producer of `data-vpg-overlay-root`; the Popover, Tooltip and Menu
portal-target tests use a fixture ancestor instead.

`bundle-check/run.mjs` has two entries, `entry.js` (Button only) and `entry-tree.js` (Tree only).
Neither reaches an overlay, so its floating-ui absence markers stay valid; the markers remain
absence-only, the same gap as bundle-check-floating-ui-markers-lack-positive-control.
