---
about: field-shell-control-must-be-direct-child pointers still hold; FieldShell.stylesheet selector lines match, TextField marker moved to :28 as cited
saw:
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
  - source/react-ui/packages/ui/src/TextField/TextField.tsx
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
targets: field-shell-control-must-be-direct-child
verdict: still-true
---

Re-checked by grep. State rules still `:has(> ...)` at `FieldShell.stylesheet.ts:95,105,109,113,117,122`;
positional fallback `:82-83`. `FieldShell.tsx` slot spans at :73 (leading) and :75 (trailing) as the note
says. `TextField.tsx:28` carries the marker. Drift: Dropdown's marker is now at `Dropdown.tsx:1271`
(note says :1106). I did not re-check `PasswordInput` lines or the `:54-57`/`:78-80` rules.
