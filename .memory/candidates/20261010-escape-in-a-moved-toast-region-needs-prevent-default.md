---
about: Escape inside the toast region must call both stopPropagation and preventDefault, because the host sits in the dialog's DOM but not in its React tree
saw:
  - source/react-ui/packages/ui/src/Toast/ToastRegion.tsx
  - source/react-ui/packages/ui/src/internal/useModalDialog.ts
---

- The region's host element is moved inside the `<dialog>` in the DOM, but React still renders the
  region where it was declared. `useModalDialog`'s `onKeyDownCapture` (`internal/useModalDialog.ts:164`)
  never sees the keydown, so the browser's native `cancel` event looks like a separate close
  request and closes the Dialog. Preventing the keydown's default raises no `cancel`
  (`ToastRegion.tsx:174-178`).
- React's synthetic `stopPropagation` is enough to keep floating-ui's `document` Escape listener
  from firing, for a region declared on the page and one declared inside the dialog; checked in
  Chromium by removing it, which closed the Dialog in both.
- The hotkey itself never calls `preventDefault`, so a browser or OS action bound to the same
  combination still fires.
