---
about: a native legend is lifted out of the fieldset's padding box and straddles the border, which is what reads as unstyled browser chrome — and any inline padding on the legend moves its text off the edge its sibling labels start from
saw:
  - packages/ui/src/FieldSet/FieldSet.stylesheet.ts
  - packages/ui/src/FormField/FormField.browser.test.tsx
---

A `<legend>` inside a bordered `<fieldset>` is not a normal flow child. The browser lifts it out of
the padding box and straddles it across the border-block-start, cutting a notch the border does not
paint through. That notch is what reads as default browser chrome, and it is unaffected by styling
the surface, border or radius — `.tandiko-fieldset` carried `--tandiko-surface-raised`, a border and
a radius and still read as unstyled (`FieldSet.stylesheet.ts:31-38`). The legend settles into the
notch with `margin: 0` rather than being fought with a negative margin.

**A flex fieldset double-counts the space above its first child.** The browser already reserves
`max(padding-top, legend-block-size)` above the first real child. With `display: flex` on the
fieldset the legend is *also* a flex item for `gap` purposes, so the same space is counted twice.
`.tandiko-fieldset` is therefore a plain block box, and the gap between its children comes from a
sibling-combinator margin — `> *:not(.tandiko-fieldset-legend) ~ *:not(.tandiko-fieldset-legend)`
(`FieldSet.stylesheet.ts:44-46`) — because `gap` cannot skip the pair the legend is one half of.

**The legend's rendered edge already sits at the fieldset's padding edge**, the same edge every
other child's content starts from, so the legend carries `padding: 0`
(`FieldSet.stylesheet.ts:49`). Inline padding on the legend pushes its text past that edge and out
of line with the labels beneath it — measured at 29px against the labels' 21px at the default seed.
`FormField.browser.test.tsx` pins the alignment.

That sibling-combinator rule assumes the `<style>` element `FieldSet` renders as a child is hoisted
out of the `<fieldset>`. React 19 hoists `<style href precedence>` to `<head>`, and
`FieldSet.test.tsx` asserts it lands there. Anywhere it did not, the first field would match the
rule and take an unwanted top margin.
