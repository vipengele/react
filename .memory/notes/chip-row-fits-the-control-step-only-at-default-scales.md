---
name: chip-row-fits-the-control-step-only-at-default-scales
kind: invariant
description: "A field holding one chip row stays at the 32px control step only while size-xs + space-1 <= size-md - 2x border; reseeding the size or spacing scales makes a field with chips taller than an empty one."
anchors:
  - path: packages/tokens/src/theme.ts
    blob: 016a5133657d
  - path: packages/ui/src/internal/listbox.stylesheet.ts
    blob: 74ca41dae798
  - path: packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: 4d6167f3b832
confidence: verified
---

`FieldShell` has `min-height: var(--tandiko-size-md)` (`FieldShell.stylesheet.ts:38`) and a 1px
border (`:41`), leaving a 30px content box at the default seed where `--tandiko-size-md` is `2rem`
(`theme.ts:216`).

A chip is `height: var(--tandiko-size-xs)`, 24px (`listbox.stylesheet.ts:160`; `theme.ts:214`),
and the chip row carries `padding-block: calc(var(--tandiko-space-1) / 2)`, 2px each side
(`listbox.stylesheet.ts:148`; `theme.ts:232`). One row is therefore 28px, fits inside 30px, and
the field stays exactly 32px — so selecting the first option does not make the field jump.

The half-step is deliberate, and the stylesheet says so at `listbox.stylesheet.ts:137-143`: the
spacing scale has no 2px or 3px step, a full `--tandiko-space-1` (4px) each side makes the row
32px and the field 34px, and no padding at all lets a wrapped second row sit flush against the
border. `calc((size-md - size-xs) / 2 - 1px)` would give an exact 3px but hardcodes the shell's
border width.

**The invariant is `size-xs + space-1 <= size-md - 2 x border`.** It holds at the default seeds
and nothing enforces it for a reseeded theme: a consumer who reseeds the size or spacing scales
can break it, and a field with chips then stands taller than an empty one. The Chromium tests in
`Dropdown.browser.test.tsx` and `Autocomplete.browser.test.tsx` pin the default-seed case only.

Related: the shell's rules reach one level down only — [[field-shell-control-must-be-direct-child]].
