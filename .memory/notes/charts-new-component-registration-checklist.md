---
name: charts-new-component-registration-checklist
kind: gotcha
description: A new charts component must be registered in src/index.ts and api-check's expectedExports together, get its own bundle-check entry and markers, and be added to the all-charts control's union; nothing is registered per component in package.json exports or .lydite/components.yml.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: 239c7c4ac33f
  - path: source/react-charts/packages/charts/api-check/run.mjs
    blob: c3d55100aa8a
  - path: source/react-charts/packages/charts/package.json
    blob: b18fb76e6bda
  - path: source/react-charts/packages/charts/src/vitest.setup.ts
    blob: e58d31db0dc0
  - path: .lydite/components.yml
    blob: 21c9355768df
confidence: verified
---

Re-checked against the code with StackedBarChart as the third chart: it followed every step below.

1. Export from `src/index.ts` (named exports, no barrel) **and** add the name to `expectedExports` in `api-check/run.mjs:25`
   (`["AreaChart","LineChart","StackedBarChart"]`). `dist/<Name>/<Name>.d.ts` must be reachable from `dist/index.d.ts`
   (`api-check/run.mjs:66`), so no declaration-file list is needed. Forgetting one side fails api-check.
2. bundle-check needs a new entry file (`entry-bar.js` for StackedBarChart), a case and markers in `run.mjs`, and the chart's
   absent list added by hand to the all-charts control's `controlled` union (`run.mjs:162`) and its export to `entry-charts.js`;
   see [[charts-bundle-check-chart-infrastructure-arrives-with-first-chart]] and
   [[charts-frame-recharts-parts-need-bundle-check-present-markers]].
3. `package.json` `exports` has only `.` and `./package.json` (`package.json:18-24`), so there is no per-component subpath to
   add. `.lydite/components.yml` has one `charts` component (`:87`) for the whole package plus `charts-storybook` (`:99`), so
   nothing per component there either.
4. Tests: `<Name>.test.tsx` (jsdom) and `<Name>.browser.test.tsx` (Chromium) for layout; thresholds are 100% with no ignores.
   jsdom has no `ResizeObserver`; `src/vitest.setup.ts:14` stubs it as a no-op, so Recharts `ResponsiveContainer` measures 0 in
   jsdom and sizing or geometry is assertable only in the browser project (`ThemedChartContainer.browser.test.tsx`).
5. Stories: `source/react-charts/apps/storybook/src/<Name>.stories.tsx`, in the same PR (repo rule).
6. `ThemedChartContainer.stylesheet.ts:20-21` draws its frame as `outline: 1px solid var(--vpg-border); outline-offset: -1px`.
