---
about: ContextMenu's -webkit-touch-callout suppression on its wrapper cannot be asserted by either test project: jsdom drops the property from inline styles and Chromium does not support it, so React's inline style never reaches the DOM
saw:
  - source/react-ui/packages/ui/src/ContextMenu/ContextMenu.tsx
  - source/react-ui/packages/ui/src/ContextMenu/ContextMenu.browser.test.tsx
---

Checked 2026-10-05. `WRAPPER_STYLE` in ContextMenu.tsx sets `WebkitTouchCallout: "none"` to keep iOS's link and image sheet from opening over a long-press menu, and drops it under `disabled`. In the Chromium browser project the wrapper's `style` attribute reads only `display: contents` and the computed value is empty; jsdom discards the property too. Only a WebKit project could check it, and the package runs none, so ContextMenu.browser.test.tsx has no test for it. A change to that style is unverified by the suite.
