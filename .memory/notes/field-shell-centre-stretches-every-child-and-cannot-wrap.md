---
name: field-shell-centre-stretches-every-child-and-cannot-wrap
kind: gotcha
description: FieldShell gives flex:1 to every non-adornment child and a fixed height, so a chip-row-plus-trigger centre splits width evenly and cannot wrap to a second line.
anchors:
  - path: packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: e06da14afd9b
  - path: docs/adr/0011-the-field-shell-as-keystone.md
    blob: 3390374c0056
confidence: verified
---

ADR 0011 intends `Dropdown` and `Autocomplete` to compose `FieldShell` with a two-sibling centre —
a chip list beside a `role="combobox"` trigger (`0011-the-field-shell-as-keystone.md:30`); the
shell's own comment anticipates it (`FieldShell.stylesheet.ts:45-48`). Two shell behaviours stand
in the way and have to be answered by whatever puts chips in the shell:

- **Every centre child gets `flex: 1; min-width: 0`** —
  `> *:not(.tandiko-field-shell-leading, .tandiko-field-shell-trailing)`
  (`FieldShell.stylesheet.ts:49-52`). A chip list and a trigger therefore share the width equally
  rather than the trigger taking the remainder; if chips are themselves direct children, each chip
  is stretched.
- **The shell sets `height`, not `min-height`** (`FieldShell.stylesheet.ts:33`), and has no
  `flex-wrap`. Today's `.tandiko-dropdown-control` and `.tandiko-autocomplete-control` rely on
  `flex-wrap: wrap` (`Dropdown.stylesheet.ts:35`, `Autocomplete.stylesheet.ts:30`) to put chips on
  further lines; inside the shell as written they cannot.

The width asymmetry ADR 0011 blames for unbounded chip growth (`:103-120`) is recorded there as an
unconfirmed diagnosis, not reproduced on screen; this note does not repeat or endorse it.

Related: [[field-shell-control-must-be-direct-child]].
