---
about: the two independent flex-growth mechanisms a Dropdown field stacks, and how the trigger's min-width floor relates to the shell's shrink floor
saw:
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
---

A `Dropdown` field stacks **two independent flex-growth mechanisms one level apart**, and they
are easy to conflate because both present visually as "the trailing element expands".

- **At the shell level**, `.vpg-dropdown-trigger` also carries `.vpg-field-shell-control`
  (`Dropdown.tsx`, the trigger's `className`), and that marker is what
  `FieldShell.stylesheet.ts` grows — `.vpg-field-shell > .vpg-field-shell-control { flex: 1 }`.
  `Dropdown.stylesheet.ts` never sets `flex: 1` on `.vpg-dropdown-trigger` itself, so the
  trigger's growth comes entirely from the shell, by marker rather than by position. The chip
  row is deliberately left unmarked and stays at the sibling `flex: 0 1 auto; min-width: 0`
  rule, which is what leaves a remainder for the trigger.
- **Inside the trigger**, `.vpg-dropdown-value` / `.vpg-dropdown-placeholder` carry their own
  explicit `flex: 1` (`Dropdown.stylesheet.ts:90-91,97-98`), so the label claims the trigger's
  own free space and the chevron's `margin-left: auto` (`:83-86`) resolves to nothing left to
  claim. This one is keyed by class name and is unrelated to the shell's rule.

`Dropdown.stylesheet.ts:57-64` gives `.vpg-dropdown-trigger` a `min-width: var(--vpg-size-md)`
floor qualified by both `.vpg-field-shell.vpg-dropdown-control`, specifically to outrank the
shell's own `min-width: 0` on the same element. So the trigger depends on the shell for its
growth while overriding the shell's shrink floor. At the default seed that floor is **32px**,
which is the width the trigger collapses to when its marker is absent — a useful signature when
diagnosing a field whose trigger has become a stub.

Note the pre-existing name collision: `.vpg-dropdown-control` sits on the **shell** element and
means "the dropdown's field", not a control in the glossary's sense
(`docs/adr/0017-the-field-shell-grows-the-control-its-composer-names.md` records it as
deliberately not renamed).
