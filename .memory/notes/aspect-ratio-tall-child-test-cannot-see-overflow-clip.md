---
name: aspect-ratio-tall-child-test-cannot-see-overflow-clip
kind: gotcha
description: "AspectRatio's overflow:hidden is guarded by the img cover test, not the tall-child test: a direct child's height:100% absorbs the extra height, so only an img's intrinsic height stretches the box when overflow is dropped or swapped for clip."
anchors:
  - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.stylesheet.ts
    blob: 418399b3be68
  - path: source/react-ui/packages/ui/src/AspectRatio/AspectRatio.browser.test.tsx
    blob: cd88c8bd4032
confidence: suspect
---

`.vpg-aspect-ratio` sets `overflow: hidden` so the box becomes a scroll container with a zero
automatic minimum size (`AspectRatio.stylesheet.ts:10-13`, rule at `:19`); `overflow: clip` would restore the
content-based minimum and let content grow the box. Which test notices a regression is not
obvious:

- The "keeps the ratio when a child is taller than it" test
  (`AspectRatio.browser.test.tsx:45-54`) gives its `div` a fixed height of four times the parent's
  width. An unconstrained tall child never distinguishes the `overflow` mutations: the direct
  child's own `height: 100%` (`AspectRatio.stylesheet.ts:22-25`) takes the extra height, and the
  content overflows the child rather than the box. Only a child with a fixed height of its own, as
  in that test, can push the box.
- The `img` cover test (`:71-85`) is reported to go red when `overflow: hidden` is dropped or
  swapped for `clip`, because an `img` child's intrinsic height then stretches the box past the
  ratio. That mutation run was done by the explorer and not repeated here, hence `suspect`.

The browser test file calls `cleanup` itself (`:16`): the chromium project has no setup file, so
nothing auto-cleans between tests the way the jsdom project's setup does.
