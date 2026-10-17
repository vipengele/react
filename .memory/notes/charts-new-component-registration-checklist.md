---
name: charts-new-component-registration-checklist
kind: gotcha
description: A new charts component must be registered in src/index.ts and api-check's expectedExports together, get its own bundle-check entry and markers, and be added to the all-charts control; nothing is registered per component in package.json exports or .lydite/components.yml.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: afcdf3ea3b2f
  - path: source/react-charts/packages/charts/api-check/run.mjs
    blob: beb4f632959f
  - path: source/react-charts/packages/charts/package.json
    blob: 1b31ebbffcda
  - path: source/react-charts/packages/charts/src/vitest.setup.ts
    blob: e58d31db0dc0
  - path: .lydite/components.yml
    blob: 5d78d1592e95
confidence: suspect
---

Assembled by an explorer from several files; the bundle-check and container details were re-checked, the rest is read from code.

1. Export from `src/index.ts` (named exports, no barrel) **and** add the name to `expectedExports` in `api-check/run.mjs`;
   `dist/<Name>/<Name>.d.ts` must be reachable from `dist/index.d.ts`. Forgetting one side fails api-check.
2. bundle-check needs a new entry file plus markers in `run.mjs`, and its markers must be added to the all-charts control
   (`entry-charts.js`); see [[charts-bundle-check-chart-infrastructure-arrives-with-first-chart]].
3. `package.json` `exports` has only `.` and `./package.json`, so there is no per-component subpath to add. `.lydite/components.yml`
   has one `charts` component for the whole package plus `charts-storybook`, so nothing per component there either.
4. Tests: `<Name>.test.tsx` (jsdom) and `<Name>.browser.test.tsx` (Chromium) for layout; thresholds are 100% with no ignores.
   jsdom has no `ResizeObserver`; `src/vitest.setup.ts` stubs it as a no-op, so Recharts `ResponsiveContainer` measures 0 in
   jsdom and sizing or geometry is assertable only in the browser project (`ThemedChartContainer.browser.test.tsx`).
5. Stories: `source/react-charts/apps/storybook/src/<Name>.stories.tsx`, in the same PR (repo rule).
6. `ThemedChartContainer.stylesheet.ts` draws its frame as `outline: 1px solid var(--vpg-border); outline-offset: -1px`.
