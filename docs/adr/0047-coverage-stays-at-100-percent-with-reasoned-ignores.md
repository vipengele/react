---
status: superseded by ADR-0048
---

# Coverage stays at 100% per package; unreachable lines take a reasoned, budgeted ignore

Every package that ships code (`icons`, `tokens`, `ui`, `telemetry`, `charts`) gates `pnpm test`
on 100% statements, branches, functions and lines under the v8 provider. Large components such
as `Calendar`, `DataTable` and the charts are where the last few percent of branch coverage cost
the most. This records whether the threshold holds for them, and what keeps an exemption from
becoming the way every large component gets through the gate.

## Decision

**One threshold, 100%, per package.** No component, directory or file gets its own lower number.
`vitest.config.ts` keeps a single `thresholds` block per package. A per-component figure such as
92% is a ratchet nobody maintains: it leaves slack that any uncovered branch can hide in, and it
never says which branches the slack was meant for.

**An unreachable line takes an inline ignore with a reason.** The form is
`/* v8 ignore next -- <reason> */`, or a `start`/`stop` pair around a few lines. The reason says
why no test can reach the line: an engine-internal fallback, or a guard against a state the types
already forbid. Anything wider than that is not allowed: no file-level ignore, no
whole-function ignore, no `coverage.exclude` entry for source.

**Behaviour is never ignored.** A branch a user can reach, through props, input, focus, a
resize or a data change, is covered by a test, whatever it costs to write. The cost of testing a
branch is a reason to simplify the code or move the test to the Chromium project (`*.browser.test.*`,
which feeds the same coverage report), not a reason to ignore it.

**The count of ignores is budgeted and can only be raised on purpose.** Each package has a
committed budget of its ignore pragmas. CI fails when the count in source exceeds the budget, so
adding one means editing the budget in the same diff, where a reviewer sees it. The budget
starts at 0: no coverage pragma exists today.

**The reason is checked mechanically.** A pragma without a reason fails `pnpm lint`. Biome cannot
express this, so it is a small script run by that command.

**The enforcement ships separately; until it lands, no ignore may be added.** The check and the
budget file are a follow-up to this record. The gate is closed in the meantime because the count
is 0 and the rule above forbids raising it without them.

## Considered options

- **Per-component thresholds.** Rejected for the slack argument above. A number says how much is
  uncovered, not what, so the exemption cannot be reviewed line by line.
- **No ignores ever.** Rejected: it is the strictest gate, but for a line no test can reach it
  asks for contorted code or a test that asserts nothing and exists only to touch the line.
  A named exemption with a reason is more honest than either.
- **Ignores with a reason but no budget.** Rejected: the reason requirement alone gives nothing
  that resists slow growth. The budget makes each increase an explicit, visible edit.
- **Lowering the global threshold.** Rejected: it spends the whole design system's headroom on
  the cost of a few components.

## Consequences

- A large component's tests are written to the same standard as a small one's. The authors of
  `Calendar`, `DataTable` and the charts plan their browser tests up front instead of discovering
  the gap at the end.
- Every ignore is a greppable line with its reason beside it.
- Separate from the vitest gate, the lydite stage compares coverage against the default-branch
  baseline. This ADR does not change it; a pragma lowers neither number, since ignored lines are
  excluded from both.
