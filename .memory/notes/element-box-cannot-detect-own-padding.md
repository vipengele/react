---
name: element-box-cannot-detect-own-padding
kind: gotcha
description: Element boxes never move with their own padding or text-align, so measure text with a Range over it; and only a wrapped line (short last line) exposes a text-align regression.
anchors:
  - path: source/react-ui/packages/ui/src/FormField/FormField.browser.test.tsx
    blob: 078a8597e9bb
  - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.browser.test.tsx
    blob: cd8036f0f5b5
  - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.stylesheet.ts
    blob: 426e7bca31ad
confidence: verified
---

Padding lives inside an element's border box, so an element's own padding never moves that box's
left edge — only the text inside it. An assertion comparing `getBoundingClientRect().left` across
two elements passes whether or not one of them carries inline padding, and reads as a guard while
guarding nothing.

Observed on the FieldSet legend: with `padding: 0 var(--vpg-space-2)` on the legend, the legend's
box and a sibling label's box both reported `left = 21px` while the legend's text rendered at 29px
([[fieldset-layout-is-shaped-by-the-legend]]).

What detects it is a `Range` over the element's contents. The `textLeft` helper in
`source/react-ui/packages/ui/src/FormField/FormField.browser.test.tsx:85-89` does
`document.createRange()`, `range.selectNodeContents(node)`, `range.getBoundingClientRect().left`,
and `:90` compares both sides with it (reasoning at `:80-84`, whole test `:61-91`). Restoring the
padding makes it fail with `expected 29 to be 21`; the element-box version stayed green.

**The same trap applies to `text-align`, and a one-line text hides it.** `StatePanel` centres its
copy with two overlapping declarations: `align-items: center` on `.vpg-state-panel` and
`.vpg-state-panel-text` (`src/StatePanel/StatePanel.stylesheet.ts:14`, `:22`), which centres each
shrink-wrapped Typography block, and `text-align: center` on `.vpg-state-panel` (`:16`), which
centres each wrapped line inside its block. A single short line is centred by `align-items` alone,
so flipping `text-align` to `left` leaves a one-line title and description at the midpoint and the
single-line test (`StatePanel.browser.test.tsx:100-108`) stays green. Only a description long
enough to wrap, leaving a short last line, exposes it: the separate "centres every line of a
description that wraps" case (`:110-120`) measures every line through `Range.getClientRects()`
(`lineMidpoints`, `:24-28`, reasoning `:18-23`) and asserts more than one line (`:116`). Per the
explorer's mutation check, `align-items: flex-start` on either container reddens the single-line
test; `text-align: left` reddens only the wrapped one.

General rule for `*.browser.test.*` pixel assertions: flip the property the test claims to protect
and watch it go red before trusting it. See also [[custom-property-read-back-is-unresolved]].
