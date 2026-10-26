---
about: "NumberInput clear adoption: commit(undefined, \"\") is the whole clear, but ADR-0055 slot order (after steppers) contradicts NumberInput's own steppers-last comments/test, and the ui crap gate has no headroom"
saw:
  - docs/adr/0055-a-shared-clear-button-across-form-controls.md
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.test.tsx
  - source/react-ui/packages/ui/src/internal/ClearButton.tsx
  - source/react-ui/packages/ui/src/TextField/TextField.tsx
---
Found while planning #214. Not stored elsewhere.

- NumberInput.onChange is already `(value: number | undefined) => void` (NumberInput.tsx:34), so
  emitting `undefined` widens nothing; only optional `clearable`/`clearLabel` props are added (additive).
- The clear is `focus input, then commit(undefined, "")` (commit at :245-251): it sets the uncontrolled
  value, the draft and `committedDraft` together and sets `unparseable=false`, so the later blur sees
  `draft === committedDraft` (:254) and does not commit twice. Focus must come first, as `pressStepper`
  does (:277-280), because `handleFocus` adopts `display` as the draft (:286) and would resurrect text
  if run after. Min/max never turn `undefined` back into a number (`isOutOfRange` :79-81 is false
  for undefined; clamping happens only in `steppedValue` :88).
- Visibility must test `display !== ""` (draft text incl. unparseable text kept on screen, :232-234,
  :242), not just `committed !== undefined`, or an unparseable field cannot be cleared.
  `readOnly` is not destructured (it rides in `...rest`, :218) and `disabled` is (:212).
- Slot-order tension: ADR-0055 says the clear button goes after the steppers, but the comment at
  NumberInput.tsx:315-316, the `trailing` doc (:46-48) and test NumberInput.test.tsx:456-460
  (steppers are `lastElementChild`) say steppers are last. The test only renders without `clearable`,
  so it stays green; the comments need rewording.
- Gate risk: memory note datatable-is-split-to-stay-under-the-lydite-crap-limit says ui's crap gate had
  "0 functions above 30, worst 30.0" in a function outside DataTable/ (unnamed). If that is `NumberInput`
  (not checked), added branches fail CI; extract the clear logic into a hook/subcomponent.
- No stories for TextField clear existed as a requirement beyond the rule file; NumberInput.stories.tsx has
  no Clearable story yet (TextField.stories.tsx:71-106 is the pattern).
