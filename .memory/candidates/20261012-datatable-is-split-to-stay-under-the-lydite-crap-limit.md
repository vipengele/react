---
about: DataTable is split into hooks and parts because a single component function crossed lydite's per-function complexity (CRAP) limit of 30 in CI, and the limit is not configured in this repo
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/useSortState.ts
  - source/react-ui/packages/ui/src/DataTable/useSelectionState.ts
  - source/react-ui/packages/ui/src/DataTable/usePaginationState.ts
  - .lydite/components.yml
---
The `lydite / test (ui)` CI job printed `crap(ui) … 1 function(s) above 30, worst 41.0, baseline 0` for the `DataTable`
function when sorting, selection and rendering all lived in it (cyclomatic complexity 41, 100% covered, so the score is
the complexity). The rule printed with it: the count of functions above 30 may not rise, and testing or splitting any
one of them clears it. The number comes from lydite's output, not from a file in this repo, so a change to it would not
show in a diff here.

Sort state, selection state, page state and column-size state each have a hook (`useSortState.ts`,
`useSelectionState.ts`, `usePaginationState.ts`, `useColumnSizing.ts`), and the header cells, body and rows are their own components, so `DataTable` holds the engine
wiring and each branch lives in a small unit. Before the DataTable work the worst function in the whole `ui` package
scored 29, and with column resize in place the worst reads exactly 30.0 (the gate fails only above 30), so one more
branch in the function that holds it fails the gate. To measure locally, run
`lydite test --component ui --gate-coverage --base-branch main --no-color` from the repo root (about 2.5 minutes, it runs
the Chromium project too); it prints the `crap(ui)` line. Put new branches in a hook or a part rather than in the
`DataTable` function.
