---
about: Shipped overlays share one portal root (.vpg-root), one token z-scale, floating-ui useDismiss per overlay, and have no scroll lock, FloatingTree, native top layer or <dialog>/popover attr
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/AGENTS.md
  - source/react-ui/packages/ui/.agents/rules/portal-floating-ui-into-tandiko-root.md
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md
---

Gathered for the ADR on issue #33 (overlay layering / portal ownership).

- Portal owner: each component computes `elements.domReference?.closest(".vpg-root")` and `createPortal`s into it; no `.vpg-root` ancestor -> renders inline, never `document.body` (Tooltip.tsx:94,113; Popover.tsx:165; Dropdown.tsx:987-993; useListboxKeyboard.ts:276-279; rule `ui/.agents/rules/portal-floating-ui-into-tandiko-root.md`; ADR 0002:14-26). Reason: `--vpg-*` live on `.vpg-root`, not `:root` (tokens AGENTS.md:43-45). Nearest root wins when nested (Tooltip.test.tsx:123). Not a shared helper: the lookup is repeated per component. A portal-owner/Dialog ADR must also keep ADR 0001 (no context hook) in mind.
- z-index: `--vpg-layer-listbox/-popover/-tooltip` = 1000/1100/1200 (tokens/src/theme.ts:322-330, comment explains: all overlays are siblings in ONE stacking context under `.vpg-root`, so a shared value leaves order to mount order; order is containment). Consumed at listbox.stylesheet.ts:26,59, Popover.stylesheet.ts:29, Tooltip.stylesheet.ts:30. ui AGENTS.md:101 forbids component-local z-index literals. Scale is only 3 steps; no layer for dialog/drawer/menu/toast yet. All overlays are `position: absolute` (floatingStyles), not `fixed`, and not top-layer.
- Dismissal: each overlay has its own independent `useDismiss` (Tooltip.tsx:63 referencePress:false; Popover.tsx:94 defaults; useListboxKeyboard.ts:211-224 custom outsidePress excluding the field, outsidePressEvent "click" in search mode). No `FloatingTree`/`useFloatingParentNodeId`/`FloatingPortal`/`FloatingOverlay` anywhere in packages/ (grep of source/react-ui/packages -> 0 hits). So "Escape closes innermost only" is NOT implemented; it is floating-ui's tree-aware behaviour that needs FloatingTree wiring. Popover is the only modal `FloatingFocusManager` (Popover.tsx:131); Dropdown search mode is non-modal.
- Scroll lock: none. grep for FloatingOverlay|lockScroll|preventScroll|overflow hidden on body -> only unrelated component `overflow: hidden`.
- Native top layer: no `<dialog>`, `popover=` attribute or `showPopover` in packages/, docs/ or READMEs (grep). No prior attempt or rejected-alternative recorded. ADR 0002 rejects only hand-rolled fixed positioning and body portal. Consequence to weigh: top-layer elements escape `.vpg-root` stacking, and a portal into `.vpg-root` still inherits tokens (top-layer keeps DOM-tree inheritance, only paint order changes), which would make the z-scale moot for those overlays.
