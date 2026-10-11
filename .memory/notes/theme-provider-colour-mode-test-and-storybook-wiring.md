---
name: theme-provider-colour-mode-test-and-storybook-wiring
kind: gotcha
description: ThemeProvider's system colour mode writes no data-vpg-mode attribute, tests rendering it need tokens' matchMedia stub, and Storybook must write onColorModeChange back to globals or setColorMode does nothing.
anchors:
  - path: source/react-ui/packages/tokens/src/ThemeProvider.tsx
    blob: 3b5e833d319c
  - path: source/react-ui/packages/tokens/src/vitest.setup.ts
    blob: a657df7a3281
  - path: source/react-ui/apps/storybook/.storybook/preview.tsx
    blob: 75cd058c4b74
confidence: verified
---

- `data-vpg-mode` is written only for `light`/`dark`; `system` leaves it `undefined`
  (`ThemeProvider.tsx:72`) so the stylesheet's `prefers-color-scheme` fall-through still paints.
- jsdom has no `matchMedia`; `tokens/src/vitest.setup.ts:52` installs a stub controlled by
  `setSystemPrefersDark` (`:19`), and any test rendering `system` depends on it plus the cleanup hook.
- `setColorMode` only fires `onColorModeChange` into a controlled provider (`preview.tsx:8`); the
  decorator passes `colorMode` from globals and writes back through `updateGlobals` (`:12-14`).
