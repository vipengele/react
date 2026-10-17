---
name: overlay-hooks-must-run-below-an-overlay-tree-shell
kind: invariant
description: useOverlayState must be called below an OverlayTreeShell and useModalDialog needs its dialog element rendered every render; both hooks are covered only through the Dialog and Drawer tests.
anchors:
  - path: source/react-ui/packages/ui/src/internal/useOverlayState.ts
    blob: bc34149c9907
  - path: source/react-ui/packages/ui/src/internal/useModalDialog.ts
    blob: 79d4d8cd4b40
  - path: source/react-ui/packages/ui/src/Drawer/Drawer.tsx
    blob: 2d2e1791caa0
confidence: suspect
---

Taken from the explorer's reading; only partly re-checked (`useModalDialog.ts:78-83` does guard `dialog.open` and
`isConnected`). `useOverlayState` calls `useOverlayTreeNode()`, so `Dialog` and `Drawer` each render the shell and
call the hook from an inner component. `useModalDialog` reads `dialogRef.current` in its open effect and assumes the
`<dialog>` renders every render, with `dialogProps.ref` spread onto it. `useOverlayState` takes
`outsidePress`, defaulting to `false` (`useOverlayState.ts:41`, passed to `useDismiss` at `:60`); `useModalDialog` leaves it
at the default (`useModalDialog.ts:57`) because a modal surface's page is inert, and only `NonModalDrawer` passes one
(`Drawer.tsx:186-190`). `Drawer` renders `OverlayTreeShell` and picks `ModalDrawer`/`NonModalDrawer` below it (`Drawer.tsx:119-120`). No test targets the hooks
directly, so an option neither component varies is uncovered under the 100% gate.
