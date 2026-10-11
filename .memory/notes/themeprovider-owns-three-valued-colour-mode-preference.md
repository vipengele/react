---
name: themeprovider-owns-three-valued-colour-mode-preference
kind: invariant
description: ThemeProvider owns a light/dark/system ColorModePreference through a mode-only context; resolvedColorMode is display-only and undefined for system until the client knows.
anchors:
  - path: source/react-ui/packages/tokens/src/ThemeProvider.tsx
    blob: 3b5e833d319c
  - path: source/react-ui/packages/tokens/src/color-mode.ts
    blob: 112b04a0ded1
  - path: source/react-ui/packages/tokens/src/vitest.setup.ts
    blob: a657df7a3281
  - path: source/react-ui/apps/storybook/.storybook/preview.tsx
    blob: 75cd058c4b74
  - path: docs/adr/0034-themeprovider-owns-the-colour-mode-preference.md
    blob: 1d7b8ab5ca72
confidence: verified
---

- `ThemeProvider` holds a preference (`light | dark | system`): controlled by `colorMode`, otherwise state
  seeded from `defaultColorMode`, default `system` (`ThemeProvider.tsx:38-46`). `setColorMode` always
  calls `onColorModeChange` and updates state only when uncontrolled. `data-vpg-mode` is written for
  `light`/`dark` only (`:72`); `system` writes no attribute, so the base stylesheet's `[data-theme]` then
  `prefers-color-scheme` fall-through still paints.
- The context in `color-mode.ts` carries the preference and setter only, never `Theme` (ADR 0001,
  amended by ADR 0034); `useColorMode()` throws outside a provider (`color-mode.ts:70`).
- `resolvedColorMode` is informational. Explicit preferences resolve to themselves with no
  subscription; `system` uses `useSyncExternalStore` over a `data-theme` MutationObserver plus the
  `(prefers-color-scheme: dark)` change event (`color-mode.ts:46`, `:77-80`) with a server snapshot of
  `undefined` (`:41`), so server and hydration agree. Nothing that paints derives from it.
- jsdom has no `matchMedia`; `tokens/src/vitest.setup.ts` stubs it (`setSystemPrefersDark`, `:19`) and
  runs `afterEach` cleanup (`:63`) because unmounted providers leak their MutationObserver. Any test
  rendering `system` depends on both.
- The Storybook decorator controls the provider from the `colorMode` global and writes
  `onColorModeChange` back through `updateGlobals` (`preview.tsx:14`); without the write-back a story's
  `setColorMode` changes nothing.
