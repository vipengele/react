---
about: planning Accordion/Disclosure - nothing accordion-like was ever built, decided or rejected; no ADR on motion, native details, or hidden=until-found; the state-API and a11y conventions it must match are scattered across Tabs, Tree and rules
saw:
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
  - source/react-ui/packages/ui/src/Tree/useControllableState.ts
  - source/react-ui/packages/ui/src/Tree/rowState.ts
  - source/react-ui/packages/ui/.agents/rules/null-context-for-standalone-components.md
  - source/react-ui/packages/ui/.agents/rules/pure-annotate-compound-component-exports.md
  - source/react-ui/packages/ui/vitest.config.ts
  - docs/adr/0003-card-compound-components-with-runtime-validation.md
  - docs/adr/0029-segmented-control-is-separate-from-tabs.md
---

Checked 2026-10-04.

- `grep -rniE "until-found|<details|<summary|accordion|disclosure" docs CONTEXT.md packages/*/AGENTS.md packages/ui/.agents packages/ui/README.md`
  -> 0 hits. No ADR, rule, candidate or component covers it. The only show/hide precedents are Tabs (only
  the selected panel is mounted, `Tabs.tsx` TabsPanel `role="tabpanel"`), Breadcrumbs (collapse marker
  expands in place), Tree (`aria-expanded` from `rowState.ts:57`) and Dialog (native `<dialog>`).
- State API is not uniform: Tabs = `value`/`defaultValue`/`onChange(value)` with inline
  `value !== undefined` controlled check (`Tabs.tsx` TabsImpl); Tree = `expanded`/`defaultExpanded`/
  `onExpandedChange(Set)` via `Tree/useControllableState.ts` (private to Tree, not in `internal/`).
  No `onValueChange` anywhere. Multi-expansion precedent is Tree's `ReadonlySet<string>`.
- No `forwardRef` (React 19 ref-as-prop), no `asChild`; polymorphism is `as?: C` on layout primitives,
  Link, Typography. `data-*` is sparse (`data-status`, `data-dragging`, `data-auto-grow`, `data-value`);
  state is normally a class (`vpg-tabs-tab-selected`). No `data-state` anywhere.
- Compound parts: context + `useId` base id (Tabs `baseId`, `${baseId}-tab-${value}`); throws outside
  parent unless standalone-capable (rule null-context-for-standalone-components); export via
  `/* @__PURE__ */ Object.assign` (rule pure-annotate-...).
- Motion: only `transition ... var(--vpg-duration-*) var(--vpg-ease-standard)`; base stylesheet zeroes
  durations to 0.01ms under reduced motion (tokens `base-stylesheet.ts:101-108`). No height-animation
  precedent, no ADR.
