---
about: the token substrate is no longer thin — createTheme now emits sizing, spacing, radius and focus families, so the "missing token substrate" era is over
saw:
  - packages/tokens/src/theme.ts
  - packages/tokens/src/base-stylesheet.ts
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
---

Checked because a prior finding (outside this store, in the user's own notes) described
`createTheme` as defining only colour/radius/fonts, with every component's `--tandiko-*` read
resolving to a hardcoded fallback. That is no longer true.

`packages/tokens/src/theme.ts:200-299` emits, in addition to colour: radius (`--tandiko-radius`,
`-sm`, `-lg`, `-full`), a control-size scale (`--tandiko-size-xs..2xl`, `theme.ts:210-217`), an
icon scale (`--tandiko-icon-sm..xl`, `:221-224`), a spacing scale in `0.25rem` steps
(`--tandiko-space-1..8`, `:228-235`), a full type scale (`--tandiko-font-size-xs..5xl`, weights,
line-heights, letter-spacing, `:238-263`), shared focus-ring geometry
(`--tandiko-focus-ring-width`/`-offset`, `:269-270`), easings, shadows and stacking layers
(`:276-299`). `packages/ui/src/no-fallback-var-reads.test.ts` (see note
`ui-token-reads-carry-no-fallback`) enforces that no component reads any of these with a literal
fallback, and a 2026-09-18 regex sweep over `packages/ui/src` finds none.

One gap remains, and it is a real decision point for a `FieldShell` ADR: existing field-shaped
components (`TextField.stylesheet.ts`, `Dropdown.stylesheet.ts`, `Autocomplete.stylesheet.ts`)
write their own padding as bare literals (`0.5rem 0.75rem`, `0.375rem 0.5rem`, `0.125rem
0.25rem`) rather than through `--tandiko-space-*`, even though the spacing scale exists and could
express most of them (`--tandiko-space-2` = `0.5rem`, `--tandiko-space-3` = `0.75rem`). ADR-0009
only carved out container *measurements* (min-width/max-width, `:136-140`) as literal-with-reason;
it says nothing about padding, so this isn't a sanctioned exception — it's undocumented drift a
`FieldShell` contract should either resolve (tokenize the shared padding) or explicitly bless.
