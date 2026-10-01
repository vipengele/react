---
about: what a new ui component (layout primitives Stack and Inline) must touch, and what ADR-0019 does and does not fix; none of it is registered in lydite or a story index
saw:
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/.agents/rules/never-assign-theme-properties-inline.md
  - source/react-ui/packages/ui/.agents/rules/update-bundle-check-with-every-component.md
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/src/FieldSet/FieldSet.tsx
  - source/react-ui/packages/ui/src/FieldSet/FieldSet.browser.test.tsx
  - source/react-ui/packages/ui/src/Textarea/Textarea.tsx
  - source/react-ui/packages/ui/src/Inline/Inline.tsx
  - source/react-ui/packages/ui/src/internal/flexKeywords.ts
  - source/react-ui/apps/storybook/src/FieldSet.stories.tsx
  - .lydite/components.yml
---

Stack (`src/Stack/Stack.tsx`) and Inline (`src/Inline/Inline.tsx`) are the layout primitives; both
follow ADR-0019 and share `src/internal/space.ts` (token table) and `src/internal/flexKeywords.ts`
(align/justify keyword tables).

ADR-0019 decides (read, not inferred): per-instance values reach ONE static stylesheet as
`--vpg-<primitive>-<prop>` set inline to `var(--vpg-space-N)` / `0` / mapped keyword / number
(`:9-26`, `:55-57`). Length props take the union `"space-1".."space-8"|"none"` via a lookup table,
never pass-through (`:28-33`, `:43-47`); none -> `0`, no `--vpg-space-0`. Alignment props are closed
keyword unions (start/center/end/stretch/baseline, `between` on justify) set the same way (`:58-61`).
Caller `style` is spread last (as `Textarea.tsx:56-65`) and is an undocumented escape hatch (`:88-91`).
Scale is `--vpg-space-1..8` = 0.25rem..2rem (`tokens/src/theme.ts:240-247`); larger gaps need a new
scale step, not a wider prop (`:101-104`). It does NOT name `wrap`, polymorphic `as`, `className`
handling, default values, prop names (`:95-98`), or responsive values. Sharing between primitives is
by `src/internal/` helpers, not a base component; `src/internal/` never imports from a component.
Only `ButtonGroup.stylesheet.ts:41,59` use negative `-1px` margins (segment borders).

New-component checklist, each verified by reading:
- `.lydite/components.yml` is per PACKAGE (icons/tokens/ui); a new component in ui needs no entry.
- `bundle-check/run.mjs` `unrelatedComponents` needs `{ name, marker: ".vpg-inline {" }` (see the
  Stack and Inline entries); rule
  `.agents/rules/update-bundle-check-with-every-component.md`. Easy to miss.
- Story: `apps/storybook/src/<Name>.stories.tsx`, `title: "Components/<Name>"`, `satisfies Meta<typeof X>`
  (`FieldSet.stories.tsx:4-7`); no index registration found in `.storybook/`. Repo rule requires it in
  the same PR.
- `packages/ui/README.md` has a per-component `### Name` section (e.g. `:66`, `:164`); AGENTS.md says
  it is the consumer-facing API.
- Pattern: `<style href="vpg-x" precedence="vpg-x">{xStylesheet}</style>` rendered inside the element,
  stylesheet in `X.stylesheet.ts`, export from `src/index.ts` as plain named export
  (`FieldSet.tsx:29-35`). Browser tests wrap in `ThemeProvider` and resolve tokens by probing
  `blockSize: var(--vpg-space-N)` inside `.vpg-root`; the chromium project has no auto-cleanup so
  `afterEach(cleanup)` (`FieldSet.browser.test.tsx:17-32`). 100% thresholds incl. branches
  (`vitest.config.ts`), so every default and mapping branch needs a test.
- Release notes: `docs/release-notes/` is per tag (`react-ui@vX.Y.Z.md`), none per component; no
  changesets. CONTEXT.md already defines **Layout primitive** and **Spacing scale**.
