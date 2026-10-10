---
about: useOverlayState and useModalDialog are shared by Dialog and Drawer - they must run below an OverlayTreeShell, the dialog element has to render every render, and the hooks are covered only through those two components' tests
saw:
  - source/react-ui/packages/ui/src/internal/useOverlayState.ts
  - source/react-ui/packages/ui/src/internal/useModalDialog.ts
  - source/react-ui/packages/ui/src/internal/overlayTree.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/ui/src/Drawer/Drawer.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.test.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.browser.test.tsx
  - source/react-ui/packages/ui/src/Drawer/Drawer.test.tsx
  - source/react-ui/packages/ui/src/Drawer/Drawer.browser.test.tsx
---

Read, not inferred.

- `useOverlayState` calls `useOverlayTreeNode()`, so its caller must sit below an
  `OverlayTreeShell`. `Dialog` and `Drawer` are each the shell and their `*Inner` component is the
  hook caller; a component that calls the hook in the same function that renders the shell would
  have no tree to register in.
- `useModalDialog` assumes the `<dialog>` is rendered on every render: its open effect reads
  `dialogRef.current` without a null check. A caller that renders the element conditionally breaks
  that, and `dialogProps.ref` must be spread onto it.
- `Dialog` and `Drawer` pass `defaultOpen` through as `undefined` when absent; the `false` default
  lives only in `useOverlayState`, so a further caller inherits it instead of repeating it.
- `useDismiss` is fixed to `{ outsidePress: false }` in `useOverlayState`: a modal surface never
  dismisses on an outside press because the page behind it is inert. A non-modal overlay would need
  that made an option.
- No test targets the hooks directly. `Dialog.test.tsx` and `Drawer.test.tsx` (jsdom),
  `Dialog.browser.test.tsx` and `Drawer.browser.test.tsx` (Chromium) and the `ConfirmDialog` tests
  together keep both hooks at 100% statements, branches, functions and lines, which the ui coverage
  gate requires across the jsdom and Chromium projects (`vitest.config.ts`). An option added to
  either hook that neither component varies is uncovered until a direct hook test exists.
