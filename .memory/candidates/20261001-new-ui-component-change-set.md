---
about: what a new packages/ui component PR must touch (checklist derived from rules + the NumberInput export commit)
saw:
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/.agents/rules/update-bundle-check-with-every-component.md
  - source/react-ui/packages/ui/bundle-check/run.mjs
  - source/react-ui/packages/ui/vitest.config.ts
  - .lydite/components.yml
  - source/react-ui/packages/ui/src/Skeleton/Skeleton.tsx
---

Checklist for what a new packages/ui component change touches.

- Commit c14c9ff (NumberInput export) touched exactly: `apps/storybook/src/<C>.stories.tsx`, `packages/ui/README.md`,
  `packages/ui/bundle-check/run.mjs` (one `{ name, marker }` row, e.g. `run.mjs:54` Skeleton), `packages/ui/src/index.ts`
  (plain named export + types). Tests landed in separate commits.
- Coverage: `vitest.config.ts:10-18` globs `src/**/*.{ts,tsx}` with 100% thresholds; `.lydite/components.yml` registers `ui` as one
  component by dir, so a new `src/<C>/` needs no registration anywhere. Failures come from an untested prop branch.
- Convention evidence: no `"use client"`, no `forwardRef`, no `asChild` anywhere in `packages/ui/src` (grep). Ref is a plain
  `ref?: Ref<T>` prop (Checkbox.tsx:7, FieldShell.tsx:11, NumberInput.tsx:27). className merge is
  `["vpg-x", ..., className].filter(Boolean).join(" ")` (Skeleton.tsx:28). Style injection is
  `<style href="vpg-x" precedence="vpg-x">` (Skeleton.tsx:40). Skeleton hard-codes `aria-hidden="true"` (Skeleton.tsx:50);
  Tabs sets `aria-orientation` explicitly (Tabs.tsx:97). `Separator` (Separator.tsx) is the only component with a `decorative` prop; no ADR covers it.
- Release notes: only `docs/release-notes/react-ui@v0.1.0.md`, `v0.1.1.md` exist, one per tag; not per component PR.
- Component PRs have not touched CONTEXT.md glossary (Slice entry says stories ship in same PR).
