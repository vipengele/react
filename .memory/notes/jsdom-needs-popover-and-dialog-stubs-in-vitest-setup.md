---
name: jsdom-needs-popover-and-dialog-stubs-in-vitest-setup
kind: gotcha
description: jsdom implements neither showModal/close nor showPopover/hidePopover, so vitest.setup.ts stubs them by toggling open or an inline display; top layer, inertness and cancel are provable only in Chromium.
anchors:
  - path: source/react-ui/packages/ui/src/vitest.setup.ts
    blob: bfbc85972c5a
  - path: source/react-ui/packages/ui/src/internal/useModalDialog.ts
    blob: 79d4d8cd4b40
confidence: verified
---

`vitest.setup.ts:26-35` stubs `showModal`/`close` on `HTMLDialogElement` (toggle `open`, fire `close`) only when
`showModal` is not a function; no `cancel`, no `returnValue`, no top layer or inertness. `:42-56` stubs
`showPopover`/`hidePopover` by setting an inline `display: block`, because jsdom's default stylesheet hides
every `[popover]` that never matches `:popover-open`, which would hide content from role queries (and
unstubbed, `ToastRegion` throws). `useModalDialog.ts:47-48,78-80`: `open` is never rendered on the
`<dialog>` (that opens it non-modally and `showModal()` then throws), and the open effect guards
`dialog.open`/`isConnected` for StrictMode double effects.
