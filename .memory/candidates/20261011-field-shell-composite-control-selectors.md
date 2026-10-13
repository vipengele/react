---
about: FieldShell's composite-control rules key the ring, dimming and invalid state off the marked group, and the group's focus rule outranks the invalid border so the invalid rule is restated
saw:
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.browser.test.tsx
  - source/react-ui/packages/ui/src/TimeField/TimeField.tsx
---

Checked 2026-10-11 (react-ui 0.1.x).

- A composite control is a `role="group"` that is the direct child of `FieldShell` and carries
  `vpg-field-shell-control`, with focusable segments inside it. The group itself never takes focus,
  so the plain-input rule `> :focus-visible` cannot see it. `FieldShell.stylesheet.ts` reaches in
  with `.vpg-field-shell:has(> .vpg-field-shell-control :focus-visible)`. It is `:focus-visible`,
  not `:focus-within`, so a segment a pointer focused draws no ring, and it goes through the marker,
  so a focusable element in an adornment slot never rings the field.
- The group's focus selector has specificity (0,3,0) and beats the existing invalid rule (0,2,0).
  Without the restated rule `:has(> [aria-invalid="true"]):has(> .vpg-field-shell-control
  :focus-visible)`, focusing a segment of an invalid group turns the border back to the accent
  colour. `FieldShell.browser.test.tsx` fails on that, and jsdom cannot see it.
- Dimming follows `aria-disabled="true"` on the marked group, not `:disabled`, because a group has
  no `disabled` property. The disabled hover fill is a separate rule because the jsdom suite pins
  the exact text of the existing hover selector.
- `aria-invalid` on the group is already covered by the existing `> [aria-invalid="true"]` border
  rule, since the group is a direct child; `TimeField.tsx` ORs its own `incomplete`, `rejected` and `committedRejected` flags into it.
