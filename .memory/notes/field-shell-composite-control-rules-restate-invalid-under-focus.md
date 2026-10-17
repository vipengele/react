---
name: field-shell-composite-control-rules-restate-invalid-under-focus
kind: gotcha
description: FieldShell keys a composite control's ring, dimming and invalid state off the marked role=group child, and the group's focus rule outranks the invalid border so the invalid rule is restated; jsdom cannot see it.
anchors:
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: c0b1aef2f2aa
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.browser.test.tsx
    blob: b52920478766
  - path: source/react-ui/packages/ui/src/TimeField/TimeField.tsx
    blob: 4dc29d5a34da
confidence: verified
---

A composite control is a `role="group"` that is the direct child of `FieldShell` and carries `vpg-field-shell-control`
(`TimeField.tsx:116`, `DateField.tsx:374`), with focusable segments inside. The group never takes focus, so the plain-input rule
`> :focus-visible` cannot see it. `FieldShell.stylesheet.ts:106` reaches in with
`.vpg-field-shell:has(> .vpg-field-shell-control :focus-visible)`: `:focus-visible` rather than `:focus-within`, so a segment a
pointer focused draws no ring, and through the marker, so a focusable element in an adornment slot never rings the field.

That focus selector has specificity (0,3,0) and beats the existing invalid rule (0,2,0). Without the restated rule at `:132`,
`:has(> [aria-invalid="true"]):has(> .vpg-field-shell-control :focus-visible)`, focusing a segment of an invalid group turns the
border back to the accent colour. `FieldShell.browser.test.tsx` fails on that and jsdom cannot see it.

Dimming follows `aria-disabled="true"` on the marked group (`:144`), not `:disabled`, because a group has no `disabled` property;
the disabled hover fill (`:154`) is a separate rule because the jsdom suite pins the exact text of the existing hover selector.
`aria-invalid` on the group is already covered by the existing `> [aria-invalid="true"]` border rule since the group is a direct
child. See also [[field-shell-control-must-be-direct-child]].
