---
about: "the dark-mode ramp scalar shadowing the note records is fixed, and the note no longer describes the code"
saw:
  - "packages/tokens/src/theme.ts"
  - "packages/tokens/src/base-stylesheet.ts"
  - "packages/ui/src/theme-scalars.browser.test.ts"
targets: dark-mode-ramp-scalars-shadowed-by-inline-theme
verdict: now-false
---

[[dark-mode-ramp-scalars-shadowed-by-inline-theme]] describes a live defect. It is not live any
more, and the note should be retired rather than promoted or re-anchored as written.

`createTheme` emits none of `--tandiko-state-shift`, `--tandiko-lift` or `--tandiko-sink`. The
base stylesheet assigns their light values on `.tandiko-root` and the dark rules reassign them
(`base-stylesheet.ts`), so nothing writes them inline and the dark declarations win.
`packages/ui/src/theme-scalars.browser.test.ts` renders `<ThemeProvider colorMode="dark">` and
reads `0.05` / `0.055` / `0.025` off the root. The same test fails against the code the note
describes, which is what makes it load-bearing rather than decorative.

What stays true, and is worth keeping in whatever replaces the note, is the mechanism rather
than the instance: an inline declaration beats any non-`!important` stylesheet rule for the same
property on the same element, so a `--tandiko-*` property whose value depends on the cascade
cannot be part of `createTheme`'s output. That rule is now recorded in
`docs/adr/0007-base-stylesheet-owns-every-mode-resolved-property.md` and enforced by contract
tests in `packages/tokens/src/theme.test.ts`, and it covers the reduced-motion durations as well
as the colour-mode properties.

The note's testing advice also stays true and is now acted on: a fixture for this class of
defect has to be built through `ThemeProvider`, because one that assigns the property from a
stylesheet rule reproduces neither the shadowing nor the bug.
