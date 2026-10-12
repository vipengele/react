---
about: Vitest's Chromium project defaults to a 414x896 viewport, below SideNav's 48rem threshold, so ui's browser project pins 1280x800
saw:
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/ui/src/SideNav/SideNav.browser.test.tsx
  - source/react-ui/packages/ui/src/SideNav/SideNav.tsx
---
Cost: 3 reads plus a check of `BrowserConfigOptions.viewport` in the installed vitest 5.0.0 types.

- The ui `chromium` project sets `browser.viewport: { width: 1280, height: 800 }` in `vitest.config.ts`. Vitest's own
  default is 414x896 (documented on `BrowserConfigOptions.viewport`), which is under the default `mobileBelow` of
  `48rem` (768px). Without the pin every browser test that renders a `SideNav` would get the drawer form.
- A browser test that needs a different width calls `page.viewport(width, height)` from `"vitest/browser"` and restores
  1280x800 in `afterEach`; the `SideNav below mobileBelow in a real engine` block in `SideNav.browser.test.tsx` does.
- Assert the drawer panel's rect, not `window.innerWidth`: the modal scroll lock shrinks `innerWidth` by the gutter.
  The block measures the viewport with a `position: fixed; inset: 0` probe.
