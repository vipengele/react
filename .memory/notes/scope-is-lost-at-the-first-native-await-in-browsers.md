---
name: scope-is-lost-at-the-first-native-await-in-browsers
kind: gotcha
description: In the browser the ambient Scope is lost at the first native await, so a handler must await first and re-enter the captured scope with Scope.propagate afterwards; the jsdom suite cannot assert the loss because Node's carrier follows await.
anchors:
  - path: source/react-ui/packages/telemetry/src/ScopeProvider.browser.test.tsx
    blob: af6caa5d165a
  - path: source/react-ui/packages/telemetry/src/ScopeProvider.test.tsx
    blob: e22db9564657
  - path: source/react-ui/packages/telemetry/src/ScopeProvider.tsx
    blob: "284235418376"
  - path: source/react-ui/packages/telemetry/README.md
    blob: 899e5b299bbc
confidence: suspect
---

`useScope()` hands a component the scope captured at render. Wrapping an `async` handler body in
`Scope.propagate(scope, async () => { await x; Scope.current() })` does NOT work in a browser: the
carrier is not async-aware there, so `Scope.current()` after the first native `await` is the
default scope. The working shape awaits first and then re-enters:
`await x; Scope.propagate(scope, () => Scope.current().get(...))`.
`ScopeProvider.browser.test.tsx:11-36` exercises exactly this (the re-entry after
`await Promise.resolve()` at `:17-20`, and the ambient scope asserted gone at `:36`).

Test split follows from this: the loss is asserted only in the chromium project, as a control. The
jsdom suite must not assert it, because under Node the carrier is `AsyncLocalStorage`, which
follows `await`, so such an assertion fails there. The jsdom project excludes `*.browser.test.*`
(`packages/telemetry/vitest.config.ts:28-31`, which says why: Node's `AsyncLocalStorage` carries the scope in jsdom).

The README example and the Storybook story once carried the broken shape until review caught it,
so check any new example of a scoped async handler against this. Marked `suspect`: the browser
carrier's behaviour comes from the explorer's run and the test's own comment, and was not re-run
here.
