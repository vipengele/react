---
name: field-shell-control-must-be-direct-child
kind: gotcha
description: FieldShell's focus/invalid/disabled rules match only a direct child, so the control must not be wrapped, and nothing inside the shell may dim itself.
anchors:
  - path: packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: e06da14afd9b
  - path: packages/ui/src/FieldShell/FieldShell.test.tsx
    blob: a18e5ed50cc2
  - path: packages/ui/src/PasswordInput/PasswordInput.stylesheet.ts
    blob: 70fdaa4c69ff
  - path: packages/ui/src/PasswordInput/PasswordInput.tsx
    blob: 9495b735a7b6
confidence: verified
---

Every `FieldShell` state rule uses a direct-child combinator: `:has(> :focus-visible)`,
`:has(> [aria-invalid="true"])`, `:has(> :disabled)` and `:hover:not(:has(> :disabled))`
(`FieldShell.stylesheet.ts:62-82`; rationale in its header, `:20-24`). The `>` is load-bearing.

The control is a direct child of the shell; an adornment slot is a `<span>`, so anything in it is a
grandchild. An unscoped `:has(:disabled)` would read a disabled adornment button as the field's own
state and dim the whole field. This is live, not hypothetical: `PasswordInput` puts a real
`<button>` in the trailing slot and disables it whenever the field is
(`PasswordInput.tsx:34,42`).

`FieldShell.test.tsx:134-172` pins both halves for both states (disabled control dims / disabled
trailing button does not; invalid control marks invalid / `aria-invalid` in trailing slot does
not), and `:219-222` asserts the selector strings appear verbatim in the injected CSS, so the test
is tied to the rule that ships.

Consequences for anything composing the shell:

- **The control must be a direct child.** Wrapping it in any element silently breaks every state
  rule, and nothing reports it.
- **Nothing inside the shell dims itself.** The shell already applies `opacity: 0.55`
  (`FieldShell.stylesheet.ts:75-78`); a second one on an inner element compounds to about `0.3`.
  `PasswordInput.stylesheet.ts:51-53` gives its disabled toggle `cursor` and no `opacity` for
  that reason.

Related: [[field-shell-centre-stretches-every-child-and-cannot-wrap]].
