---
name: bundle-check-telemetry-external-needs-sideeffects-rule
kind: gotcha
description: bundle-check externalises @vipengele/react-telemetry with a moduleSideEffects rule, otherwise the bundler keeps a bare import of it and the Button-only leak marker fails on clean code.
anchors:
  - path: source/react-ui/packages/ui/bundle-check/run.mjs
    blob: b73e17609ea3
confidence: verified
---

`bundle-check/run.mjs:36-43` lists the telemetry package in `external` and adds a
`treeshake.moduleSideEffects` entry with `external: true, sideEffects: false` for it (comment `:38-41`).
Without the rule an external is assumed to have side effects, so an unused
`import "@vipengele/react-telemetry"` survives in a Button-only bundle and trips the telemetry leak
marker. A real consumer reads the package's `"sideEffects": false` and drops it; the rule gives the
external the same standing. `react-dom` is not given the rule, so its bare import still appears.
