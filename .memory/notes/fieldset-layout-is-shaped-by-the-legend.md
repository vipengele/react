---
name: fieldset-layout-is-shaped-by-the-legend
kind: rationale
description: FieldSet stays a plain block box with a padding-0 legend kept outside its flex-column body, because a native legend straddles the border and must never become a flex item.
anchors:
  - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.stylesheet.ts
    blob: fe96778bf3c1
  - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.tsx
    blob: 25d61ecf7b19
  - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.test.tsx
    blob: 433f2f735cdb
  - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.browser.test.tsx
    blob: 84d8836de348
  - path: source/react-ui/packages/ui/src/FormField/FormField.browser.test.tsx
    blob: 078a8597e9bb
confidence: verified
---

Paths below are under `source/react-ui/packages/ui/src/`.

A `<legend>` in a bordered `<fieldset>` is not a flow child: the browser lifts it across the
border-block-start and cuts a notch the border does not paint through. That notch, not surface,
border or radius, is what made `.vpg-fieldset` read as unstyled browser chrome
(`FieldSet/FieldSet.stylesheet.ts:19-26`). Three rules follow from it:

- **The legend carries `padding: 0; margin: 0`** (`FieldSet.stylesheet.ts:55-56`, in the rule at
  `:54-60`). The browser already anchors the legend's inline-start at the fieldset's padding edge,
  where every other child's content starts. Inline padding pushed the text to 29px against the
  labels' 21px at the default seed. `FormField/FormField.browser.test.tsx:61-91` pins the
  alignment — with a Range, because an element-box comparison cannot see this:
  [[element-box-cannot-detect-own-padding]].
- **The fieldset is a plain block box, not flex** (rule `FieldSet.stylesheet.ts:35-42`, no
  `display`; reason at `:27-30`). The browser reserves `max(padding-top, legend-block-size)` above
  the first child, and only for a legend the fieldset itself owns — so the legend stays a direct
  child (`FieldSet/FieldSet.tsx:36`, reason `:37-41`).
- **Children are spaced by a flex-column body, not sibling margins.** `FieldSet.tsx:42` wraps
  `children` in `.vpg-fieldset-body`, which is `display: flex; flex-direction: column;
  gap: var(--vpg-space-5)` (`FieldSet.stylesheet.ts:48-52`). The legend is outside the body, so
  it is never a flex item and the gap cannot double the space above the first child. The gap
  stacks and spaces children of any `display` (reason `:31-32`); the sibling-combinator margin it
  replaced separated nothing when siblings were inline and shared a line.

Pinned by `FieldSet/FieldSet.test.tsx:22` (children inside the body, legend outside it) and
`FieldSet/FieldSet.browser.test.tsx`: inline children stack (`:35`), the gap equals the resolved
`--vpg-space-5` for inline and block children (`:51`, `:65`), and the first-child offset matches
a bare fieldset with the same legend (`:102`).

The `<style>` `FieldSet` renders inside the `<fieldset>` (`FieldSet.tsx:33-35`) no longer affects
spacing whether or not React hoists it, because it is not in the body.
