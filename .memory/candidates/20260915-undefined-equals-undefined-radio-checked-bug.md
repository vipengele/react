---
about: comparing two possibly-undefined values with === for a "does this match the selection" check silently matches when both sides are absent
saw: packages/ui/src/RadioButton/RadioButton.tsx
---

`RadioButton`'s context-derived `checked` state was originally computed as
`context.value === value`, where `context.value` is `RadioGroup`'s selected value (`string |
undefined`) and `value` is the button's own `value` prop (also `string | undefined`). When a
`RadioButton` is rendered inside a `RadioGroup` with no `value` prop of its own, and the group
has no selection yet, both sides are `undefined`, so the comparison evaluates `true` — every
valueless `RadioButton` in an unselected group renders checked.

A `panel-code-review` pass on the branch that introduced `RadioButton`/`RadioGroup` caught this
(the existing test for a valueless grouped button asserted only that clicking it doesn't throw,
never that it isn't checked, so it didn't catch this). The fix: guard the comparison with
`value !== undefined` before comparing to the group's value, so an absent `value` never
"matches" an absent selection.

The general shape to watch for: any `a === b` meant as "does this identify the same thing" where
both `a` and `b` can independently be `undefined`/`null` needs an explicit presence check first,
not just the equality — `undefined === undefined` is `true`, and that is very rarely what a
"same identity" check actually wants.
