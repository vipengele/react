---
about: Dropdown.tsx and useListboxKeyboard.ts line pointers in two notes have drifted; the claims still hold
targets: dropdown-option-rows-are-a-flat-index-space
verdict: still-true
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
---

Spot-checked by grep only. The claims in dropdown-option-rows-are-a-flat-index-space and
listbox-reference-is-the-control-not-the-field still hold (`readOptions`, its `Children.forEach`,
the `listRef.current.length = matches.length` trim, `refs.setReference` on the trigger control,
`FloatingFocusManager` with `modal={false}` for the search panel). Every cited Dropdown.tsx and
useListboxKeyboard.ts line number in those notes is stale; find each symbol by name.
