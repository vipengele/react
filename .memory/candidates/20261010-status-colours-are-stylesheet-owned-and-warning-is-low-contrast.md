---
about: success, warning and info are seeded and stylesheet-owned like danger, and the default warning seed needs black contrast text and cannot be a bare border or text colour on the light surface
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/ui/src/Toast/Toast.stylesheet.ts
  - docs/adr/0033-status-colours-extend-beyond-danger.md
---

- `STYLESHEET_OWNED_PROPERTIES` (`theme.ts:62-87`) lists `--vpg-success`, `--vpg-warning` and
  `--vpg-info`, so naming one in `ThemeOverrides` is a type error and a `createTheme` TypeError.
  This is the consumer break behind `feat(tokens)!`; the replacement is the seed of the same name.
- The default warning seed `oklch(0.7 0.16 75)` (`theme.ts:111`) sits past the `0.68` contrast
  threshold, so `--vpg-warning-contrast` is black. `--vpg-warning` against the light surface is
  about 2.7:1, under the 3:1 non-text minimum. The toast stylesheet therefore draws status tones as
  `-wash` fills with ink text and a contrast-inked glyph chip, never a bare warning border or text.
- Badge, Button, Link and ConfirmDialog keep their existing tones; only Toast reads the new ramps.
