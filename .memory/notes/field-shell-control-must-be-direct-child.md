---
name: field-shell-control-must-be-direct-child
kind: gotcha
description: FieldShell's focus/open/invalid/disabled rules match only a direct child, so the control must not be wrapped, and nothing inside the shell may dim itself.
anchors:
  - path: packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: 4d6167f3b832
  - path: packages/ui/src/FieldShell/FieldShell.test.tsx
    blob: ea123028331a
  - path: packages/ui/src/PasswordInput/PasswordInput.stylesheet.ts
    blob: 70fdaa4c69ff
  - path: packages/ui/src/PasswordInput/PasswordInput.tsx
    blob: 9495b735a7b6
confidence: verified
---

Every `FieldShell` state rule uses a direct-child combinator: `:has(> :focus-visible)`,
`:has(> [aria-expanded="true"])`, `:has(> [aria-invalid="true"])`, `:has(> :disabled)` and
`:hover:not(:has(> :disabled))` (`FieldShell.stylesheet.ts:79-108`; rationale in its header,
`:24-29`). The `>` is load-bearing.

The control is a direct child of the shell; an adornment slot is a `<span>`, so anything in it is a
grandchild. An unscoped `:has(:disabled)` would read a disabled adornment button as the field's own
state and dim the whole field. An unscoped `:has([aria-expanded="true"])` would give the field the
accent border because a menu beside the control is open. The disabled case is live, not
hypothetical: `PasswordInput` puts a real `<button>` in the trailing slot and disables it whenever
the field is (`PasswordInput.tsx:34,42`).

`FieldShell.test.tsx:136-214` pins both halves for each state (disabled control dims / disabled
trailing button does not; invalid control marks invalid / `aria-invalid` in trailing slot does
not; open control takes the open state / `aria-expanded` in trailing slot does not). `:267-270`
asserts the selector strings appear verbatim in the injected CSS, so the test is tied to the rule
that ships.

Consequences for anything composing the shell:

- **The control must be a direct child.** Wrapping it in any element silently breaks every state
  rule, and nothing reports it.
- **Nothing inside the shell dims itself.** The shell already applies `opacity: 0.55`
  (`FieldShell.stylesheet.ts:101-104`); a second one on an inner element compounds to about `0.3`.
  `PasswordInput.stylesheet.ts:51-53` gives its disabled toggle `cursor` and no `opacity` for
  that reason (explained at `:17-20`).
