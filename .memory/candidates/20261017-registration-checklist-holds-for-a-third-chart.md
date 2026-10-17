---
about: adding StackedBarChart followed the new-component checklist step for step, including that bundle-check needs the control's union edited
saw:
  - source/react-charts/packages/charts/api-check/run.mjs
  - source/react-charts/packages/charts/src/index.ts
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/apps/storybook/src/StackedBarChart.stories.tsx
targets: charts-new-component-registration-checklist
verdict: still-true
---
`StackedBarChart` was registered by exporting it from `src/index.ts` and adding it to `expectedExports` in `api-check/run.mjs` together (`["AreaChart","LineChart","StackedBarChart"]`); `api-check` needs no declaration-file list because it checks `dist/<Name>/<Name>.d.ts` reachability for each name in `expectedExports`. It needed its own `bundle-check/entry-bar.js` and case and a place in the all-charts control (step 2). No per-component entry in `package.json` `exports` or `.lydite/components.yml` was needed (step 3). Its stories are `apps/storybook/src/StackedBarChart.stories.tsx` (step 5). Public aliases of the shared types (`StackedBarChart*`) are re-exported from the chart file and listed in `src/index.ts`.
