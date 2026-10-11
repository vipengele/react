---
name: confirm-dialog-autofocus-is-a-dom-attribute
kind: gotcha
description: ConfirmDialog toggles the DOM autofocus attribute in a layout effect because React's autoFocus cannot focus inside a Dialog that opens in an effect.
anchors:
  - path: source/react-ui/packages/ui/src/ConfirmDialog/ConfirmDialog.tsx
    blob: b3ac0d68fbfe
  - path: source/react-ui/packages/ui/src/internal/useModalDialog.ts
    blob: 79d4d8cd4b40
confidence: verified
---

`useModalDialog` calls `showModal()` from an effect after children mounted (`useModalDialog.ts:78-83`).
React's `autoFocus` prop calls `focus()` once at mount, while the `<dialog>` is still closed, so it
never moves focus, and it renders no `autofocus` attribute for `showModal()`'s focusing steps to read.
`ConfirmDialog.tsx:82-93` therefore uses `toggleAttribute("autofocus", ...)` in a `useLayoutEffect`
(Cancel for the danger tone, Confirm otherwise), which runs before the dialog's open effect. The
attribute also restores focus when a second Escape force-closes the dialog and it is reopened. Only
observable in real Chromium (`ConfirmDialog.browser.test.tsx`); jsdom stubs `showModal`.
