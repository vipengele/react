---
about: the Dropdown scope-propagation claim still holds, but its line pointers have moved and the note leaves out that the load runs from an effect-scheduled timer, not a handler
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/FileInput/useFileUploads.ts
  - docs/adr/0028-file-input-owns-upload-state.md
targets: scope-is-lost-after-native-await-in-browser
verdict: still-true
---
Re-checked because the note was stale (Dropdown.tsx blob moved).

- Claim holds: `Scope.propagate(scopeRef.current, () => load(query))` is at `Dropdown.tsx:471` (note said `:533`), inside the
  `setTimeout` callback of the search effect; `scopeRef`/`loadOptionsRef` are written in an effect at `:455-459`
  (note said `:517-520`) and are absent from the search effect's deps (`:497`).
- Not in the note: Dropdown's consumer-driven load DOES run from an effect (`useEffect` at `:460`), and is StrictMode-safe
  only because the effect's cleanup clears the timer (`:494-496`) and a monotonically increasing `searchTokenRef` drops any
  stale response. Contrast `FileInput`, which starts uploads in the add handler because an abort-on-unmount cleanup would
  kill an effect-started upload under StrictMode's simulated remount (ADR 0028). So there are two StrictMode-safe shapes in
  the package: handler-started, and effect-with-idempotent-cleanup-plus-token. Neither fires a consumer callback on mount
  without a cleanup that cancels it.
