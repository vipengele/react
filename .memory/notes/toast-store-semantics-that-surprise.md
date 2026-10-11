---
name: toast-store-semantics-that-surprise
kind: gotcha
description: Unregistering the last toast region drops every toast, pause is one flag not a count, and isDevelopment treats a missing process as development.
anchors:
  - path: source/react-ui/packages/ui/src/Toast/toaster.ts
    blob: 663f13c686cf
  - path: source/react-ui/packages/ui/src/Toast/ToastRegion.tsx
    blob: 666de88dbac9
confidence: verified
---

`toaster.ts:88-89`: while no region is registered every raise is a no-op and unregistering the last region drops
every toast, so a region that remounts (a route change) loses what it showed; the region belongs at the app
root. `pause()`/`resume()` are one on/off flag, not a count, so `ToastRegion.tsx` merges hover, focus and an
active swipe into one hold and resumes only when none remains. `isDevelopment()` (`toaster.ts:136-139`) treats a
missing `process`/`process.env` as development, avoiding a `ReferenceError` under raw ESM. Store tests fake
`Date` as well as timers because pause measures remaining time with `Date.now()`.
