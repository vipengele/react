---
about: Dropdown runs loadOptions inside the scope useScope() returned at the latest render, held in a ref and kept out of the search effect's deps
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/telemetry/README.md
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.test.tsx
---
`useAsyncOptions` calls `Scope.propagate(scopeRef.current, () => load(query))` from the debounce setTimeout. `scopeRef` is written in the same dependency-free effect as `loadOptionsRef`. The scope must not enter the search effect's deps: outside a provider `useScope()` returns `Scope.current()`, whose identity can change from one render to the next, and a dep on it would restart the debounce without the query changing (the jsdom re-render test under "the scope loadOptions starts in" protects this). Only the loader's synchronous start is in scope; past its first await a browser has no ambient scope (telemetry README), and the `.then` handlers only set state so they stay outside.
