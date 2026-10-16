---
about: charts bundle-check/container notes re-checked still true; what a new charts component must register
saw:
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/api-check/run.mjs
  - source/react-charts/packages/charts/package.json
  - source/react-charts/packages/charts/vitest.config.ts
  - source/react-charts/packages/charts/src/vitest.setup.ts
  - .lydite/components.yml
  - source/react-charts/apps/storybook/src
targets: charts-bundle-check-chart-infrastructure-arrives-with-first-chart
verdict: still-true
---

Markers and structure in `bundle-check/run.mjs` match the note (infra markers `:98-106`-ish in the current file,
present in single-chart bundles; per-chart absence lists; `entry-charts.js` positive control). Line numbers drift
slightly; find by symbol (`chartInfrastructureMarkers`, `lineAbsent`, `areaAbsent`, `controlled`).
`charts-container-frame-is-an-outline` also re-checked: `ThemedChartContainer.stylesheet.ts` still uses
`outline: 1px solid var(--vpg-border); outline-offset: -1px`, and `width` is still `${number}%`.

Registration checklist for a new charts component (read from code, cost several files to assemble):
1. `src/<Name>/<Name>.tsx` + `.test.tsx` (jsdom) and `.browser.test.tsx` for layout (Chromium/playwright);
   vitest projects `jsdom` and `chromium`, 100% thresholds with no ignores (`vitest.config.ts`).
2. Export from `src/index.ts` (named exports, no barrel) AND add to `expectedExports` in `api-check/run.mjs`;
   `dist/<Name>/<Name>.d.ts` must be reachable from `dist/index.d.ts`.
3. bundle-check: new entry file + markers in `run.mjs`, and add its markers to the all-charts control.
4. `package.json` `exports` has only `.` and `./package.json` - no per-component subpath to add.
5. `.lydite/components.yml` has ONE `charts` component for the whole package (`dir: source/react-charts/packages/charts`)
   plus `charts-storybook`; nothing per component to register.
6. Stories: `source/react-charts/apps/storybook/src/<Name>.stories.tsx` (repo rule: same PR).
7. jsdom has no ResizeObserver; `src/vitest.setup.ts` stubs it (no-op), so Recharts ResponsiveContainer measures 0
   in jsdom and sizing/geometry is only assertable in the browser project
   (`ThemedChartContainer.browser.test.tsx`). Recharts `ResponsiveContainer` is the sizing mechanism; no
   ResizeObserver code of our own.
