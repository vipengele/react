---
about: Chromium dispatches a click on the pointer-captured element in the same task as pointerup after a real drag, so the swipe hook swallows exactly that click
saw:
  - source/react-ui/packages/ui/src/Toast/useSwipeDismiss.ts
  - source/react-ui/packages/ui/src/Toast/ToastRegion.browser.test.tsx
---

- With the pointer captured on the toast `<li>`, a real drag still ends in a `click` on the `<li>`
  (verified by disabling the swallow: the browser test then observed the click). The hook sets a
  flag after a swipe and clears it with `setTimeout(0)` (`useSwipeDismiss.ts:161-164`), so only the
  click in that task is swallowed and a later keyboard press on a button is not.
- A pointerdown whose target has `closest("button")` never starts a gesture, and because the toast
  holds the capture a swipe that ends over a button sends that button no click.
- Swipe state uses `data-swiping` plus an inline `transform`, not a `--vpg-*` property:
  `.agents/rules/never-assign-theme-properties-inline.md` allows only layout primitives to set one inline.
