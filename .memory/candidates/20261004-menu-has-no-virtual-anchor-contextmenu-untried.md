---
about: ContextMenu anchors to a virtual reference through setPositionReference, so floating-ui holds no DOM reference; the overlay root, the focus return target and the outside-press behaviour each need an explicit stand-in that a trigger-anchored Menu gets for free
saw:
  - source/react-ui/packages/ui/src/ContextMenu/ContextMenu.tsx
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/internal/menuPanel.tsx
  - docs/adr/0031-context-menu-shares-menu-panel.md
---

Checked 2026-10-05, after `ContextMenu` landed. Menu and ContextMenu are two shells over `src/internal/menuPanel.tsx`; Menu anchors with `refs.setReference` on its trigger wrapper, ContextMenu only ever calls `refs.setPositionReference` (ContextMenu.tsx).

- `useOverlayRoot(reference)` resolves the portal target with `reference?.closest(...)` and returns the node unchanged (inline) when that is `null` (useOverlayRoot.ts). A virtual anchor leaves `elements.domReference` unset, so ContextMenu passes its `display: contents` target wrapper instead. Without that, the panel renders inline and escapes a Dialog's `data-vpg-overlay-root`.
- `FloatingFocusManager` returns focus to the floating reference on close; a virtual one gives it nothing to return to. `MenuPanel` takes an optional `returnFocus` ref (menuPanel.tsx) and ContextMenu records `document.activeElement` when it opens, or `null` when focus is on `body`.
- With no DOM reference, every press outside the panel is an outside press, the target included. A secondary click on the target while open therefore closes the menu (pointerdown) and the `contextmenu` event reopens it at the new point: `onOpenChange` sees open, close, open.
- A menu opened by `open`/`defaultOpen` with no gesture has no anchor, so ContextMenu falls back to the target's first element.
