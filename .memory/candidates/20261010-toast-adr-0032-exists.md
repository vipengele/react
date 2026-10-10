---
about: Toast is already decided: ADR-0032 (imperative toaster store) plus ADR-0024 "Toast" paragraph (popover=manual top layer); supersedes the earlier "no Toast precedent" candidate
saw:
  - docs/adr/0032-toast-is-the-one-imperative-component-api.md
  - docs/adr/0024-overlay-layering-and-portal-ownership.md
  - CONTEXT.md
  - source/react-ui/packages/ui/src/vitest.setup.ts
targets: 20261010-no-toast-and-no-imperative-api-precedent
---
The candidate 20261010-no-toast-and-no-imperative-api-precedent says no imperative-API ADR exists;
`docs/adr/0032-toast-is-the-one-imperative-component-api.md` now does. Decisions: Toast is the
sole sanctioned imperative API (three conditions, :13-18); `createToaster()` store +
`<ToastRegion toaster>` via useSyncExternalStore, default lazily-created module `toast` (:19-25,
:76-77); region carries theme, via useOverlayRoot (:26-31); no region = recorded no-op + dev
console.warn once, no throw, no buffer (:32-39); second region on one toaster warns (:40-42);
timers pause on pointer-over/focus-within and live in the store (:43-47). ADR-0024:47-50: region
is `popover="manual"`, re-shows itself when a modal surface opens; rejected page layer (:77-78)
and portal-into-open-modal (:79-80). jsdom setup stubs only dialog showModal/close
(`vitest.setup.ts`), not popover, so top-layer proof must be a *.browser.test.tsx (ADR-0032:78-80).
Open point: ADR-0024:47-50 says "hides and shows itself again" to stay on top; no code exists yet.
