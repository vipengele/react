---
name: toast-region-escape-needs-prevent-default
kind: gotcha
description: Escape inside the toast region must call both stopPropagation and preventDefault, because the region's host sits in the dialog's DOM but not in its React tree.
anchors:
  - path: source/react-ui/packages/ui/src/Toast/ToastRegion.tsx
    blob: 666de88dbac9
  - path: source/react-ui/packages/ui/src/internal/useModalDialog.ts
    blob: 79d4d8cd4b40
confidence: verified
---

`ToastRegion.tsx:176-182`: `stopPropagation` stops `useDismiss`'s document listener closing the innermost
overlay; `preventDefault` stops a modal `<dialog>` the host was moved into from raising its native
`cancel`, which `Dialog` would read as a close request because the keydown passes through the dialog in
the DOM but not through `useModalDialog`'s handlers in the React tree. The hotkey that focuses the region
never calls `preventDefault`, so a browser/OS action on the same combination still fires.
