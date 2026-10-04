---
about: Shipped overlays portal through useOverlayRoot, share one token z-scale and one FloatingTree; there is still no scroll lock, native top layer or <dialog>/popover attr, and nothing produces data-vpg-overlay-root
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/AGENTS.md
  - source/react-ui/packages/ui/.agents/rules/portal-floating-ui-into-tandiko-root.md
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/internal/overlayTree.tsx
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md
---

- Portal owner: `useOverlayRoot(reference)` in `internal/useOverlayRoot.ts` is the only caller of
  `createPortal` for overlays. Target: nearest ancestor carrying `data-vpg-overlay-root`, else
  nearest `.vpg-root`, else inline - never `document.body`. Reason: `--vpg-*` live on `.vpg-root`,
  not `:root`. An overlay root wins even over a nearer `.vpg-root`. Popover, Tooltip and the
  Dropdown listbox (via `useListboxKeyboard`) all call it with `elements.domReference`.
- z-index: `--vpg-layer-drawer/-popover/-listbox/-menu/-tooltip` = 1000/1100/1200/1200/1300
  (`tokens/src/theme.ts`; the comment above them gives the containment order). ui AGENTS.md forbids
  component-local z-index literals. All overlays are `position: absolute` (floatingStyles), not
  `fixed`, and not top-layer.
- Dismissal: every overlay is a `FloatingTree` node (`OverlayTreeShell` + `useOverlayTreeNode` in
  `internal/overlayTree.tsx`), so Escape closes only the innermost overlay and an outside press
  closes the chain. Popover is the only modal `FloatingFocusManager`; Dropdown search mode is
  non-modal.
- Not implemented: scroll lock, a producer of `data-vpg-overlay-root` (Dialog/Drawer), native top
  layer (`<dialog>`, `popover=`, `showPopover`). ADR 0002 rejects only hand-rolled fixed
  positioning and a body portal. A top-layer element escapes `.vpg-root` stacking while keeping
  DOM-tree token inheritance, which would make the z-scale moot for it.
