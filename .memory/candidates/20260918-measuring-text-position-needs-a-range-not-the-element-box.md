---
about: getBoundingClientRect on an element cannot detect that element's own inline padding — a Range over its text node is what measures where text actually starts
saw:
  - packages/ui/src/FormField/FormField.browser.test.tsx
  - packages/ui/src/FieldSet/FieldSet.stylesheet.ts
---

Padding lives inside an element's border box, so changing an element's own padding never moves that
box's left edge — it moves only the text rendered inside it. An assertion comparing
`getBoundingClientRect().left` between two elements therefore passes whether or not one of them
carries inline padding, and reads as a guard while guarding nothing.

Measured directly: with `padding: 0 var(--tandiko-space-2)` on `.tandiko-fieldset-legend`, the
legend's element box and a sibling label's element box both reported `left = 21px`, while the
legend's *text* rendered at `29px`.

What detects it is a `Range` over the text node:

    const range = document.createRange();
    range.selectNodeContents(node);
    range.getBoundingClientRect().left

`FormField.browser.test.tsx`'s legend-alignment test uses this on both elements, so both sides
measure the same thing. Restoring the legend's padding makes it fail with `expected 29 to be 21`;
the element-box version stayed green.

The general rule: a pixel assertion nobody has watched fail is not evidence it holds. Flip the
property it claims to protect and confirm the test goes red before trusting it.
