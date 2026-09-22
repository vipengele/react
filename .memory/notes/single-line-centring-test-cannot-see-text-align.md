---
name: single-line-centring-test-cannot-see-text-align
kind: gotcha
description: Under align-items:center a one-line text is centred whatever text-align says; only a wrapped paragraph's short last line exposes a text-align regression.
anchors:
  - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.stylesheet.ts
    blob: 426e7bca31ad
  - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.browser.test.tsx
    blob: cd8036f0f5b5
confidence: verified
---

`StatePanel` centres its copy with two overlapping declarations
(`source/react-ui/packages/ui/src/StatePanel/StatePanel.stylesheet.ts`):

- `align-items: center` on `.vpg-state-panel` (`:14`) and `.vpg-state-panel-text` (`:22`). The
  Typography blocks shrink-wrap to their text and sit at the column's midpoint.
- `text-align: center` on `.vpg-state-panel` (`:16`). Each wrapped line of a paragraph centres
  inside its own block.

A single short line is centred by `align-items` alone. Flip `text-align` to `left` and a one-line
title and description still sit at the panel's midpoint, so a test that checks only one line stays
green. A description long enough to wrap fills the block to the column width and leaves a short last
line, and that line is the only thing that moves.

That is why `StatePanel.browser.test.tsx` has two cases:

- "centres the title and description" (`:100-108`) guards `align-items`.
- "centres every line of a description that wraps" (`:110-120`) guards `text-align`. It asserts
  `midpoints.length > 1` (`:116`) so the text really wraps.

Both measure with `lineMidpoints` (`:24-28`), which uses a `Range`'s client rects, per
[[element-box-cannot-detect-own-padding]]. The 600px wrapper (`:13-16`, `:38`) is what makes a
centred line and a leading-edge line land at different places.

Explorer's mutation check, one flip at a time: setting `align-items` to `flex-start` on either
container turns the single-line test red, and `text-align: left` turns only the wrapped test red.
Any other centred-text component needs the same pair of tests.
