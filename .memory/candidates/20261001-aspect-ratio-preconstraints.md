---
about: how AspectRatio holds its ratio — always-written inline property clamped in code, and overflow:hidden (not clip) is what keeps tall content from growing the box
saw:
  - source/react-ui/packages/ui/src/AspectRatio/AspectRatio.tsx
  - source/react-ui/packages/ui/src/AspectRatio/AspectRatio.stylesheet.ts
  - source/react-ui/packages/ui/src/AspectRatio/AspectRatio.browser.test.tsx
  - source/react-ui/packages/ui/src/Stack/Stack.tsx
  - source/react-ui/packages/ui/src/Grid/Grid.tsx
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
  - source/react-ui/packages/ui/.agents/rules/wrap-trigger-never-clone.md
---

- `AspectRatio` always writes `--vpg-aspect-ratio-ratio` inline (`String(resolveRatio(ratio))` in
  AspectRatio.tsx), so the stylesheet reads `var(--vpg-aspect-ratio-ratio)` bare, as ADR-0009
  requires. A caller `style` is spread last and can override it.
- `resolveRatio` clamps a non-finite, zero or negative ratio to `1`. Passed through, it would make
  `aspect-ratio` invalid at computed-value time and the box would silently take its content's
  height, with no console error. Grid accepts that same risk for its columns (ADR-0022); AspectRatio
  does not, because the value is a plain number it can check.
- A ratio is an inline custom property, not a data attribute: ADR-0019 rejects data-attribute
  selectors because a number has no finite set to enumerate.
- `overflow: hidden` on the box makes it a scroll container, which zeroes its automatic minimum
  size, so a child taller than the ratio is clipped instead of stretching the box.
  `overflow: clip` creates no scroll container, restores the content-based minimum, and lets the
  box grow. AspectRatio.browser.test.tsx asserts both the ratio and the clipping, and fails if
  `overflow` is dropped or swapped for `clip`.
- The component wraps its children and never clones them (`wrap-trigger-never-clone.md`): every
  direct child is sized by `.vpg-aspect-ratio > *` and `img`/`video` children get
  `object-fit: cover` in the stylesheet. There is no Slot/`asChild` API and no padding-bottom hack.
- The browser test file calls `cleanup` in `afterEach` itself: the chromium project has no setup
  file, so nothing auto-cleans between tests the way the jsdom project's setup does.
