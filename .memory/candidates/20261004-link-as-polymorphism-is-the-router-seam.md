---
about: Link is router-agnostic only through a polymorphic `as` prop forwarding every other prop; `external` is explicit because href cannot be inspected once `as` is a router link; a composer must pass `as`/props through, not sniff hrefs
saw:
  - source/react-ui/packages/ui/src/Link/Link.tsx
  - docs/adr/0021-link-external-affordance-is-an-explicit-prop.md
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/.agents/rules/no-custom-property-assignment-under-visited.md
  - source/react-ui/packages/ui/.agents/rules/wrap-trigger-never-clone.md
---

- `Link.tsx` `LinkProps<C extends ElementType = "a">` = own props (`tone`, `external`, `ref`, `className`, `children`) + `as?: C` + `Omit<ComponentPropsWithoutRef<C>, ...>`; renders `const Component = as ?? "a"` and spreads `...rest` onto it (Link.tsx:35-60). `ref` is a plain React 19 prop (no `forwardRef` anywhere: `grep -rn forwardRef src` -> 0). No `asChild`/Slot anywhere (`grep -rn asChild src` -> 0), so there is no second polymorphism mechanism to mix.
- ADR-0021 (read): `external` is explicit because with `as` pointing at a router link the href/`to` is router-defined, so origin sniffing "silently stop[s] working ... which is exactly the composition path this component exists to support". Follows `Typography`'s `as` pattern.
- Consequence for composers (Breadcrumbs): pass-through of `as` and router props per item; `target`/`rel` set by `external` come before `...rest`, so a caller's explicit `target`/`rel` wins. `:visited` colour is per-tone-class only (`no-custom-property-assignment-under-visited.md`).
- Cloning a consumer trigger is forbidden except labelling aria attributes (`wrap-trigger-never-clone.md`), another reason `asChild`-style cloning would be inconsistent here.
- API-shape precedent (AGENTS.md, ADR-0003): flat props are the default; compound components (Card, Tabs, Table) are opt-in, Card's runtime child validation is "not a pattern to reach for by default" (ADR-0003); Tree is data-driven (`items`+`renderItem`, ADR-0024-tree). Controlled/uncontrolled helper: `src/Tree/useControllableState.ts` (value controlled when `!== undefined`), local to Tree, not in `src/internal/`.
