---
name: theme-provider-owns-colour-mode-preference
kind: invariant
description: ThemeProvider owns a three-valued light/dark/system colour-mode preference through a mode-only context, and resolvedColorMode is display-only and undefined for system until the client knows.
anchors:
  - path: source/react-ui/packages/tokens/src/color-mode.ts
    blob: 112b04a0ded1
  - path: source/react-ui/packages/tokens/src/ThemeProvider.tsx
    blob: 3b5e833d319c
  - path: source/react-ui/packages/tokens/src/vitest.setup.ts
    blob: a657df7a3281
  - path: source/react-ui/apps/storybook/.storybook/preview.tsx
    blob: 75cd058c4b74
  - path: docs/adr/0034-themeprovider-owns-the-colour-mode-preference.md
    blob: 1d7b8ab5ca72
confidence: verified
---

- `ThemeProvider` is controlled when `colorMode !== undefined` (`ThemeProvider.tsx:46`). `data-vpg-mode` is written
  for `light`/`dark` only; `system` writes no attribute (`:72`), so the base stylesheet's `[data-theme]` then
  `prefers-color-scheme` fall-through still paints.
- `resolvedColorMode` is informational (`color-mode.ts:21-24`). `system` uses `useSyncExternalStore` (`:77-80`)
  with a server snapshot of `undefined` (`:41-42`), so server and hydration passes agree. Nothing that paints
  may derive from it.
- jsdom has no `matchMedia`; `tokens/src/vitest.setup.ts` stubs it (controllable via a flag, `:7,30,52`) and
  registers `afterEach` cleanup (`:3`), and any test rendering `system` depends on both. The explorer also found
  unmounted providers leak their `MutationObserver` between tests, which is why cleanup matters.
- Storybook's decorator passes `colorMode` from globals and must write `onColorModeChange` back through
  `updateGlobals` (`preview.tsx:12-14`); without the write-back `setColorMode` changes nothing, since a controlled
  provider only fires the callback.
