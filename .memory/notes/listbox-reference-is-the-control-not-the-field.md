---
name: listbox-reference-is-the-control-not-the-field
kind: rationale
description: useListboxKeyboard attaches the field as setPositionReference only and keeps setReference on the focusable control, because floating-ui reads elements.domReference for typeable-combobox handling, focus restore and space keys.
anchors:
  - path: packages/ui/src/internal/useListboxKeyboard.ts
    blob: f241e7c60a6d
  - path: packages/ui/src/Dropdown/Dropdown.tsx
    blob: 3ece2c53e83e
  - path: packages/ui/src/Autocomplete/Autocomplete.tsx
    blob: 0fb7353ef4ef
confidence: verified
---

`useListboxKeyboard` gives the listbox two anchors (`useListboxKeyboard.ts:80-84`). The field —
the `FieldShell` box — is attached only as the **position** reference, via a `fieldRef` callback
that calls `refs.setPositionReference` (`:135`). `refs.setReference` stays on the trigger
(`Dropdown.tsx:371`) or the `<input>` (`Autocomplete.tsx:571`), so `elements.domReference` is
always the focusable control, never the field.

Moving `setReference` onto the field looks equivalent and is not. `elements.domReference` is read
for far more than the portal's theme-root lookup (`useListboxKeyboard.ts:220`). In
`@floating-ui/react` 0.27.20's distributed source
(`node_modules/.pnpm/@floating-ui+react@0.27.20_*/node_modules/@floating-ui/react/dist/floating-ui.react.mjs`):

- `useListNavigation` (`:3263-3815`) derives `typeableComboboxReference = isTypeableCombobox(elements.domReference)`
  at `:3316`, which changes key handling, and its close path calls `elements.domReference.focus()`
  at `:3580`.
- `useClick` (`:2283-2580`) gates space-key handling on `isSpaceIgnored(domReference)` at `:2343`
  and `:2360`, which is just `isTypeableElement(element)` (`:2276-2278`).

A field `div` is neither typeable nor focusable, so all three would change silently, and a cast
such as `domReference as HTMLInputElement` hides it from TypeScript.

Keeping the reference on the control costs two compensations, both already in the hook:

- A press on the field outside the control — padding, a chip-row gap, a chevron — is an *outside*
  press to `useDismiss` by default. `outsidePress` is scoped to exclude the field (`:183-188`),
  falling back to floating-ui's own checks when no field is attached.
- Such a press would move focus to `<body>`, leaving an open listbox whose keyboard is dead.
  `onFieldMouseDown` (`:140-149`) prevents that default and returns focus to the reference element.

**`FloatingFocusManager` is not an escape hatch here.** The hook's docstring (`:76-78`) says it is
deliberately absent because moving real focus into the floating element breaks the
`aria-activedescendant` virtual-focus model the hook is built on
(`docs/adr/0004-aria-activedescendant-for-dropdown-and-autocomplete.md`). As of 2026-09-20 its one
use in the package is `Popover.tsx:131`, a modal-panel pattern, not a listbox one.

This constrains any redesign that moves the search input inside the popover: every current caller
has exactly one `domReference` for the component's whole lifetime, and a design where the
focusable control only exists while the popover is open has to say which element `setReference`
points to in each state. There is no prior art in this package for a reference element that moves
between open and closed.
