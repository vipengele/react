---
about: bundle-check externalises @vipengele/react-telemetry with a moduleSideEffects rule, because Rolldown keeps a bare import of an external it assumes has side effects, which would fail the Button-only leak marker on clean code
saw:
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
---
Externalising `@vipengele/react-telemetry` alone leaves `import "@vipengele/react-telemetry";` in a Button-only bundle, since a bundler assumes an external has side effects. A consumer resolves the package and reads its `"sideEffects": false`, which drops that import. `treeshake.moduleSideEffects` with `{ external: true, sideEffects: false }` gives the external the same standing, so the string marker `@vipengele/react-telemetry` appears in the bundle only when something in it uses telemetry. Verified by bundling `Dropdown`, which does carry the import. `import "react-dom";` still appears as a bare import; react-dom is not marked.
