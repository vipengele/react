---
about: "charts api-check compares runtime export names and greps reachable .d.ts for forbidden words; it never snapshots prop shapes, so new props and new unexported-from-index types leave it unchanged"
saw:
  - source/react-charts/packages/charts/api-check/run.mjs
  - source/react-charts/packages/charts/src/index.ts
  - source/react-charts/packages/charts/src/internal/types.ts
  - source/react-charts/packages/charts/src/internal/SeriesKey/SeriesKey.tsx
  - source/react-charts/packages/charts/src/internal/CartesianChartFrame/CartesianChartFrame.tsx
  - source/react-charts/packages/charts/bundle-check/run.mjs
  - source/react-charts/packages/charts/AGENTS.md
---

Read from code, not from a note.

- api-check (`api-check/run.mjs:25-33`) asserts only the sorted runtime keys of `dist/index.js` equal
  `["AreaChart","LineChart"]`. Type exports are erased at runtime, so adding `ChartGap`/`ChartMarker` types
  (even exported from `src/index.ts`) or new props does not change that assertion. There is no api-extractor
  report or `.d.ts` snapshot to update. The only other gate (`:74-90`) greps every .d.ts reachable from
  `dist/index.d.ts` line by line, case-insensitive, for `recharts` and `ThemedChartContainer`: a doc comment
  saying "Recharts" on a new prop fails it. Say "the charting library".
- New shared types go in `src/internal/types.ts` (type-only, reachable, scanned) and each chart re-exports
  them under `LineChart*`/`AreaChart*` names in `src/index.ts` (convention, nothing enforces the re-export).
- A Recharts type in a prop (e.g. `TooltipContentProps`) fails api-check only if its name or import shows up in a
  reachable .d.ts; `seriesTooltip` imports `TooltipContentProps` in `SeriesKey.tsx:2` and is fine because
  `internal/SeriesKey` is not reachable from the entry. AGENTS.md and ADR-0041 forbid it regardless.
- bundle-check (`bundle-check/run.mjs:~108-125`): `recharts-reference-line` is asserted ABSENT from the
  LineChart-only bundle (`lineAbsent` includes `rechartsReferenceLineMarkers`), and AGENTS.md says the same.
  Giving LineChart a ReferenceLine (or ReferenceArea) makes that check fail until `rechartsReferenceLineMarkers`
  moves from `lineAbsent` to LineChart's `present` list; a ReferenceArea needs its own string-literal marker
  (a class name the module passes, like `recharts-reference-area`), asserted present in the bundles that use it
  and added to the all-charts control. Hand-edited, no update command. Also update the prose in AGENTS.md and
  the byte counts in ADR-0041 "Bundle cost" if you care they stay true (ADR numbers are not asserted).
- Null handling is deliberate: `ChartRow` allows `null | undefined` ("a gap", `types.ts:11`), data is passed
  to Recharts uncoerced, and `connectGaps` (default false) maps to `connectNulls` in both charts
  (`LineChart.tsx:~48`, `AreaChart.tsx:~76`). `seriesTooltip` skips non-number values (`SeriesKey.tsx:~47`).
  Null-break is already the default; only interpolation/zero-fill could be new.
