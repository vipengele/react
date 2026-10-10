---
about: no-fallback rule re-checked while planning Toast (#63); still holds and applies to a Toast stylesheet
saw:
  - source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
  - source/react-ui/packages/ui/.agents/rules/no-literal-fallback-in-token-reads.md
  - source/react-ui/packages/tokens/src/theme.ts
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---
Stale only because of added components (Dialog, Drawer, Menu, ...) and moved tokens files; the
glob test still exists in `src/` and `packages/ui/AGENTS.md` still states the rule. The
`--vpg-layer-*` scale at `tokens/src/theme.ts:356-361` has no toast step (drawer 1000, popover
1100, listbox/menu 1200, tooltip 1300, sticky 900), consistent with ADR-0024: Toast is in the top
layer, so it takes no z-index. Line numbers in the note body for theme.ts (`:135-310`) were not re-checked.
