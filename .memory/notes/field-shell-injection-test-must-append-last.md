---
name: field-shell-injection-test-must-append-last
kind: gotcha
description: A FieldShell injection test detects a regression only if the intruder is appended after the trailing slot, and it must not assert that the control's width is unchanged.
anchors:
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.browser.test.tsx
    blob: f1d2dcc6f85a
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
    blob: ea49625f9b93
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: cd03cfd90664
  - path: docs/adr/0017-the-field-shell-grows-the-control-its-composer-names.md
    blob: 2f75dded795a
confidence: verified
---

Paths below are under `source/react-ui/packages/ui/src/` unless they start with `docs/`.

There are two ways to write a test for an element injected into `FieldShell` that looks like it
checks the marker fix but does not. Both came up while writing
`FieldShell/FieldShell.browser.test.tsx:158` ("an element a page injects into the field").

**Append the intruder last, after the trailing slot.** The helper does this with
`shell.append(intruder)` (`:37-42`), and so does the Dropdown copy
(`Dropdown/Dropdown.browser.test.tsx:64`). This is also what a password-manager extension does.
If you insert the intruder *before* the trailing slot, the `PasswordInput` case shows no change:
the intruder takes `flex: 1`, but the reveal button still ends up flush right, so the button is
in the same place with or without the marker. The button's position depends on the growth rule
(`FieldShell/FieldShell.stylesheet.ts:78-85`) only when the intruder is appended last.

**Do not assert that the control's width is unchanged.** That assertion fails even with the fix
in place. The intruder keeps its own width and also takes one shell `gap`, so the control really
does get narrower. ADR-0017 accepts this cost (`docs/adr/0017-*.md:63-66`): at the default seed
the gap `--vpg-space-2` is 8px, so a 24px intruder costs the control 32px. Once an "unchanged"
assertion fails, it tends to get loosened until it no longer catches anything. The same thing
happened in [[element-box-cannot-detect-own-padding]].

These assertions do catch a regression:

- the intruder keeps its own set width (`FieldShell.browser.test.tsx:174`);
- the reveal button's inset from the shell's right content edge is at most
  `INTRUDER_WIDTH + columnGap` (`:195-197`);
- the Dropdown trigger stays wider than half the field beside a chip row
  (`Dropdown/Dropdown.browser.test.tsx:257`, assertion at `:271`).

To check a new assertion, remove the marker from the control under test and confirm it fails.
Without the marker, the shell matches the fallback's `:not(:has(> .vpg-field-shell-control))`
guard (`FieldShell.stylesheet.ts:82-83`). The failing test then exercises the fallback rule
itself, not just the tagging.
