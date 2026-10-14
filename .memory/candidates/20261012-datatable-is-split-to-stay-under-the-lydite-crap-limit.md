---
about: DataTable is split into hooks and parts because a single component function crossed lydite's per-function complexity (CRAP) limit of 30 in CI, and the limit is not configured in this repo
saw:
  - source/react-ui/packages/ui/src/DataTable/DataTable.tsx
  - source/react-ui/packages/ui/src/DataTable/useSortState.ts
  - source/react-ui/packages/ui/src/DataTable/useSelectionState.ts
  - source/react-ui/packages/ui/src/DataTable/usePaginationState.ts
  - source/react-ui/packages/ui/src/DataTable/useRowWindow.ts
  - .lydite/components.yml
---
The `lydite / test (ui)` CI job printed `crap(ui) … 1 function(s) above 30, worst 41.0, baseline 0` for the `DataTable`
function when sorting, selection and rendering all lived in it (cyclomatic complexity 41, 100% covered, so the score is
the complexity). With row virtualization wired into it, it failed again at 34.0. The rule printed with it: the count
of functions above 30 may not rise, and testing or splitting any one of them clears it. The number comes from lydite's
output, not from a file in this repo, so a change to it would not show in a diff here.

Sort state, selection state, page state, column-size state and the row window each have a hook (`useSortState.ts`,
`useSelectionState.ts`, `usePaginationState.ts`, `useColumnSizing.ts`, `useRowWindow.ts` — the virtualizer, the
body offset, the pinned focused row and the `aria-rowcount`/`aria-rowindex` values), and the header cells, body and
rows are their own components, so `DataTable` holds the engine wiring and each branch lives in a small unit. Lydite
counts the branches of a function's nested callbacks into it: a count of the same decision points over the AST puts
`DataTable` at about 21 and `useRowWindow` at about 12. The gate still reads `0 function(s) above 30, worst 30.0`, and
that worst is a function outside `DataTable/` (lydite prints only the worst score, not its name), so the package as a
whole has no headroom and one more branch in that function fails the gate. To measure locally, run
`lydite test --component ui --gate-coverage --base-branch main --no-color` from the repo root (about 3 minutes, it runs
the Chromium project too); it prints the `crap(ui)` line, naming a function only when it fails. Put new branches in a
hook or a part rather than in the `DataTable` function.
