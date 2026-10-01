---
about: AspectRatio's child fill does not reach inline-level children, and an img child needs the box's overflow clip too or it stretches the box past the ratio
saw:
  - source/react-ui/packages/ui/src/AspectRatio/AspectRatio.stylesheet.ts
  - source/react-ui/packages/ui/src/AspectRatio/AspectRatio.browser.test.tsx
  - source/react-ui/packages/ui/README.md
---

- `.vpg-aspect-ratio > *` sets `width: 100%; height: 100%`, and `width`/`height` do not apply to
  inline-level boxes. A bare `<span>` child measured about 22px wide in a 320px box in Chromium. A
  child that must fill is block-level or replaced (`div`, `img`, `video`). The stylesheet does not
  set `display: block` on children, and the README's `AspectRatio` section states the limit.
  AspectRatio.browser.test.tsx uses a `div` child for the fill assertion for that reason.
- The `img` cover test in AspectRatio.browser.test.tsx also turns red when `overflow: hidden` is
  dropped from the box or swapped for `overflow: clip`: with either, an `img` child's intrinsic
  height stretches the box past the ratio. So `overflow: hidden` guards the image case as well as
  the tall-`div` case.
- A direct child whose own content is taller than the box never distinguishes the `overflow`
  mutations: its `height: 100%` takes the extra height, and the content overflows the child
  rather than the box. A test for tall content has to give the child a fixed height of its own,
  as the "keeps the ratio when a child is taller than it" test does.
