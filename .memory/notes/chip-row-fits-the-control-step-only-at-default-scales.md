---
name: chip-row-fits-the-control-step-only-at-default-scales
kind: invariant
description: "A field holding one chip row stays at the 32px control step only while size-xs + space-1 <= size-md - 2x border; reseeding the size or spacing scales makes a field with chips taller than an empty one."
anchors:
  - path: source/react-ui/packages/tokens/src/theme.ts
    blob: d1628b49c2ef
  - path: source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts
    blob: b7082a9ecf1a
  - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
    blob: 8ecb139c4695
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
    blob: 8f67b0d7469c
confidence: verified
---

T = `source/react-ui/packages/tokens/src/theme.ts`; other paths under
`source/react-ui/packages/ui/src/`.

`FieldShell` has `min-height: var(--vpg-size-md)` (`FieldShell/FieldShell.stylesheet.ts:38`) and
a 1px border (`:41`), leaving a 30px content box at the default seed where `--vpg-size-md` is
`2rem` (T:216).

A chip is `height: var(--vpg-size-xs)`, 24px (`internal/listbox.stylesheet.ts:286`; T:214), and
the chip row carries `padding-block: calc(var(--vpg-space-1) / 2)`, 2px each side
(`listbox.stylesheet.ts:249`; T:232). One row is therefore 28px, fits inside 30px, and the field
stays exactly 32px — so selecting the first option does not make the field jump.

The half-step is deliberate and the stylesheet explains it (`listbox.stylesheet.ts:238-244`):
30px less a 24px chip leaves 3px each side, a full `--vpg-space-1` (4px) would grow the field to
34px, and half of it keeps the top and bottom rows of a wrapped field clear of the border.

**The invariant is `size-xs + space-1 <= size-md - 2 x border`.** It holds at the default seeds
and nothing enforces it for a reseeded theme: a consumer who reseeds the size or spacing scales
can break it, and a field with chips then stands taller than an empty one. The Chromium tests pin
the default-seed case only — `CONTROL_STEP = 32` (`Dropdown/Dropdown.browser.test.tsx:19`), one
row of chips (`:243-256`), and "as tall as with no chips" (`:258-276`), all at default seeds.

Related: the shell's rules reach one level down only — [[field-shell-control-must-be-direct-child]].
