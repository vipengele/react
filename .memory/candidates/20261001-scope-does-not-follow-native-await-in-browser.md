---
about: in the browser the ambient Scope is lost at the first native await, so handlers must re-enter the captured scope with Scope.propagate after the await
saw:
  - source/react-ui/packages/telemetry/src/ScopeProvider.browser.test.tsx
  - source/react-ui/packages/telemetry/src/ScopeProvider.test.tsx
  - source/react-ui/packages/telemetry/src/ScopeProvider.tsx
  - source/react-ui/packages/telemetry/README.md
  - source/react-ui/apps/storybook/src/Scope.stories.tsx
---

`ScopeProvider` hands a component a scope handle (`useScope()`) captured at render. Wrapping an
`async` handler body in `Scope.propagate(scope, async () => { await x; Scope.current() })` does
NOT work in a browser: the carrier is not async-aware there, so `Scope.current()` after the first
native `await` is the default scope. The working shape is to await first and then re-enter:
`await x; Scope.propagate(scope, () => Scope.current().get(...))`. The README example and the
Storybook story both carried the broken shape until review caught it.

Test split follows from this: `ScopeProvider.browser.test.tsx` runs only in the chromium project
and asserts the loss as a control; the jsdom suite must not assert it, because under Node the
carrier is `AsyncLocalStorage`, which follows `await`, so such an assertion fails there. The jsdom
project excludes `*.browser.test.*` for the same reason.
