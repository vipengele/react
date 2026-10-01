---
about: Grid's Chromium tests resolve a column-width token to pixels through a probe element inside .vpg-root, because jsdom cannot resolve the --vpg-column-* custom properties
saw:
  - source/react-ui/packages/ui/src/Grid/Grid.browser.test.tsx
  - source/react-ui/packages/ui/src/Grid/Grid.stylesheet.ts
  - docs/adr/0022-grid-columns-auto-fit-from-a-column-width-scale.md
---

- `Grid.browser.test.tsx` (lines 25-29) appends a probe `div` under `.vpg-root` with
  `inlineSize: var(--vpg-column-…)` and reads `getComputedStyle(probe).inlineSize`; the pixel width of
  a column step is derived this way rather than from `getPropertyValue("--vpg-…")`.
- Auto-fit and `auto-fill` differ only in how empty tracks collapse, so the browser test pins
  `auto-fit` by giving two items a wide container and asserting they share the row
  (see the `auto-fill` comment near line 132); a jsdom test cannot see this because it computes no layout.
- The stylesheet's two mode rules (`.vpg-grid-columns`, `.vpg-grid-fit`) each read their own
  custom property bare; ADR 0022 records why the always-write rule is narrowed to the active mode.
