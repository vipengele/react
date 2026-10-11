---
name: contextmenu-touch-callout-untestable
kind: gotcha
description: ContextMenu's -webkit-touch-callout suppression cannot be asserted by jsdom or Chromium, and no WebKit project exists, so changes to it are unverified by the suite.
anchors:
  - path: source/react-ui/packages/ui/src/ContextMenu/ContextMenu.tsx
    blob: e43e8ca5f3db
  - path: source/react-ui/packages/ui/src/ContextMenu/ContextMenu.browser.test.tsx
    blob: c061939440d6
confidence: suspect
---

`WRAPPER_STYLE` sets `WebkitTouchCallout: "none"` (`ContextMenu.tsx:55`) to keep iOS's link/image sheet off a
long-press menu. The explorer reported that jsdom drops the property and Chromium never reflects it into the
`style` attribute (only `display: contents` remains), so `ContextMenu.browser.test.tsx` has no test for it
(confirmed: no callout reference there). The jsdom/Chromium behaviour itself was not re-run by the curator.
