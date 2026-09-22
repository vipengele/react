---
about: ErrorBoundary's componentDidUpdate must gate a resetKeys-triggered reset on prevState.hasError, not just the current state
saw:
  - source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.tsx
  - source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.test.tsx
---

`componentDidUpdate(prevProps, prevState)` resets on a `resetKeys` change only when
`prevState.hasError` was also true (`ErrorBoundary.tsx:81-88`), not just `this.state.hasError`.

Checking only the current `hasError` re-catches the same render that first threw: a
`resetKeys={[routeParams.id]}` boundary navigating to a *new* id whose page also fails calls
`getDerivedStateFromError` (setting `hasError: true`) and runs `componentDidUpdate` in the same
commit — `resetKeys` changed, so a same-update check clears the error state right away, the
still-throwing child re-renders, gets caught a second time, and `onError` fires twice for one
failure. `ErrorBoundary.test.tsx`'s "does not reset when a child throws for the first time in
the same update that changes resetKeys" test covers this by asserting `onError` is called
exactly once.
