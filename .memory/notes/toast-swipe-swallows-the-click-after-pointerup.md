---
name: toast-swipe-swallows-the-click-after-pointerup
kind: gotcha
description: Chromium raises a click on the pointer-captured element in the same task as pointerup after a real drag, so useSwipeDismiss swallows exactly that click with a zero-delay timeout.
anchors:
  - path: source/react-ui/packages/ui/src/Toast/useSwipeDismiss.ts
    blob: df62c61a1fbb
  - path: source/react-ui/packages/ui/src/Toast/ToastRegion.browser.test.tsx
    blob: 94975b192412
confidence: verified
---

`useSwipeDismiss.ts:161-166` sets `swallowClick` after a swipe and clears it with `setTimeout(0)` (comment
`:161-162`), so the click in that task is swallowed and a later keyboard press on a button is not. A
pointerdown on a `closest("button")` never starts a gesture, and because the toast holds the capture a swipe
ending over a button sends it no click. Swipe state is `data-swiping` plus an inline transform, not a
`--vpg-*` property, since `never-assign-theme-properties-inline` allows only layout primitives to set one.
