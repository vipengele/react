---
about: no container-width / measure / breakpoint token exists and no ADR decides Center vs Container; a max-width prop must add a token family (the Grid column-width precedent) or stay a literal
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/theme.test.ts
  - source/react-ui/packages/ui/src/Grid/Grid.tsx
  - source/react-ui/packages/ui/src/Stack/Stack.tsx
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - docs/adr/0022-grid-columns-auto-fit-from-a-column-width-scale.md
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
  - CONTEXT.md
---

Prepared while planning issue #57 (Center / Container). Re-checked by reading.

- Token families in `theme.ts:224-258`: size (xs-2xl, control heights), icon, space (1-8, max 2rem),
  column (sm-xl, 12-24rem). No container width, measure (ch) or breakpoint token. A grep of
  CONTEXT.md, docs/adr and ui/README for center/container/measure finds only the *name* `Center` in
  ADR-0019 (:3) and CONTEXT.md:139 ("Layout primitive"); nothing decides one-vs-two components or
  a `max-width` prop. ADR-0019 "What is not committed" defers exact prop names, defaults,
  responsive values, and steps beyond space-8.
- A max-width prop is a length, so by ADR-0019 it takes a token name. Options: reuse
  `--vpg-column-*` (12-24rem, too narrow for a page shell; CONTEXT.md:98 says a column step is
  not a breakpoint) or add a new scale. ADR-0022 is the template: new scale in `theme.ts`, a
  token-name union and lookup table in the component, new `CONTEXT.md` term. ADR-0009:136-140
  allows literals only for a container measurement no family carries, but a *prop* cannot take
  that route (ADR-0019 forbids arbitrary values).
- Adding tokens touches: `createTheme` in `theme.ts` (emitted into the Theme; `ThemeProvider`
  just spreads `theme` as inline style, `ThemeProvider.tsx:32`, so no provider change), the
  enumerated key list and value test in `theme.test.ts:40-62,167-177`, and ADR-0022's accepted
  risk (a ui newer than tokens leaves the bare read unresolved, no fallback allowed).
- Precedent inconsistency: `Stack` types props with `ComponentPropsWithRef<C>` (ref reaches the
  element, `Stack.tsx:~58`), `Grid` with `ComponentPropsWithoutRef<C>` (`Grid.tsx:~60`). Both
  use `as`, a plain `ref` prop (no forwardRef), a closed-keyword lookup that falls back to the
  default via `Object.hasOwn`, and spread caller `style` last. Stack spreads `style` into the
  inline-property object; className is merged with `filter(Boolean).join(" ")`.
- Component checklist beyond the issue's DoD: add a `{ name, marker }` row to
  `bundle-check/run.mjs:~60-90` (rule `.agents/rules/update-bundle-check-with-every-component.md`),
  export from `src/index.ts` (plain named export), a story in `apps/storybook/src/`. `.lydite/components.yml`
  needs no change (ui is one component, `dir: source/react-ui/packages/ui`). package.json has
  `sideEffects: false` and a single `.` export, so nothing to register there.
