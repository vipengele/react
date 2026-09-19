---
about: The comboboxes anchor the listbox's position to the field with setPositionReference and leave floating-ui's reference element on the trigger/input, because elements.domReference drives interaction behaviour a field div cannot supply
saw:
  - packages/ui/src/internal/useListboxKeyboard.ts
  - packages/ui/src/Autocomplete/Autocomplete.tsx
  - packages/ui/src/Dropdown/Dropdown.tsx
---

`useListboxKeyboard` gives the listbox two anchors (`useListboxKeyboard.ts:81`). The field — the
`FieldShell` box — is attached only as the **position** reference, through a `fieldRef` callback
that calls `refs.setPositionReference` (`:135`). `refs.setReference` stays on the trigger
(`Dropdown.tsx`) or the `<input>` (`Autocomplete.tsx`), so `elements.domReference` is the focusable
control, never the field.

Moving `setReference` onto the field instead looks equivalent and is not. In
`@floating-ui/react` 0.27.20, `elements.domReference` is read for more than the portal's theme-root
lookup (`useListboxKeyboard.ts:220`): `useListNavigation` decides from it whether the reference is a
typeable combobox, which changes how keys are handled; its close path calls `.focus()` on it; and
`useClick` checks it for space-key handling. A field `div` is neither typeable nor focusable, so each
of those would change silently, and a cast such as `domReference as HTMLInputElement` hides it from
TypeScript. These three reads are from floating-ui's distributed source, not from a test here.

Two consequences of keeping the reference on the control, both handled in the hook:

- A press on the field outside the control — padding, a chip-row gap, a chevron — is an *outside*
  press to `useDismiss` by default. `outsidePress` is scoped to exclude the field (`:184`), falling
  back to floating-ui's default when no field is attached.
- Such a press would move focus to `<body>`, leaving an open listbox whose keyboard is dead.
  `onFieldMouseDown` (`:140-149`) prevents that default and returns focus to the reference element.
