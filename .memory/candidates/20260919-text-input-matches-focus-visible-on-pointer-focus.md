---
about: Chromium matches :focus-visible on a text input however it was focused, so a pointer interaction cannot separate FieldShell's open-state accent from its focus accent on Autocomplete
saw:
  - packages/ui/src/Autocomplete/Autocomplete.browser.test.tsx
  - packages/ui/src/Dropdown/Dropdown.browser.test.tsx
  - packages/ui/src/FieldShell/FieldShell.stylesheet.ts
---

`FieldShell` accents its border for two reasons: keyboard focus (`:has(> :focus-visible)`, which also
draws the ring) and an open listbox (`:has(> [aria-expanded="true"])`, border only)
(`FieldShell.stylesheet.ts`).

A test that opens a combobox with the pointer, meaning to prove the open-state rule, only proves it
when the control does **not** match `:focus-visible`. That holds for `Dropdown`, whose trigger is a
`div`: a pointer-opened `Dropdown` gets its accent from the open state alone, and its test asserts
`:has(> :focus-visible)` does not match (`Dropdown.browser.test.tsx`).

It does not hold for `Autocomplete`. Chromium matches `:focus-visible` on a text `<input>` whatever
focused it, pointer included, so a pointer-opened `Autocomplete` is accented — and ringed — by the
focus rule too. Its open-state test cannot go red by removing the open rule; it pins that the open
selector matches and the border is accent, and says why in a comment
(`Autocomplete.browser.test.tsx:543-552`). To test the open rule in isolation, use a non-text
control, as `FieldShell.browser.test.tsx` does with a `<button aria-expanded="true">`.
