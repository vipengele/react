---
about: responsiveness is undecided repo-wide (no breakpoint tokens, no width media/container queries); ADR-0019 defers responsive props, and no layout primitive exists in packages/ui/src yet
saw:
  - docs/adr/0019-layout-primitives-accept-token-values-only.md
  - source/react-ui/packages/ui/src
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/.agents/rules/never-assign-theme-properties-inline.md
---

Checked while answering a Grid planning question.

- `grep -rn "breakpoint|@media|@container" source/react-ui/packages/{ui,tokens}/src` (non-test): only
  `prefers-reduced-motion` (Skeleton/Spinner/Progress stylesheets, base-stylesheet.ts:98) and
  `prefers-color-scheme` (base-stylesheet.ts:94). No width media query, no container query, no
  breakpoint token.
- ADR-0019 "What is not committed" lists "Responsive values ... There are no breakpoint tokens, and a
  responsive prop shape (`gap={{ sm: ..., lg: ... }}`) is its own decision", and leaves a Grid
  minimum column width (a length, so a token) open: size scale vs spacing scale.
- `ls packages/ui/src` shows no Stack/Inline/Grid/Center/AspectRatio directory: ADR-0019 is accepted
  but nothing implements it, so Grid would be the first primitive and sets the pattern
  (`--vpg-grid-columns` inline, bare var() read in one static stylesheet, per ADR-0019 mechanism).
- Gap/padding/inset props: `space-1`..`space-8` plus `"none"` (->0); `columns` is a positive integer.
  Considered and rejected in ADR-0019: class-per-value, data-attribute-per-value, arbitrary lengths.
  Both rejected selector approaches fail on counts (no finite set), which is why inline custom
  property is the only route for `columns`.
