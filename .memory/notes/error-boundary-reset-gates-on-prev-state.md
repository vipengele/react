---
name: error-boundary-reset-gates-on-prev-state
kind: rationale
description: ErrorBoundary resets on a resetKeys change only if prevState.hasError was already true; checking only the current state double-catches a first throw and fires onError twice.
anchors:
  - path: source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.tsx
    blob: 7ef203901427
  - path: source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.test.tsx
    blob: ecf081e3633f
confidence: verified
---

`ErrorBoundary.componentDidUpdate(prevProps, prevState)` returns early unless *both*
`this.state.hasError` and `prevState.hasError` are true, and only then resets on a `resetKeys`
change (`source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.tsx:82-89`; comparison in
`resetKeysChanged`, `:45-52`). The code carries no comment saying why the `prevState` half is there.

Why: a child can throw for the first time in the very update that changes `resetKeys` — e.g. a
`resetKeys={[routeParams.id]}` boundary navigating to a new id whose page also fails.
`getDerivedStateFromError` (`:66-68`) sets `hasError: true` and `componentDidUpdate` runs in the
same commit with `resetKeys` changed. A check on the current state alone would clear the error
right away, re-render the still-throwing child, catch it a second time, and fire `onError`
(`componentDidCatch`, `:78-80`) twice for one failure.

Guarded by `ErrorBoundary.test.tsx:193-213` ("does not reset when a child throws for the first time
in the same update that changes resetKeys"), which asserts `onError` is called exactly once
(`:210`). Removing `|| !prevState.hasError` should turn it red.
