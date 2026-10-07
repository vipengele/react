---
about: real touch input in the Chromium project goes through cdp Input.dispatchTouchEvent with coordinates offset by the test iframe's rect, and floating-ui placement assertions in jsdom need clientWidth/clientHeight stubbed because jsdom reports a zero-size viewport
saw:
  - source/react-ui/packages/ui/src/ContextMenu/ContextMenu.browser.test.tsx
  - source/react-ui/packages/ui/src/ContextMenu/ContextMenu.test.tsx
---

Checked 2026-10-05. `cdp().send("Input.dispatchTouchEvent", ...)` from `"vitest/browser"` works under `@vitest/browser-playwright` and raises `pointerType: "touch"` pointer events, so no synthetic PointerEvents are needed; CDP coordinates are measured from the top-level page, so the helper adds `window.frameElement`'s rect (ContextMenu.browser.test.tsx, `frameOffset` and `touch`). In jsdom, `flip` and `shift` clamp a panel against a zero-size viewport and hide which anchor it got, so ContextMenu.test.tsx stubs `document.documentElement.clientWidth` and `clientHeight` (1024 by 768) before asserting anchors.
