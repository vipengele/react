---
about: "empirical confirmation that the dark-mode ramp scalars resolve to their light values in a real browser"
saw:
  - "packages/tokens/src/ThemeProvider.tsx"
  - "packages/tokens/src/theme.ts"
  - "packages/tokens/src/base-stylesheet.ts"
targets: dark-mode-ramp-scalars-shadowed-by-inline-theme
verdict: still-true
---

[[dark-mode-ramp-scalars-shadowed-by-inline-theme]] records this as read from the code and
notes that nothing had rendered it. Rendering it confirms it.

A probe rendering `<ThemeProvider colorMode="dark">` in Chromium and reading the computed values
off the `.tandiko-root` element reports:

```
state-shift=-0.05  lift=0.02  color-scheme=dark
```

`color-scheme` flips, so the dark rule matches and applies. The two scalars are nonetheless the
light-mode values from `createTheme` (`theme.ts:100-102`), not the `0.05`/`0.055` the dark rule
declares (`base-stylesheet.ts:13-15`) — the inline declaration `ThemeProvider` writes
(`ThemeProvider.tsx:39`) wins, exactly as the note predicts.

The measurement upgrades the note's mechanism from inferred to observed: the dark rule is not
failing to match, it is being overridden.

A regression test for this belongs in a browser project, and it must build its fixture through
`ThemeProvider` rather than by assigning the scalar in a stylesheet rule — a fixture that writes
the light value from a rule reproduces neither the shadowing nor the bug.
