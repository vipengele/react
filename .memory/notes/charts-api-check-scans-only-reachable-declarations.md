---
name: charts-api-check-scans-only-reachable-declarations
kind: gotcha
description: The charts api-check follows relative imports from dist/index.d.ts instead of globbing dist, because tsc also emits declarations for internal modules that name Recharts.
anchors:
  - path: source/react-charts/packages/charts/api-check/run.mjs
    blob: beb4f632959f
  - path: source/react-charts/packages/charts/tsconfig.build.json
    blob: 7b2a0ea0e10a
confidence: verified
---

`tsconfig.build.json` includes all of `src`, so a `.d.ts` is emitted for internal modules such as
`ThemedChartContainer`, whose props are built from Recharts types; a glob over `dist/**/*.d.ts` would always fail.
`api-check/run.mjs:7` and `:45-52` walk declarations reachable from `dist/index.d.ts` through `from`, `import()` and
side-effect specifiers and scan only those; an unresolved specifier fails, and the walk must reach the
`LineChart` declaration so it cannot pass by scanning nothing. Runtime half (`:27`): sorted export names of
`dist/index.js` must equal `expectedExports`, so a public export is added there and in `src/index.ts` together.

The match is `/recharts/i` per line of every reachable declaration, comments included (`api-check/run.mjs:75,80-85`),
so a doc comment naming the library fails the check. Unreachable internal declarations are still published under `dist/`.
