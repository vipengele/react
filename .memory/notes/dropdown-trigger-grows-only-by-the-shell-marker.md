---
name: dropdown-trigger-grows-only-by-the-shell-marker
kind: gotcha
description: The Dropdown trigger's width comes only from FieldShell's vpg-field-shell-control marker rule, not its own stylesheet; a trigger collapsed to 32px means the marker is missing.
anchors:
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
    blob: d5a03f7bf488
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts
    blob: f5332bcc4633
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: cd03cfd90664
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
    blob: ea49625f9b93
  - path: docs/adr/0017-the-field-shell-grows-the-control-its-composer-names.md
    blob: 2f75dded795a
confidence: verified
---

Paths below are under `source/react-ui/packages/ui/src/` unless they start with `docs/`.

A `Dropdown` field has two separate flex-growth rules, one level apart. Both look like "the
trailing thing expands", so they are easy to mix up.

- **Shell level: the trigger.** The trigger's class list is
  `["vpg-dropdown-trigger", "vpg-field-shell-control"]` (`Dropdown/Dropdown.tsx:1106`), and
  `.vpg-field-shell > .vpg-field-shell-control { flex: 1 }` (`FieldShell/FieldShell.stylesheet.ts:78-80`)
  is its only source of growth. `.vpg-dropdown-trigger` never sets `flex` itself
  (`Dropdown/Dropdown.stylesheet.ts:44-55`). The chip row is left unmarked and stays at the
  shell's `flex: 0 1 auto; min-width: 0` (`FieldShell.stylesheet.ts:54-57`), so the trigger gets
  whatever space is left.
- **Inside the trigger: the label.** `.vpg-dropdown-value` and `.vpg-dropdown-placeholder` each
  set `flex: 1` (`Dropdown.stylesheet.ts:90-91`, `:97-98`). That uses up the trigger's own free
  space, so the chevron's `margin-left: auto` (`:83-84`) has nothing to take. This rule is
  selected by class name and has nothing to do with the shell's rule.

The trigger relies on the shell to grow, but it overrides the shell's shrink floor.
`.vpg-field-shell.vpg-dropdown-control > .vpg-dropdown-trigger { min-width: var(--vpg-size-md) }`
(`Dropdown.stylesheet.ts:57-64`) uses both shell classes so that it outranks the shell's
`min-width: 0`. At the default seed `--vpg-size-md` is 2rem, which is 32px
(`source/react-ui/packages/tokens/src/theme.ts:216`, per [[ui-token-reads-carry-no-fallback]]).
**A trigger stuck at 32px wide means it lost its `vpg-field-shell-control` marker and something
else took the free space.** Without the marker the shell falls back to position and grows the
last centre element (`FieldShell.stylesheet.ts:82-85`). In an untouched Dropdown that is still
the trigger, so dropping the marker only shows once something is appended after it, such as a
password manager's element. `Dropdown/Dropdown.browser.test.tsx:257` ("leaves the trigger the
centre beside a chip row when a page injects an element into the field") covers that case. It
asserts the trigger is wider than half the field (`:271`), and its comment names the 32px stub
(`:270`).

The names are easy to confuse. `.vpg-dropdown-control` sits on the **shell** element
(`Dropdown.tsx:1064`), not on the control. ADR-0017 keeps that name on purpose
(`docs/adr/0017-*.md:68-72`). Related: [[field-shell-control-must-be-direct-child]],
[[chip-row-fits-the-control-step-only-at-default-scales]].
