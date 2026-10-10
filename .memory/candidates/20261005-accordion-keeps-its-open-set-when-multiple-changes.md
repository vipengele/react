---
about: Accordion holds open items as one ReadonlySet in both modes, so switching `multiple` on a mounted accordion keeps the set; the specified behaviour for that switch is none
saw:
  - source/react-ui/packages/ui/src/Accordion/Accordion.tsx
  - source/react-ui/packages/ui/src/Accordion/Accordion.test.tsx
---

Checked 2026-10-05.

- `Accordion` normalises `value`/`defaultValue` through `toOpenSet`: a single-mode string becomes a set
  of one, and `null`/`undefined` an empty set. Uncontrolled state is that set in both modes, and
  `isMultiple` only decides what `toggle` computes and what `onChange` is given (a string or `null`
  versus a fresh `Set`).
- Going from `multiple` to single on a mounted uncontrolled accordion with several items open leaves
  all of them open until the next toggle, which then reports one value. Nothing specifies or tests
  this; a caller that changes the mode should key the accordion.
- Controlled single mode with `value={null}` is controlled and closed: controlled is
  `value !== undefined`, and `null` is a value.
