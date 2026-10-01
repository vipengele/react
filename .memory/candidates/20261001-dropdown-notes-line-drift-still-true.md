---
about: Dropdown.tsx line pointers in two notes have drifted; claims still true
targets: dropdown-option-rows-are-a-flat-index-space
verdict: still-true
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
---

Spot-checked by grep only. readOptions is at Dropdown.tsx:319 (note: 317), its Children.forEach at :322 (note: 320), `listRef.current.length = matches.length` at :1053 (note: 606). Only those were re-checked; the rest of the pointers are unchecked. Same drift hits listbox-reference-is-the-control-not-the-field: refs.setReference now at Dropdown.tsx:1250 (note: 1097), FloatingFocusManager modal={false} at :944 (note: :966). useListboxKeyboard.ts pointers (setPositionReference :163, useClick :204, useListNavigation :226) match.
