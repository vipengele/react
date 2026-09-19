---
about: A field holding one row of chips stays at the 32px control step only because size-xs plus the chip row's half-step padding fits inside size-md minus the shell's border; reseeding the size or spacing scales can break it
saw:
  - packages/tokens/src/theme.ts
  - packages/ui/src/internal/listbox.stylesheet.ts
  - packages/ui/src/FieldShell/FieldShell.stylesheet.ts
---

`FieldShell` has a `min-height` of `--tandiko-size-md` (32px at the default seed) and a 1px border,
leaving a 30px content box (`FieldShell.stylesheet.ts`). A chip is `height: var(--tandiko-size-xs)`,
24px (`listbox.stylesheet.ts:160`; `theme.ts:214`), and the chip row carries
`padding-block: calc(var(--tandiko-space-1) / 2)`, 2px each side (`listbox.stylesheet.ts:148`;
`theme.ts:232`). One row is therefore 28px, fits inside 30px, and the field stays exactly 32px — so
selecting the first option does not make the field jump. The Chromium tests in
`Dropdown.browser.test.tsx` and `Autocomplete.browser.test.tsx` pin that.

The half-step is deliberate. The spacing scale has no 2px or 3px step, a full `--tandiko-space-1`
(4px) each side makes the row 32px and the field 34px, and no padding at all lets a wrapped second
row sit flush against the border. `calc((size-md − size-xs) / 2 − 1px)` gives an exact 3px but
hardcodes the shell's border width.

The invariant is `size-xs + space-1 ≤ size-md − 2 × border`. It holds at the default scales; a
consumer who reseeds the size or spacing scales can break it, and a field with chips then stands
taller than an empty one.
