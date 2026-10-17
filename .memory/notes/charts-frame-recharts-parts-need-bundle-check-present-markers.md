---
name: charts-frame-recharts-parts-need-bundle-check-present-markers
kind: gotcha
description: Both single-chart bundles assert ReferenceLine and ReferenceArea present because the shared frame draws them; a new frame-drawn Recharts part needs a marker in both present lists.
anchors:
  - path: source/react-charts/packages/charts/bundle-check/run.mjs
    blob: f36b6c86e7e0
confidence: verified
---

The shared frame draws `ReferenceLine`/`ReferenceArea` for `referenceLines`, `markers` and `gaps`, so `bundle-check/run.mjs` lists `recharts-reference-line` and `recharts-reference-area-rect` (`:86-87`) in the `present` list of both the LineChart (`:117`) and AreaChart (`:131`) bundles. Only Area/Line and the other chart types are asserted absent (`lineAbsent`, `areaAbsent`).

A new Recharts part drawn by the frame needs a string-literal marker (a class name the module emits, never a bare identifier, since `//#region` comments would match) added to both `present` lists by hand; the all-charts control (`:147`) derives from the absent lists and needs no edit.
