---
about: createTheme emits sizing, icon, spacing, radius, type and focus-ring families that all resolve, so a component reads a measurement from a scale rather than writing a literal
saw:
  - packages/tokens/src/theme.ts
  - packages/ui/src/no-fallback-var-reads.test.ts
  - docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
  - packages/ui/src/Dropdown/Dropdown.stylesheet.ts
---

`packages/tokens/src/theme.ts:200-299` emits, besides colour: radius (`--tandiko-radius`, `-sm`,
`-lg`, `-full`), a control-size scale (`--tandiko-size-xs..2xl`, `:210-217`), an icon scale
(`--tandiko-icon-sm..xl`), a spacing scale in `0.25rem` steps (`--tandiko-space-1..8`, `:228-235`),
a full type scale (`:238-263`) and shared focus-ring geometry
(`--tandiko-focus-ring-width`/`-offset`, `:269-270`). All of it resolves; no component read lands
on nothing.

`packages/ui/src/no-fallback-var-reads.test.ts` enforces that every `var(--tandiko-*)` read in
`packages/ui/src` is bare, with no literal fallback argument. It globs `./**/*.{ts,tsx}` under
`src`, so it polices a component's stylesheet from the moment the file exists.

**Padding literals are drift, not a sanctioned exception.** ADR-0009 carves out a literal only for
a *container* measurement no family carries a step for, such as a listbox's `12rem` min-width
(`0009-…md:136-140`). It says nothing about padding. `.tandiko-dropdown-control` pads
`0.375rem 0.5rem` and `.tandiko-dropdown-trigger` pads `0.125rem 0.25rem`
(`Dropdown.stylesheet.ts:43,69`), and `Autocomplete` matches on both counts — measurements the
spacing scale could express (`--tandiko-space-2` is `0.5rem`, `--tandiko-space-3` is `0.75rem`).
Composing `FieldShell` is what ends it for a given control: the shell reads `--tandiko-space-3`
for its padding and `--tandiko-size-md` for its height.
