---
name: aspect-ratio-overflow-hidden-keeps-the-ratio
kind: gotcha
description: AspectRatio needs overflow:hidden (not clip) on the box so tall content cannot stretch it, and its child fill sizing only reaches block-level or replaced children.
anchors:
  - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.stylesheet.ts
    blob: 418399b3be68
  - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.tsx
    blob: 816a42e02871
  - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.browser.test.tsx
    blob: cd88c8bd4032
confidence: verified
---

- `AspectRatio.stylesheet.ts:9-12` explains it and `:18-21` applies it: `overflow: hidden` makes the box
  a scroll container, which zeroes its automatic minimum size, so a child taller than the ratio is
  clipped. `overflow: clip` creates no scroll container, restores the content-based minimum, and lets
  the box grow past the ratio. An `img` child's intrinsic height triggers this too. The browser test
  (`AspectRatio.browser.test.tsx`) fails if `overflow` is dropped or swapped for `clip`.
- A tall direct child never exposes the `overflow` mutations by itself: `.vpg-aspect-ratio > *`
  (`AspectRatio.stylesheet.ts:23-26`) gives it `height: 100%`, so the extra content overflows the
  child, not the box. A test for tall content must give the child its own fixed height.
- That rule sets `width`/`height` only, which do not apply to inline-level boxes. A child that
  must fill is block-level or replaced (`div`, `img`, `video`); the stylesheet sets no `display` on children.
- `resolveRatio` (`AspectRatio.tsx:11-13`) clamps a non-finite or non-positive ratio to the default; passed
  through, `aspect-ratio: var(...)` would be invalid at computed-value time and the box would silently
  take its content's height.
