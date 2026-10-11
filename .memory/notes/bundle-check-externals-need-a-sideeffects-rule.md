---
name: bundle-check-externals-need-a-sideeffects-rule
kind: gotcha
description: bundle-check externalises @vipengele/react-telemetry with a moduleSideEffects rule, because the bundler keeps a bare import of an external it assumes has side effects, which would fail the Button-only leak marker on clean code.
anchors:
  - path: source/react-ui/packages/ui/bundle-check/run.mjs
    blob: 632bee049261
confidence: verified
---

Externalising `@vipengele/react-telemetry` alone (`run.mjs:36`) leaves `import
"@vipengele/react-telemetry";` in a Button-only bundle, because a bundler assumes an external has
side effects. A real consumer resolves the package, reads its `"sideEffects": false` and drops
that import. `treeshake.moduleSideEffects` with `{ external: true, sideEffects: false }`
(`run.mjs:42`, rationale `:39-41`) gives the external the same standing, so the specifier marker
`@vipengele/react-telemetry` (`:147-148`) appears in a bundle only when something in it uses
telemetry. The earlier pass confirmed it by bundling `Dropdown`, which does carry the import; that
bundle is not committed. `react-dom` is external too but is not marked this way, so a bare
`import "react-dom";` still appears in output.
