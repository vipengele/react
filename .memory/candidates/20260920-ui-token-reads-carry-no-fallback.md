---
about: the no-fallback var() read rule and its enforcing test still hold; the note's padding citation pointed at a deleted file
saw:
  - source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts
  - source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---

`Autocomplete` is deleted; `source/react-ui/packages/ui/src/Autocomplete/Autocomplete.stylesheet.ts:17-18` no
longer exists, so the note's citation for where padding drift lived resolves to nothing.

The rule itself still holds. `source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts` globs
`source/react-ui/packages/ui/src` at run time and fails on any `var(--vpg-*, <literal>)` read; ran
`pnpm --filter @vipengele/react-ui test` this session (559 tests, 100% coverage) and it is green.

The padding claim needs a present-tense replacement, not a "used to" one. `Dropdown` now composes
`FieldShell` for its box: `Dropdown.stylesheet.ts` draws the wrapper, the trigger and the clear
button and reads no height or horizontal-padding token itself — those live in
`FieldShell.stylesheet.ts:38-39` (`--vpg-size-md`, `--vpg-space-3`), read once. Grepped
`source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts` for `padding` — the only hit is the clear
button's own `padding: var(--vpg-space-1)` (`Dropdown.stylesheet.ts:101`), a token read on an
adornment inside the shell's trailing slot, not a literal and not field padding.

A future version of this note should drop the `Autocomplete` citation entirely and state the
current invariant as: `Dropdown` reads no literal container padding of its own — height and
horizontal padding come from `FieldShell` once, via `Dropdown.stylesheet.ts`'s doc comment at
`:15-19` naming `FieldShell` as owning "the border, fill, corner radius, height, horizontal
padding, focus ring, danger border and hover fill".
