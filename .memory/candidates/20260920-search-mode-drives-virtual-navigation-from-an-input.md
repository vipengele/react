---
about: floating-ui's virtual list navigation can be driven from a text input inside the floating element while the trigger stays elements.domReference, with two load-bearing consequences for interaction wiring
saw:
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/node_modules/.pnpm/@floating-ui+react@0.27.20_*/node_modules/@floating-ui/react/dist/floating-ui.react.mjs
---

`useListNavigation({ virtual: true, ... })` does not require the element carrying its keydown
handling to be `elements.domReference`. In `@floating-ui/react` 0.27.20's distributed source,
`commonOnKeyDown`'s only `currentTarget`-identity check — the branch that would break if the
active element isn't what the hook expects — is gated on `!virtual`
(`floating-ui.react.mjs:3647`: `if (open && !virtual && activeElement(...) === event.currentTarget)`),
so with `virtual: true` that branch never runs and arrow/Home/End keys typed into any element
wired through the hook's returned prop getter drive the list.

The trigger can keep `elements.domReference` for the component's whole lifetime because
`isTypeableCombobox(domReference)` (`floating-ui.react.mjs:3316`) is `false` for a
`<div role="combobox">` (`Dropdown.tsx:955`, `:1077` render the trigger this way) — a `div` is
neither `<input>`/`<textarea>` nor `contenteditable`. That keeps `aria-activedescendant` in the
reference prop getter's output (the branch `isTypeableCombobox` gates), which
`useListboxKeyboard.ts`'s `getSearchProps()` (`:257-292`) hands to the search `<input>` instead.
No keys are hand-forwarded from the input to the listbox; `getSearchProps()` supplies the same
`useListNavigation`/`useTypeahead` prop getters the reference element would otherwise carry.

Two consequences of this arrangement are both non-obvious and both load-bearing, confirmed by the
hook's own comments and unchanged behaviour:

- `getSearchProps()` deliberately excludes `useClick`'s handlers (`useListboxKeyboard.ts:81-83`,
  `:252-254`): the reference element's own `useClick` handler toggles the popover on press
  (`click = useClick(context, { keyboardHandlers: false })`, `:204`), so if the search input also
  carried it, placing the caret with a click would close the popover the input lives in.
- Search mode's `useDismiss` closes on `click`, not the library default `pointerdown`
  (`useListboxKeyboard.ts:223`, `outsidePressEvent: search ? "click" : "pointerdown"`), because
  (per the comment at `:216-219`) `FloatingFocusManager`'s focus-return-to-reference runs ahead of
  `pointerdown`'s default action, which would blank focus to `<body>` before the input's own
  `mousedown` handling can claim it.
