---
about: what a new form control must ship beyond its own files, and the existing native-control styling precedents (Checkbox now follows the RadioButton pattern)
saw:
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/src/RadioButton/RadioButton.stylesheet.ts
  - source/react-ui/packages/ui/src/Toggle/Toggle.tsx
  - source/react-ui/packages/ui/src/Checkbox/Checkbox.tsx
  - source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts
---
- `Checkbox` (source/react-ui/packages/ui/src/Checkbox/Checkbox.tsx) is the native-control precedent for a tri-state: a real `<input type="checkbox">` with `appearance: none` and a `::before` glyph, like RadioButton, with `indeterminate` as a DOM property (see the indeterminate note staged alongside). No ADR discusses it; `Progress` is the only other "indeterminate" in src and is an unrelated looping bar.
- Native-control styling precedent: RadioButton uses `appearance: none` on the real `<input>` with a `::before` dot (RadioButton.stylesheet.ts); Toggle is `<input type="checkbox" role="switch">` (Toggle.tsx:7,26). The only rendered-proxy precedent is `.vpg-listbox-checkbox` in internal/listbox.stylesheet.ts:210-228, a drawn span, chosen because the option already has role=option and a real checkbox inside would be a nested interactive control. No abandoned approach recorded.
- packages/ui/AGENTS.md: 100% thresholds; tests must cover every variant/prop branch; every new component must be added to bundle-check/ in the same change; export from src/index.ts as plain named export; per-component dir with .tsx/.stylesheet.ts/.test.tsx; Storybook story in same PR (repo rule). Component stylesheets are injected `<style href precedence>`, never assign --vpg-* inline.
- No `v8 ignore` / `istanbul ignore` comments exist in src (grep empty), so there is no precedent for excluding uncovered branches.
