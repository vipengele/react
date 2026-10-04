---
about: state-shift note re-checked, claims hold, pointers unchanged
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
targets: state-shift-sign-flips-with-colour-mode
verdict: still-true
---
Re-checked while researching chart colour roles. `base-stylesheet.ts:16` is `0.05` (dark), `:72` is `-0.05` (light). `theme.ts:170-172` hover/press/wash, `:183` accent-visited (`l + state-shift * 3`), `:194` danger-visited. Body line numbers are all still correct.
