---
name: element-box-cannot-detect-own-padding
kind: gotcha
description: Comparing getBoundingClientRect().left of two elements passes regardless of their own inline padding; measure text position with a Range over the text instead.
anchors:
  - path: source/react-ui/packages/ui/src/FormField/FormField.browser.test.tsx
    blob: 078a8597e9bb
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

General rule for `*.browser.test.*` pixel assertions: flip the property the test claims to protect
and watch it go red before trusting it. See also [[custom-property-read-back-is-unresolved]].
