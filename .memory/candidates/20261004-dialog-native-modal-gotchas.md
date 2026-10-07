---
about: Platform facts a native-<dialog> component trips over - jsdom 30 lacks showModal, browser-project coverage counts toward the ui 100% gate, Tab leaves the document in Chromium, ::backdrop inherits --vpg-* from the dialog
saw:
  - source/react-ui/packages/ui/src/vitest.setup.ts
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/ui/src/Dialog/Dialog.tsx
  - source/react-ui/packages/ui/src/internal/useModalDialog.ts
  - source/react-ui/packages/ui/src/Dialog/Dialog.browser.test.tsx
  - source/react-ui/packages/ui/src/Dialog/Dialog.stylesheet.ts
---

Verified while building Dialog.

- jsdom 30.0.1 implements none of `showModal()`, `show()` or `close()` on `HTMLDialogElement`; it only reflects `open`. vitest.setup.ts:31 stubs `showModal`/`close` (close fires a `close` event) only when `showModal` is not a function. The stubs fire no `cancel`, set no `returnValue`, and give no top layer or inertness, so those behaviours are provable only in Chromium (Dialog.browser.test.tsx).
- `vitest.config.ts` has one top-level `test.coverage` block; the jsdom and chromium projects both report into it. A jsdom-only run falls below the 100% thresholds, so code covered only by `*.browser.test.*` files is load-bearing for the gate.
- `showModal()` throws on an already-open or disconnected dialog (StrictMode double effects). `internal/useModalDialog.ts:67-79` (the open effect Dialog runs through `useModalDialog`) guards both. Never render `open` from React: it opens the dialog non-modally.
- In Chromium, Tab after the last control of a modal dialog leaves the document for browser UI (`document.hasFocus()` false, `activeElement` body) and re-enters on the first control; the inert page is never reached. "The browser traps focus" overstates it (Dialog.browser.test.tsx asserts the weaker property).
- `::backdrop` inherits `--vpg-*` from the dialog's originating element, so the scrim colour in Dialog.stylesheet.ts reads `var(--vpg-ink)` with no literal.
- A `method="dialog"` submit closes natively with no `cancel` event; `useModalDialog`'s submit handler (`:117`) intercepts it, so `dialog.returnValue` is never set.
