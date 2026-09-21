---
name: field-shell-control-must-be-direct-child
kind: gotcha
description: FieldShell's focus/open/invalid/disabled rules match only a direct non-slot child, so the control must not be wrapped, nothing inside may dim itself, and the leading/trailing slots are where an element can own its own state.
anchors:
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: 8ecb139c4695
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
    blob: af8bfd1aa99e
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.test.tsx
    blob: 1defe0e919e2
  - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.stylesheet.ts
    blob: f9a312d6f430
  - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.tsx
    blob: 72989a581b25
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
    blob: c93c1265ac6d
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts
    blob: f5332bcc4633
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
    blob: 8f67b0d7469c
confidence: verified
---

Paths below are under `source/react-ui/packages/ui/src/`.

Every `FieldShell` state rule uses a direct-child combinator: `:has(> :focus-visible)`,
`:has(> [aria-expanded="true"])`, `:has(> [aria-invalid="true"])`, `:has(> :disabled)` and
`:hover:not(:has(> :disabled))` (`FieldShell/FieldShell.stylesheet.ts:79-108`; rationale in its
header, `:24-29`). The `>` is load-bearing. The layout rules for the control likewise exclude both
slots: `.vpg-field-shell > *:not(.vpg-field-shell-leading, .vpg-field-shell-trailing)` (`:54`) and
the last-non-slot-child rule (`:67`).

The control is a direct child of the shell; an adornment slot is a `<span>`
(`FieldShell/FieldShell.tsx:64` for trailing), so anything in it is a grandchild. An unscoped
`:has(:disabled)` would read a disabled adornment button as the field's own state and dim the
whole field; an unscoped `:has([aria-expanded="true"])` would accent the field because a menu
beside the control is open. The disabled case is live: `PasswordInput` puts a real `<button>` in
the trailing slot and disables it whenever the field is (`PasswordInput/PasswordInput.tsx:34,42`).

`FieldShell/FieldShell.test.tsx:131-216` pins both halves for each state (disabled control dims /
disabled trailing button does not; invalid control / `aria-invalid` in the trailing slot; open
control / `aria-expanded` in the trailing slot). `:266-270` asserts the selector strings
(constants at `:14-18`) appear verbatim in the injected CSS, tying the test to the shipped rule —
except `:focus-visible`, which has no such constant.

Consequences for anything composing the shell:

- **The control must be a direct child.** Wrapping it silently breaks every state rule, and
  nothing reports it.
- **Nothing inside the shell dims itself.** The shell already applies `opacity: 0.55`
  (`FieldShell.stylesheet.ts:101-104`); a second one compounds to about `0.3`.
  `PasswordInput/PasswordInput.stylesheet.ts:51-53` gives its disabled toggle `cursor` and no
  `opacity` for that reason (explained at `:14-21`).
- **The slots are where an element can hold its own interactive state.** The trailing slot's own
  rule (`FieldShell.stylesheet.ts:71-77`) carries no state wiring, so an adornment there neither
  inherits the shell's state nor defeats it. `Dropdown` relies on this: its clear button goes in
  the trailing slot (`Dropdown/Dropdown.tsx:1070`) and draws its own `:focus-visible` ring
  (`Dropdown/Dropdown.stylesheet.ts:133-136`). `Dropdown.browser.test.tsx:867-896` tabs from the
  trigger to the clear button and asserts the field's `borderColor`/`boxShadow` return to rest
  (`:892-893`) while the button gains `outlineStyle: "solid"` (`:894`).

Related: [[chip-row-fits-the-control-step-only-at-default-scales]].
