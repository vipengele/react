---
about: DataTable's engine, dependency tier, state ownership and Pagination bridge are already decided in ADR 0046; the repo has no DataTable code, no api-check and AGENTS.md does not yet name 0046
saw:
  - docs/adr/0046-datatable-takes-tanstack-table-as-its-behaviour-engine.md
  - docs/adr/0039-tanstack-react-virtual-for-opt-in-tree-windowing.md
  - docs/adr/0043-pagination-is-one-standalone-component-over-dropdown.md
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/icons/package.json
  - source/react-charts/packages/charts/package.json
  - source/react-ui/pnpm-workspace.yaml
---
Cost: several ADR reads plus package.json comparisons.

- ADR 0046 (status accepted): @tanstack/react-table is a `dependencies` entry of react-ui (same tier as
  @floating-ui/react, ADR 0002, and @tanstack/react-virtual, ADR 0039), not a peer (no context, a second copy splits
  nothing). Engine types never reach public API (own ColumnDef/SortState/selection/{page,pageSize}); a ui `api-check`
  modelled on charts' must ship in the same change. DataTable owns state via useControllableState and feeds the engine
  fully controlled state. Pagination consumed whole, bridged without an effect. Windowing via react-virtual as in Tree;
  how <tr> rows are windowed in a native table is explicitly left undecided. Engine is dropped if it fails
  minimumReleaseAge/no-downgrade/blockExoticSubdeps or cannot be driven from Pagination without an effect.
- Precedent: icons has lucide-react in `dependencies` (icons/package.json:35-37); charts has recharts pinned 3.10.1 in
  `dependencies` (charts/package.json:35-38); only react/react-dom/tokens(/telemetry in ui) are peers. ui deps today:
  floating-ui/react, tanstack/react-virtual, react-icons, @vipengele/ts (ui/package.json:35-40).
- Drift: ui/AGENTS.md:99-103 lists ADRs 0002/0035/0039 "before adding another" dependency but not 0046 (ADR 0046 says
  it should). No source/react-ui/packages/ui/api-check exists, no src/DataTable, and bundle-check/run.mjs:~150-175 has
  only the virtual-core marker (no table-core marker yet).
- Supply chain: react-ui/pnpm-workspace.yaml has minimumReleaseAge 10080 min (7 days; @vipengele/* excluded),
  trustPolicy no-downgrade, blockExoticSubdeps, overrides chokidar/semver as the remedy pattern; pin newest passing, not latest.
