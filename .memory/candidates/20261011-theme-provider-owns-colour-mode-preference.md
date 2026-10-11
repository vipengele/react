---
about: ThemeProvider owns a three-valued ColorModePreference through a mode-only context, and useColorMode's resolvedColorMode is display-only and undefined for system until the client knows
saw:
  - source/react-ui/packages/tokens/src/color-mode.ts
  - source/react-ui/packages/tokens/src/ThemeProvider.tsx
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/vitest.setup.ts
  - source/react-ui/apps/storybook/.storybook/preview.tsx
  - docs/adr/0034-themeprovider-owns-the-colour-mode-preference.md
---

Supersedes the candidate `20261011-colormode-is-stateless-and-two-valued`, which describes the
code before this change.

- `ThemeProvider` holds a `ColorModePreference` (`light | dark | system`): controlled by
  `colorMode`, otherwise state seeded from `defaultColorMode` (default `system`). `setColorMode`
  always calls `onColorModeChange` and only updates state when uncontrolled
  (`ThemeProvider.tsx`). `data-vpg-mode` is written for `light`/`dark` only; `system` writes no
  attribute, so the base stylesheet's `[data-theme]` then `prefers-color-scheme` fall-through still
  paints (ADR-0007).
- The context in `color-mode.ts` carries the preference and setter only, never `Theme`
  (ADR-0001, amended by ADR-0034). `useColorMode()` throws outside a provider.
- `resolvedColorMode` is informational. Explicit preferences resolve to themselves with no
  subscription. `system` uses `useSyncExternalStore` over a `data-theme` MutationObserver plus the
  `(prefers-color-scheme: dark)` change event, with a server snapshot of `undefined`, so the first
  server and hydration pass agree. Nothing that paints derives from it.
- jsdom has no `matchMedia`, and unmounted providers leak their MutationObserver between tests.
  `tokens/src/vitest.setup.ts` stubs `matchMedia` (controllable through `setSystemPrefersDark`)
  and runs `afterEach(cleanup)`; any test rendering `system` depends on both.
- The Storybook decorator controls the provider from the `colorMode` global and writes
  `onColorModeChange` back through `useGlobals().updateGlobals`; without the write-back a story's
  `setColorMode` changes nothing (`apps/storybook/.storybook/preview.tsx`).
