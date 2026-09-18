---
name: fieldset-layout-is-shaped-by-the-legend
kind: rationale
description: FieldSet is a block box with a padding-0 legend and sibling-combinator margins because a native legend straddles the border; the margin rule also assumes React hoists its <style>.
anchors:
  - path: packages/ui/src/FieldSet/FieldSet.stylesheet.ts
    blob: 70a5e9adb059
  - path: packages/ui/src/FieldSet/FieldSet.tsx
    blob: c5fa1ff46bf9
  - path: packages/ui/src/FieldSet/FieldSet.test.tsx
    blob: 667e65934357
  - path: packages/ui/src/FormField/FormField.browser.test.tsx
    blob: 4966ee079175
confidence: verified
---

A `<legend>` in a bordered `<fieldset>` is not a flow child: the browser lifts it across the
border-block-start and cuts a notch the border does not paint through. That notch, not surface,
border or radius, is what made `.tandiko-fieldset` read as unstyled browser chrome
(`FieldSet.stylesheet.ts:19-26`). Three rules follow from it:

- **The legend carries `padding: 0; margin: 0`** (`FieldSet.stylesheet.ts:51-53`). The browser
  already anchors the legend's inline-start at the fieldset's padding edge, where every other
  child's content starts. Inline padding pushed the text to 29px against the labels' 21px at the
  default seed. `FormField.browser.test.tsx:61-90` pins the alignment — with a Range, because an
  element-box comparison cannot see this: [[element-box-cannot-detect-own-padding]].
- **The fieldset is a plain block box, not flex** (`FieldSet.stylesheet.ts:34-41`, reason at
  `:27-29`). The browser reserves `max(padding-top, legend-block-size)` above the first child; a
  flex `gap` counts the legend as an item as well and doubles that space.
- **Spacing between children is a sibling-combinator margin**,
  `> *:not(.tandiko-fieldset-legend) ~ *:not(.tandiko-fieldset-legend)`
  (`FieldSet.stylesheet.ts:47-49`), since `gap` cannot skip the legend's pair.

**Gotcha:** that margin rule assumes the `<style>` `FieldSet` renders *inside* the `<fieldset>`
(`FieldSet.tsx:33`, before the legend) is not there at runtime. React 19 hoists
`<style href precedence>` to `<head>`, and `FieldSet.test.tsx:57-59` asserts it lands there.
Anywhere it stayed in place, the style would be the first non-legend child and the first field
would take an unwanted top margin.
