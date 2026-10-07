---
about: Accordion and Disclosure now exist; the conventions they were built against (state API, ref-as-prop, compound/context pattern, motion tokens) are scattered across Tabs, Tree and rules
saw:
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/Tree/Tree.tsx
  - source/react-ui/packages/ui/src/Tree/useControllableState.ts
  - source/react-ui/packages/ui/src/Accordion/Accordion.tsx
  - source/react-ui/packages/ui/src/Disclosure/Disclosure.tsx
  - source/react-ui/packages/ui/src/internal/disclosureGroup.ts
  - source/react-ui/packages/ui/.agents/rules/null-context-for-standalone-components.md
  - docs/adr/0030-disclosure-is-the-primitive-accordion-composes-it.md
---

Checked 2026-10-05.

- `Disclosure` is the primitive and `Accordion` composes it through `DisclosureGroupContext`
  (`internal/disclosureGroup.ts`), which is `null` outside an accordion so a `Disclosure` stands
  alone. Inside a group it ignores its own `open`/`defaultOpen`; its `onOpenChange` still fires,
  before `group.toggle`. The reasoning, and the rejected `<details>`, separate-components and
  compound-parts designs, are in ADR 0030.
- State API is still not uniform across the package: Tabs = `value`/`defaultValue`/`onChange(value)`
  with an inline `value !== undefined` controlled check (`Tabs.tsx` TabsImpl); Tree =
  `expanded`/`defaultExpanded`/`onExpandedChange(Set)` via `Tree/useControllableState.ts` (private
  to Tree, not in `internal/`). `Accordion` follows Tabs (`value`/`defaultValue`/`onChange`) and
  takes Tree's `ReadonlySet<string>` in `multiple` mode.
- No `forwardRef` (React 19 ref-as-prop), no `asChild`; state is normally a class
  (`vpg-disclosure-open`), not `data-state`.
- Motion is `transition ... var(--vpg-duration-*) var(--vpg-ease-standard)`; the base stylesheet
  zeroes durations under reduced motion (tokens `base-stylesheet.ts`), so a component writes no
  media query of its own. `Disclosure` is the package's first height animation.
