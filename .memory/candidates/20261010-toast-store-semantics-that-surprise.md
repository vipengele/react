---
about: toaster store behaviours that are not obvious from the API - unregistering the last region drops every toast, pause is a single flag, and the dev check reads process defensively
saw:
  - source/react-ui/packages/ui/src/Toast/toaster.ts
  - source/react-ui/packages/ui/src/Toast/ToastRegion.tsx
---

- `registerRegion()`'s unregister function drops every toast when the last region goes
  (`toaster.ts:264`), so a region that remounts, for example on a route change, loses what it was
  showing. ADR-0032 puts the region at the application root for this reason.
- `pause()`/`resume()` are one on/off flag (`toaster.ts:242-253`), not a count. `ToastRegion.tsx`
  combines hover, focus and an active swipe into one hold and resumes only when none remains.
- The store's pause measures remaining time with `Date.now()`, so its tests fake `Date` as well as
  `setTimeout`/`clearTimeout`; they use no `act()`.
- `isDevelopment()` treats a missing `process` or `process.env` as development: packages/ui has no
  other dev-warning convention, and raw ESM without a bundler would otherwise throw a
  `ReferenceError` the first time a warning branch ran.
- `toast.promise` settles the same id in place and does nothing if that toast was dismissed
  meanwhile; a throwing `success`/`error` formatter surfaces as an unhandled rejection by design.
