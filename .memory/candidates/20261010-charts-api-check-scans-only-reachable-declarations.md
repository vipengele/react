---
about: the charts api-check follows relative imports from dist/index.d.ts instead of globbing dist, because tsc also emits declarations for internal modules that name Recharts
saw:
  - source/react-charts/packages/charts/api-check/run.mjs
  - source/react-charts/packages/charts/tsconfig.build.json
  - source/react-charts/packages/charts/src/internal/ThemedChartContainer/ThemedChartContainer.tsx
---

- `tsconfig.build.json` includes all of `src` (tests excluded), so `tsc` emits a `.d.ts` for every
  module, including `src/internal/ThemedChartContainer/`, whose props type is built from Recharts'
  `ResponsiveContainerProps`. A glob over `dist/**/*.d.ts` for `recharts` would always fail on it.
- `api-check/run.mjs` therefore walks the declarations reachable from `dist/index.d.ts` through
  relative `from`, `import()` and side-effect `import` specifiers, and scans only those for Recharts
  and for `ThemedChartContainer`. A specifier resolving to no declaration file is itself a failure,
  and the walk must reach `dist/LineChart/LineChart.d.ts`, so it cannot pass by scanning nothing.
- The unreachable internal declarations are still published under `dist/`; they are not part of the
  type surface a consumer's checker follows from the package entry.
- The runtime half asserts the sorted export names of `dist/index.js` equal `expectedExports`, so a
  public export is added in that list and in `src/index.ts` together.
