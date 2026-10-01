---
about: Center caps its width from the --vpg-width-* scale, a ceiling scale kept apart from the --vpg-column-* floor scale; there is no Container component, and the padding prop is inset because gutter is on the glossary's avoid-list
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/theme.test.ts
  - source/react-ui/packages/ui/src/Center/Center.tsx
  - source/react-ui/packages/ui/src/Center/Center.stylesheet.ts
  - source/react-ui/packages/ui/src/Grid/Grid.tsx
  - source/react-ui/packages/ui/src/Stack/Stack.tsx
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - docs/adr/0022-grid-columns-auto-fit-from-a-column-width-scale.md
  - docs/adr/0023-center-caps-content-width-from-a-width-scale.md
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
  - CONTEXT.md
---

Re-checked by reading the code as it stands on the Center branch.

- `createTheme` in `theme.ts` emits `--vpg-width-sm|md|lg|xl` (40/48/64/80rem), overridable through
  `overrides`. It sits beside the column scale (`--vpg-column-*`, 12-24rem), but the two are different
  axes: a width step is a ceiling on a container's content, a column step is the floor of a grid
  track. ADR-0023 records why the column scale does not simply gain steps, and `CONTEXT.md` keeps the
  **Width scale** and **Column-width scale** terms apart.
- `Center` is the one page-shell primitive; ADR-0019 reserves the name and ADR-0023 rejects a
  separate `Container`. Its `max` prop is a bare step name (`"sm"|"md"|"lg"|"xl"`, default `"lg"`)
  looked up in a table that falls back to the default via `Object.hasOwn`, as Grid's
  `minColumnWidth` does. Its inline padding prop is `inset`, because `gutter` is on the Spacing
  scale's _Avoid_ list in `CONTEXT.md`.
- `Center.stylesheet.ts` sets `box-sizing: border-box`, so `max` is the outer width including
  `inset`. Both `--vpg-center-max` and `--vpg-center-inset` are always written inline and read bare
  (ADR-0009); `intrinsic` is the `vpg-center-intrinsic` class, not a property.
- A ui newer than tokens leaves `--vpg-width-*` unresolved: the bare `var()` is invalid at
  computed-value time and no maximum applies, silently. The ui README's Peer dependencies text
  names the tokens version `Center` needs.
- Precedent inconsistency: `Stack` types props with `ComponentPropsWithRef<C>`, `Grid` with
  `ComponentPropsWithoutRef<C>`; `Center` follows Stack so `ref` reaches the element. All three use
  `as`, a plain `ref` prop (no forwardRef) and spread caller `style` last.
- A new component also needs a `{ name, marker }` row in `bundle-check/run.mjs` (rule
  `.agents/rules/update-bundle-check-with-every-component.md`), an export from `src/index.ts` and a
  story in `apps/storybook/src/`.
