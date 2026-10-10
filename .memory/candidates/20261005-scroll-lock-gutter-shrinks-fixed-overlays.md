---
about: the modal scroll lock reserves a scrollbar gutter, so an edge-anchored fixed overlay is laid out against the viewport less that gutter and test geometry must be measured against a fixed probe
saw:
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/tokens/src/theme.test.ts
  - source/react-ui/packages/ui/src/Drawer/Drawer.browser.test.tsx
  - source/react-ui/packages/ui/src/Drawer/Drawer.stylesheet.ts
---

Read, and measured in the Chromium project.

- The base stylesheet's scroll lock sets `overflow: hidden` together with `scrollbar-gutter: stable`
  on the root (`base-stylesheet.ts`; `theme.test.ts` asserts both). With classic, non-overlay
  scrollbars the gutter stays reserved, so the containing block of a `position: fixed` element is
  narrower than the window by the scrollbar's width (15px in the test Chromium).
- A `Drawer` anchored `right`, `top` or `bottom` therefore stops that many pixels short of the
  window edge while open. `window.innerWidth` and the root's `clientWidth` both still report the
  full width during the lock, so neither gives the box the drawer is laid out against.
- `Drawer.browser.test.tsx` reads the viewport through a `position: fixed; inset: 0` probe for that
  reason, and places its backdrop-click point clear of the gutter, where `elementFromPoint` returns
  null. A test that compares a drawer's rect with `innerWidth` fails by the gutter width.
