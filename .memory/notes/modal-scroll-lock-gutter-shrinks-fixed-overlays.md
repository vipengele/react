---
name: modal-scroll-lock-gutter-shrinks-fixed-overlays
kind: gotcha
description: "The modal scroll lock keeps scrollbar-gutter: stable, so edge-anchored fixed overlays are laid out against the viewport minus the scrollbar and innerWidth overstates their box."
anchors:
  - path: source/react-ui/packages/tokens/src/base-stylesheet.ts
    blob: efc73d4c829f
  - path: source/react-ui/packages/ui/src/Drawer/Drawer.browser.test.tsx
    blob: fe772946e34a
confidence: verified
---

`base-stylesheet.ts:114-124`: `html:has([data-vpg-overlay-root][open])` sets `overflow: hidden` and
`scrollbar-gutter: stable`. With classic scrollbars the gutter stays reserved, so the containing block of a
`position: fixed` element is narrower than the window by the scrollbar width (the explorer measured 15px
in the test Chromium). A Drawer anchored right/top/bottom stops short of the edge while open, and
`window.innerWidth` and the root `clientWidth` both still report full width. Browser tests measure
against a `position: fixed; inset: 0` probe (`Drawer.browser.test.tsx`) and place backdrop clicks clear of
the gutter.
