---
about: useOverlayState and useModalDialog are Dialog's only callers' contract - they must run below an OverlayTreeShell, the dialog element has to render every render, and the hooks are covered only through Dialog's tests
saw:
  - source/react-ui/packages/ui/src/internal/useOverlayState.ts
  - source/react-ui/packages/ui/src/internal/useModalDialog.ts
  - source/react-ui/packages/ui/src/internal/overlayTree.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.test.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.browser.test.tsx
---

Read, not inferred.

- `useOverlayState` calls `useOverlayTreeNode()` (`useOverlayState.ts:34`), so its caller must sit
  below an `OverlayTreeShell`. `Dialog` is the shell and `DialogInner` is the hook caller
  (`Dialog.tsx:66-72`); a component that calls the hook in the same function that renders the shell
  would have no tree to register in.
- `useModalDialog` assumes the `<dialog>` is rendered on every render: its open effect reads
  `dialogRef.current` without a null check (`useModalDialog.ts:67-70`). A caller that renders the
  element conditionally breaks that, and `dialogProps.ref` must be spread onto it.
- `Dialog` passes `defaultOpen` through as `undefined` when absent; the `false` default lives only in
  `useOverlayState` (`useOverlayState.ts:31`), so a second caller inherits it instead of repeating it.
- `useDismiss` is fixed to `{ outsidePress: false }` (`useOverlayState.ts:49`): a modal surface
  never dismisses on an outside press because the page behind it is inert. A non-modal overlay would
  need that made an option.
- No test targets the hooks directly. `Dialog.test.tsx` (jsdom), `Dialog.browser.test.tsx` and the
  `ConfirmDialog` tests together keep both hooks at 100% statements, branches, functions and lines,
  which the ui coverage gate requires across the jsdom and Chromium projects (`vitest.config.ts`). An
  option added to either hook that `Dialog` never varies is uncovered until a direct hook test exists.
