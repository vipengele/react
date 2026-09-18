---
about: FieldShell reads focus, invalidity and disabledness with a direct-child combinator because an adornment slot holds an arbitrary interactive subtree that an unscoped :has() would mistake for the control
saw:
  - packages/ui/src/FieldShell/FieldShell.stylesheet.ts
  - packages/ui/src/FieldShell/FieldShell.test.tsx
  - packages/ui/src/PasswordInput/PasswordInput.stylesheet.ts
---

`FieldShell`'s state rules all match a direct child — `:has(> :focus-visible)`,
`:has(> [aria-invalid="true"])`, `:has(> :disabled)` and
`:hover:not(:has(> :disabled))` (`FieldShell.stylesheet.ts:62-81`). The `>` is load-bearing, not
tidiness.

The control is a direct child of the shell. An adornment slot is a `<span>`, so anything a caller
puts in it is a grandchild. An unscoped `:has(:disabled)` therefore reads a disabled adornment
button as the field's own state and dims the whole field because a button beside the control is off;
`:has([aria-invalid="true"])` fails the same way. This is a live case rather than a hypothetical:
`PasswordInput` puts a real `<button>` in the trailing slot, disabled whenever the field is.

`FieldShell.test.tsx` pins both halves for both states — a disabled control dims the shell, a
disabled button in the trailing slot does not; an invalid control marks the shell invalid, an
`aria-invalid` element in the trailing slot does not. The stylesheet test asserts the selector
strings appear verbatim in the injected CSS, so the assertion is tied to the rule that ships rather
than to a hand-written equivalent.

The consequence for anything composing the shell: **the control must be a direct child.** Wrapping
it in any element silently breaks every state rule, and nothing reports that.

It also fixes where dimming belongs. Because the shell dims the whole field, a control or adornment
inside it must not dim itself as well: two `opacity: 0.55` declarations compound to roughly `0.3`
and the inner element reads as more faded than the field around it
(`PasswordInput.stylesheet.ts:50-52` carries `cursor` and no `opacity` for that reason).
