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

`tsconfig.build.json` includes all of `src` minus tests (`:8-9`), so a `.d.ts` is emitted for every
internal module, such as `src/internal/ThemedChartContainer/`, whose props are built from Recharts'
`ResponsiveContainerProps`; a glob over `dist/**/*.d.ts` for `recharts` would always fail. Those
unreachable declarations are still published under `dist/`, but a consumer's checker never follows
them from the package entry.

`api-check/run.mjs:46-62` walks the declarations reachable from `dist/index.d.ts` through `from`,
`import()` and side-effect `import` specifiers (pattern `:46`, queue `:49`) and `:74-90` scans only
those for `/recharts/i` and `ThemedChartContainer`. An unresolved specifier fails (`:41`), and the walk
must reach `dist/<Name>/<Name>.d.ts` for every name in `expectedExports` (`:66`), so it cannot pass by
scanning nothing or by dropping one chart's declarations from the entry.

The match is per line, comments included, so a doc comment on a shared type that names the library
fails the check: exported doc comments say "the charting library". Runtime half (`:27`): sorted
export names of `dist/index.js` must equal `expectedExports` (`:25`), so a public export is added there
and in `src/index.ts` together. (Line numbers above drift; find the scan by the `forbidden` array.)

It is a names check, not a shape snapshot: type exports are erased at runtime and there is no api-extractor report or `.d.ts` snapshot, so adding props or types (even exported from `src/index.ts`) changes nothing it asserts. Shared types go in `src/internal/types.ts` (reachable, scanned); re-exporting them under `LineChart*`/`AreaChart*` names is convention only. A Recharts type in a prop fails only if its name shows in a reachable `.d.ts`; `SeriesKey.tsx:2` imports `TooltipContentProps` safely because `internal/SeriesKey` is unreachable from the entry (AGENTS.md and ADR-0041 forbid it anyway).
