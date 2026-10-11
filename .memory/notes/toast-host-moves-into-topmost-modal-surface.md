---
name: toast-host-moves-into-topmost-modal-surface
kind: rationale
description: A top-layer popover outside an open modal dialog is inert, so the toast region renders into a host element that useModalSurfaceHost moves into the topmost open overlay-root surface.
anchors:
  - path: source/react-ui/packages/ui/src/Toast/useModalSurfaceHost.ts
    blob: cc6413b6998d
  - path: source/react-ui/packages/ui/src/Toast/useModalSurfaceHost.browser.test.tsx
    blob: e58cdf42ca10
confidence: verified
---

`showModal()` makes everything outside the dialog's subtree inert, a `popover="manual"` element in the top
layer included: re-showing it only fixes paint order, and a live region inside it is silent. So the region
portals into a host `div` (`useModalSurfaceHost.ts:152`) that is moved into the topmost open
`[data-vpg-overlay-root][open]` surface and back as surfaces close, re-showing the popover after each move
(`:122-123`, `:147-148`). `moveBefore` (`:45-56`) keeps a shown popover open and its computed styles; a plain
insert hides it and replays each toast's `@starting-style` entry. The DOM does not expose top-layer order,
so the hook tracks open order from `open` attribute mutations. Browser tests prove it with CDP, because
`elementFromPoint` ignores inert content: `DOM.getNodeForLocation` (`useModalSurfaceHost.browser.test.tsx:55`)
and `Accessibility.getPartialAXTree` (`:90`), where a page button behind the dialog reports `ignored: true` as the control.
