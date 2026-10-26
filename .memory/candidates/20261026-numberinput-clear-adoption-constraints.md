---
about: "NumberInput clear: focus the input before commit(undefined, \"\"), key visibility on the box text rather than the committed value, and keep the slot composition in NumberInputTrailing.tsx because the ui crap gate has one point of headroom"
saw:
  - docs/adr/0055-a-shared-clear-button-across-form-controls.md
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
  - source/react-ui/packages/ui/src/NumberInput/NumberInputTrailing.tsx
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.test.tsx
  - source/react-ui/packages/ui/src/internal/ClearButton.tsx
---
Facts about `NumberInput`'s clear button, each tied to the code that holds it.

- `clear` in `NumberInput.tsx` focuses the input first and then calls `commit(undefined, "")`.
  `commit` sets the uncontrolled value, the draft, `committedDraft` and `unparseable` together,
  so the blur that follows sees `draft === committedDraft` and reports nothing more. Focus has to
  come first, as in `pressStepper`: `handleFocus` adopts the displayed text as the draft, so
  focusing after the commit puts the cleared text back.
- `showsClearButton` in `NumberInputTrailing.tsx` tests `display !== ""`, not the committed
  value. Text the parser rejects stays on screen with nothing committed, and a committed-value
  test would leave such a field with no way to clear it. `readOnly` is not destructured in
  `NumberInput`; it is read from `rest.readOnly`.
- The clear reaches `onChange` as `undefined`, which the prop type already allows. Min and max
  never turn `undefined` back into a number: `isOutOfRange` is false for `undefined` and only
  stepping clamps.
- The button is the last element of the trailing slot, after the caller's `trailing` and after the
  steppers span. This is the slot order the clear-button ADR file
  (`0055-a-shared-clear-button-across-form-controls.md`) sets for every control. A second ADR file
  shares that number, so cite either one by file name, never by number alone.
- Keyboard use differs from pointer use. The button's `mousedown` is prevented, so a press never
  blurs the input; tabbing to it does, and the blur commits any pending draft before Enter on the
  button reports `undefined` again. Only the pointer path and a clean committed state report once.
- A controlled parent that ignores the clear (`value={5}` held) shows an empty box and no button
  while the input is focused. Blur commits nothing, and `5` and the button return.
- `numberInputTrailing` returns `trailing` itself, not a fragment, when there are neither
  steppers nor a clear button: `FieldShell` renders no slot for an empty adornment, and a
  fragment never reads as empty.
- The lydite `ui` gate reports `crap: 0 functions above 30, worst 29.0` with no per-function
  breakdown, and the worst function sits outside `NumberInput`: it stayed at 29.0 after the clear
  button landed. The slot composition and visibility predicate live in `NumberInputTrailing.tsx`
  so the component function gains only the default `clearLabel` and the `?.` in `clear`.
