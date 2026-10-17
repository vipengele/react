---
name: scope-is-lost-after-native-await-in-browser
kind: gotcha
description: In a browser the ambient Scope is lost at the first native await, so handlers re-enter the captured scope with Scope.propagate after the await; Dropdown's loadOptions only runs its synchronous start inside the scope.
anchors:
  - path: source/react-ui/packages/telemetry/src/ScopeProvider.browser.test.tsx
    blob: af6caa5d165a
  - path: source/react-ui/packages/telemetry/src/ScopeProvider.test.tsx
    blob: e22db9564657
  - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
    blob: 2804658f786f
confidence: verified
---

Wrapping an async body in `Scope.propagate(scope, async () => { await x; Scope.current() })` does not
work in a browser: the carrier is not async-aware, so `Scope.current()` after the first native `await`
is the default scope. Await first, then re-enter: `await x; Scope.propagate(scope, () => ...)`
(the working shape is asserted at `ScopeProvider.browser.test.tsx:17-35`). The browser test asserts the loss
as a control and runs only in chromium; the jsdom suite must not assert it, because under Node the carrier
is `AsyncLocalStorage`, which follows `await`.

Dropdown applies this: `Dropdown.tsx:471` calls `Scope.propagate(scopeRef.current, () => load(query))`
from the `setTimeout` callback of the search effect (doc at `:436`), so only the loader's synchronous start is in scope. `scopeRef`
is written in an effect (`:455-459`) and kept out of the search effect's deps (`:497`): outside a provider
`useScope()` returns `Scope.current()`, whose identity can change per render, and a dep on it would
restart the debounce without the query changing.

Dropdown's consumer-driven load runs from an effect (`useEffect` at `:460`) and is StrictMode-safe only because the
cleanup clears the timer (`:494-496`) and a monotonically increasing `searchTokenRef` drops any stale response.
`FileInput` instead starts uploads in the add handler, because an abort-on-unmount cleanup would kill an
effect-started upload under StrictMode's simulated remount (ADR 0028, `FileInput/useFileUploads.ts`). So the package has
two StrictMode-safe shapes: handler-started, and effect-with-idempotent-cleanup-plus-token.
