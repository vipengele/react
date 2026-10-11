---
about: floating-ui markers still lack a positive control; telemetry external rule still true; pointers shifted
saw:
  - source/react-ui/packages/ui/bundle-check/run.mjs
targets: bundle-check-floating-ui-markers-lack-positive-control
verdict: still-true
---
run.mjs now: markers list `:147` (note `:143`), comment `:141-146` (note `:138-142`), loop `:148-150`. Positive controls
exist only for Tree/virtual-core (`:172-177`), toaster and ToastRegion; none imports Tooltip/Popover and asserts
`data-floating-ui` / `computePosition` appear (entry files: entry.js, entry-tree.js, entry-toast*.js). Claim holds.
Also: telemetry externalisation with moduleSideEffects rule is at `:36-42` (comment `:38-41`), still true
(note bundle-check-telemetry-external-needs-sideeffects-rule). `minify: false` is `:26`.
