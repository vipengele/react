---
about: why Separator draws its line as a border and not a background
saw:
  - source/react-ui/packages/ui/src/Separator/Separator.stylesheet.ts
  - source/react-ui/packages/ui/src/Separator/Separator.browser.test.tsx
---

- `Separator.stylesheet.ts` paints the line as `border: 0 solid var(--vpg-border)` on a zero-size cross axis
  (`height: 0` + `border-top-width: 1px`; `width: 0` + `border-left-width: 1px`), under `box-sizing: border-box`.
  A `background-color` hairline is discarded in forced-colors (high-contrast) mode; borders are kept.
- `Separator.browser.test.tsx` asserts `borderTopColor`/`borderLeftColor`, so changing the line to a background
  breaks that test as well as forced-colors rendering.
- An unresolved `var(--vpg-border)` in a `border` shorthand falls back to `currentcolor`, which is opaque, so a
  "non-transparent" assertion alone cannot catch a missing token; the browser test also compares against a probe
  whose `color` is `var(--vpg-border)`.
- A vertical Separator only gets its length from `align-self: stretch` inside a flex or grid parent; there is no
  fallback height.
