---
status: accepted
---

# The `ui` package's coverage gate is 80%; reasoned ignores stay budgeted at 0

`@vipengele/react-ui` gates `pnpm test` on 80% statements, branches, functions and lines under the
v8 provider. Every other package that ships code (`icons`, `tokens`, `telemetry`, `charts`) stays at
100%. This supersedes ADR-0047, whose rejected option "lowering the global threshold" this reverses
for `ui`, and restates which of its rules still hold.

## Decision

**`ui` gates at 80%.** `source/react-ui/packages/ui/vitest.config.ts` keeps one `thresholds` block,
with all four figures at 80. No component, directory or file in `ui` gets a figure of its own.

**Design is never shaped by what is cheaper to test.** `DataTable` is meant to be the best data
table it can be, and the same holds for every large component in `ui`. At 100%, every branch a
component carries has to be paid for with a test before it can merge, and the cheapest way to pay
is to carry fewer branches. ADR-0047 said this outright: the cost of testing a branch was a reason
to simplify the code. That pressure acts on the design, not on the tests, and it acts hardest on
the components where design matters most. 80% removes it while still failing a package whose
suite has stopped exercising most of what it ships.

**What does not change.**

- The other packages keep 100% and ADR-0047's reasoning for them: they are small, and their last
  few percent are cheap.
- The inline-ignore rule survives unchanged in every package, `ui` included. An unreachable line
  may take `/* v8 ignore next -- <reason> */` (or a `start`/`stop` pair) with a reason; nothing wider
  is allowed (no file-level or whole-function ignore, no `coverage.exclude` entry for source).
  The count is budgeted per package, the budget is 0, and no ignore may be added until the budget
  check and the reason check exist. The threshold and the pragma rule are independent: the rule
  is about which lines are allowed to vanish from the report, not about how high the bar is, and
  at 80% a pragma has even less to buy.
- A reachable branch never takes a pragma. In `ui` a branch a user can reach is tested, or it is
  left visibly uncovered in the report. It is never hidden.
- The browser project (`*.browser.test.*`) still feeds the same coverage report, and is still where
  a test that needs a real engine goes.

**The lydite gate is separate, and this decision does not configure it.** The `lydite` job in
`.github/workflows/ci-orchestration.yml` runs the reusable workflow
`pedromvgomes/gt/.github/workflows/reusable-lydite.yml@v2`, which lives outside this repository.
On every push to the default branch, the `lydite-baseline` job records the coverage of the merged
tree. On a pull request, lydite measures each `.lydite/components.yml` component, `ui` among them,
and compares it against the baseline recorded for the merge-base, so it gates on a drop rather than
on a fixed figure. The vitest threshold has no part in that comparison. `lydite` reads optional
`coverage.tolerance`, `coverage.floor` and `coverage.patch.tolerance` keys from
`.lydite/config.yml`. This repository sets none of them. How the reusable workflow treats a
deliberate drop below the baseline, and whether a person can accept one, is not recorded here.

## Considered options

- **Keep 100% in `ui` and spend ignores on hard branches.** Rejected: a pragma on a reachable
  branch hides behaviour, which ADR-0047 rightly forbids, and the remaining choice is the design
  pressure this decision exists to remove.
- **A per-component threshold for `DataTable`.** Rejected for ADR-0047's reason: a number says how
  much is uncovered, not what, and it leaves slack nobody maintains.
- **Lower every package to 80%.** Rejected: the pressure falls on `ui`'s large components. The
  other packages meet 100% without bending their design, so lowering them buys nothing.

## Consequences

- `ui` can carry uncovered branches. Coverage in `ui` is a floor that catches a suite that has
  stopped running most of the package. It is not a target to write tests down to.
- `pnpm test` in `ui` passes a change that leaves new code uncovered, as long as the package stays
  at 80%. Only the lydite gate, comparing against the default-branch baseline, can stop a drop.
- `ui/AGENTS.md` states the 80% figure. A change to the threshold changes it and this record
  together.
