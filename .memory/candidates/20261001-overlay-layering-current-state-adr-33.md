---
about: Overlays portal through one hook (useOverlayRoot: nearest [data-vpg-overlay-root], else .vpg-root, else inline), share one token z-scale, dismiss independently with no FloatingTree; Dialog is the one native-top-layer component and the base stylesheet carries the scroll lock
saw:
  - source/react-ui/packages/ui/src/internal/useOverlayRoot.ts
  - source/react-ui/packages/ui/src/Popover/Popover.tsx
  - source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/ui/.agents/rules/portal-floating-ui-into-tandiko-root.md
  - docs/adr/0002-floating-ui-for-tooltip-and-popover-positioning.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
---

Current state of overlay layering, replacing the pre-Dialog snapshot gathered for issue #33.

- Portal owner: `useOverlayRoot(reference)` (useOverlayRoot.ts:13) is `closest("[data-vpg-overlay-root]") ?? closest(".vpg-root") ?? null`; `null` means render inline, never `document.body` (ADR 0002). Popover.tsx:145, Tooltip.tsx:96 and useListboxKeyboard.ts:276 call it (Dropdown reads it from the keyboard hook's `overlayRoot`). Each component still calls `createPortal` itself; ADR 0024 wants the hook to own both, which is not built. Precedence is "nearest marker wins over a nearer `.vpg-root`": a `ThemeProvider` nested inside a Dialog does not receive overlays opened from inside it, they portal to the dialog.
- Marker: only `Dialog` carries `data-vpg-overlay-root` (Dialog.tsx). A marker holder must never clip (`overflow: visible`, Dialog.stylesheet.ts:38), since overlays position absolutely against it.
- Scroll lock: the tokens base stylesheet holds `html:has([data-vpg-overlay-root][open])` (base-stylesheet.ts:117); needs `:has()` support.
- z-index: `--vpg-layer-listbox/-popover/-tooltip` = 1000/1100/1200 (tokens/src/theme.ts), all siblings in one stacking context under `.vpg-root`, overlays `position: absolute`. A Dialog takes no layer step: the top layer paints above every z-index.
- Dismissal: each overlay has its own independent `useDismiss`. No `FloatingTree`, `useFloatingParentNodeId`, `FloatingPortal` or `FloatingOverlay` in packages/, so Escape in a Popover or Dropdown inside a Dialog is not coordinated with the Dialog. ADR 0024 stays `proposed`.
