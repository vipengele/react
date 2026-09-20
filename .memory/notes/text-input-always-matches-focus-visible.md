---
name: text-input-always-matches-focus-visible
kind: gotcha
description: Chromium matches :focus-visible on a text input however it was focused, so a pointer-opened Autocomplete cannot isolate FieldShell's open-state accent from its focus accent.
anchors:
  - path: packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: 4d6167f3b832
  - path: packages/ui/src/Autocomplete/Autocomplete.browser.test.tsx
    blob: 5f7a03dbcab4
  - path: packages/ui/src/Dropdown/Dropdown.browser.test.tsx
    blob: f1ef1c3d7208
confidence: verified
---

`FieldShell` accents its border for two separate reasons: keyboard focus
(`:has(> :focus-visible)`, which also draws the ring — `FieldShell.stylesheet.ts:79-82`) and an
open listbox (`:has(> [aria-expanded="true"]):not(...)`, border only — `:89-91`).

A test that opens a combobox with the pointer, meaning to prove the open-state rule, only proves
it when the control does **not** match `:focus-visible`. That holds for `Dropdown`, whose trigger
is a `div`: a pointer-opened `Dropdown` takes its accent from the open state alone, and its test
asserts `:has(> :focus-visible)` does not match (`Dropdown.browser.test.tsx:295-297`).

It does not hold for `Autocomplete`. Chromium matches `:focus-visible` on a text `<input>`
whatever focused it, pointer included, so a pointer-opened `Autocomplete` is accented — and
ringed — by the focus rule too. Its open-state test therefore cannot go red by deleting the open
rule; it pins only that the open selector matches and the border is accent, and says why in a
comment (`Autocomplete.browser.test.tsx:551-556`).

To exercise the open-state rule in isolation, use a non-text control, as
`FieldShell.browser.test.tsx` does with a `<button type="button" aria-expanded="true">`
(`:148`, `:164`, `:179`).

Related: the shell's selectors match a direct child only —
[[field-shell-control-must-be-direct-child]].
