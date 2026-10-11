---
name: non-modal-popover-closes-only-when-focus-lands-elsewhere
kind: gotcha
description: A non-modal Popover closes on Tab only when focus lands on another element; if nothing follows the panel in the DOM, focus leaves the document and the panel stays open.
anchors:
  - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
    blob: 9b43d6d0a650
  - path: source/react-ui/packages/ui/src/Popover/Popover.browser.test.tsx
    blob: a421f7eecc5d
confidence: suspect
---

Reported from a Chromium test, not reproduced here. The panel portals through `useOverlayRoot`
(`Popover.tsx:190`), appended at the end of the nearest `.vpg-root`, with no `FloatingPortal` and so no focus
guards. Tabbing past the last element of a `modal={false}` panel moves focus to whatever follows in the DOM;
when nothing does, focus leaves the document, `focusout` has a null `relatedTarget`, and floating-ui's
`closeOnFocusOut` closes only when `relatedTarget` is set. Escape and outside press still close it. The
SideNav rail flyout inherits this. `Popover.browser.test.tsx` pins the supported case with a button after the root.
