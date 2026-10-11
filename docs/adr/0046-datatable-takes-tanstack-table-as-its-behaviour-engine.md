---
status: proposed
---

# `DataTable` takes `@tanstack/react-table` as its behaviour engine, behind its own types

`Table` is presentational and needs no engine (ADR 0027). `DataTable` adds sorting, row
selection, pagination, row virtualization and column resize. This records where that behaviour
comes from, what it costs consumers who only want `Table`, and how the engine stays out of the
public API.

## Decision

**The engine is a real dependency.** `@vipengele/react-ui` takes `@tanstack/react-table` as a
`dependencies` entry, the tier `@floating-ui/react` (ADR 0002) and `@tanstack/react-virtual`
(ADR 0039) already occupy. Sorting, selection, resize and the row model share one set of state
and one derivation (column order and sizes, sorted row order, selected set, the page slice). The
engine owns that derivation and the state transitions between its parts; a hand-written version
would rebuild a row model and then keep it in step with every feature added after it (filtering,
column visibility, expansion). The library is headless, so `DataTable` still owns every element,
class and attribute.

**`DataTable` is a separate component from `Table`.** `DataTable` renders `Table`'s markup and
imports the engine; `Table` imports neither. A consumer who imports `Table` bundles no engine,
and `bundle-check` proves it: `@tanstack/table-core` joins `@tanstack/virtual-core` among the
third-party code asserted absent from a Button-only bundle, and a `DataTable`-only entry file is
its positive control. Both use a marker that is a runtime string literal in the library, not an
export name, which a bundler drops whether or not the library is present (the same constraint
that fixed the virtual-core marker). `DataTable` also adds its stylesheet marker and, being
compound, its `/* @__PURE__ */` annotation, under the existing bundle-check rules.

**Only the features `DataTable` exposes are loaded.** The engine's feature set is selected
explicitly, so a feature `DataTable` does not offer (grouping, pinning, global filter) adds no
code to the bundle.

**Engine types do not reach the public API.** `DataTable`'s props, callbacks and exported types
are plain declarations owned by this package: a column definition, a `SortState` of
`{ columnId, direction }[]`, a set of selected row ids, a `{ page, pageSize }` pair. The
component maps them to and from the engine's state internally. This follows `PopoverPlacement`
and `TooltipPlacement`, which re-declare floating-ui's placements rather than re-exporting them,
and it means a consumer's types do not change when the engine's major version does. The cost is a
mapping layer to maintain, accepted because the alternative couples the public surface to a
library's release cadence.

**The engine does not own paging or windowing.** Pagination is the existing `Pagination`
component, consumed whole (ADR 0043), with the engine's page state bridged to its `page` and
`pageSize` props; the bridge clamps at render and never fires `onPageChange` from an effect, as
`Pagination` does. Windowing is `@tanstack/react-virtual` as in `Tree` (ADR 0039). Focus follows
the rule `Tree` set (ADR 0038): the row model, not the DOM, is the source of truth for the next
and previous row, and the tabbable row stays mounted under windowing. How `<tr>` rows are
windowed inside a native `<table>` is a separate decision, taken in the `DataTable` change.

**Supply-chain gates apply unchanged.** The pinned version of `@tanstack/react-table` and its
transitives (`@tanstack/table-core`, `@tanstack/store`, `@tanstack/react-store`) must clear
`minimumReleaseAge`, `trustPolicy: no-downgrade` and `blockExoticSubdeps`, as ADR 0039 requires.
The newest release that passes is the pin, not the latest. The package publishes frequent
patch releases, so the newest passing version is expected to trail `latest`; an `overrides` entry
is the remedy when a transitive fails `no-downgrade`, as for `chokidar` and `semver`.
`packages/ui/AGENTS.md` lists the ADRs to read before adding a dependency; it names this one
too.

## Considered options

- **Writing the behaviour here.** Rejected: sorting, selection and pagination are each small,
  but column resize and the shared row model are not, and the features compound. It is the same
  kind of code ADR 0002 and ADR 0039 found looks done and isn't. Its one real advantage, no
  dependency, is already given up by the two dependencies above.
- **Writing the behaviour here and taking an engine only for resize.** Rejected: resize state
  (sizes, ordering, the pointer drag) interacts with the row model through sort and column
  order, so splitting it leaves two sources of truth.
- **Re-exporting the engine's types as the public API.** Rejected: it makes the engine's major
  version the package's, and `packages/ui` has no `api-check` to notice a leak (the charts
  package has one).
- **Making the engine a peer dependency.** Rejected: nothing else needs to share a copy with the
  consumer's. Unlike `@vipengele/react-telemetry`, it holds no context, so a second copy
  splits nothing.
- **Putting the engine behind `Table` (sortable `Table`).** Rejected: it would put the engine
  into every `Table` bundle and erase the reason `Table` is presentational.
