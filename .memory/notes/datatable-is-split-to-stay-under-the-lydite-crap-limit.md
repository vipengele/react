---
name: datatable-is-split-to-stay-under-the-lydite-crap-limit
kind: rationale
description: DataTable is split into hooks and parts because one component function crossed lydite's per-function CRAP limit of 30 in CI, and that limit is configured nowhere in this repo; put new branches in a hook or part.
anchors:
  - path: source/react-ui/packages/ui/src/DataTable/DataTable.tsx
    blob: 7315ea2c1173
  - path: source/react-ui/packages/ui/src/DataTable/useSortState.ts
    blob: cca8b092e12e
  - path: source/react-ui/packages/ui/src/DataTable/useSelectionState.ts
    blob: 8ff4d31cf430
  - path: source/react-ui/packages/ui/src/DataTable/usePaginationState.ts
    blob: 08b92b0e958e
  - path: source/react-ui/packages/ui/src/DataTable/useRowWindow.ts
    blob: a29a15d63d60
  - path: .lydite/components.yml
    blob: 21c9355768df
confidence: suspect
---

The `lydite / test (ui)` CI job printed `crap(ui) … 1 function(s) above 30, worst 41.0, baseline 0` for the `DataTable`
function while sorting, selection and rendering all lived in it (cyclomatic complexity 41, fully covered, so the score is the
complexity); with row virtualization wired in it failed again at 34.0. The printed rule: the count of functions above 30 may
not rise, and testing or splitting any one of them clears it. The numbers come from lydite's output, not from a file here, so
a change to the limit would not show in a diff.

Sort, selection, page, column-size state and the row window each have a hook (`useSortState.ts`, `useSelectionState.ts`,
`usePaginationState.ts`, `useColumnSizing.ts`, `useRowWindow.ts`), and header cells, body and rows are their own components,
so `DataTable` holds only the engine wiring. Lydite counts a function's nested callbacks into it; a count over the AST put
`DataTable` near 21 and `useRowWindow` near 12 (the explorer's count, not re-run). The gate then read
`0 function(s) above 30, worst 30.0`, and that worst is a function outside `DataTable/` (lydite prints only the worst score,
not its name), so the package has no headroom and one more branch in it fails.

To measure: `lydite test --component ui --gate-coverage --base-branch main --no-color` from the repo root (about 3 minutes,
it runs the Chromium project); it names a function only when it fails. See also
[[lydite-coverage-gate-is-a-baseline-comparison]].
