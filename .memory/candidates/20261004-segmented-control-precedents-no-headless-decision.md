---
about: no ADR or rule decides headless-a11y-lib vs hand-rolled or radio vs aria-pressed for a pick-one control; precedents are hand-rolled/native in every component
saw:
  - source/react-ui/packages/ui/AGENTS.md
  - source/react-ui/packages/ui/src/Tabs/Tabs.tsx
  - source/react-ui/packages/ui/src/RadioGroup/RadioGroup.tsx
  - source/react-ui/packages/ui/src/RadioButton/RadioButton.tsx
  - source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.tsx
  - source/react-ui/packages/ui/src/Toggle/Toggle.tsx
  - source/react-ui/packages/ui/src/PasswordInput/PasswordInput.tsx
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
---

Planning a SegmentedControl; checked for prior decisions.

- `grep -rniE "radix|react-aria|ariakit|headless" docs/ packages/*/AGENTS.md packages/*/package.json CONTEXT.md`
  -> only "headless Chromium" and ADR-0025's "headless" tanstack-virtual remark. No headless-a11y
  library is a dependency (runtime deps: floating-ui, @vipengele/ts, tanstack-virtual, icons) and no ADR
  decides the question. `grep -ri segmented docs CONTEXT.md apps/storybook/src` -> only ADR-0025's
  `DateField` (unrelated).
- Every pick-one precedent is native or hand-rolled: RadioGroup/RadioButton = native
  `<input type=radio>` sharing a `name`, role=radiogroup wrapper, "no hand-written keyboard code"
  (RadioGroup.tsx:44-46, RadioButton.tsx:13-14). Tabs = buttons role=tab, hand-rolled roving tabindex +
  arrow/Home/End, automatic activation, wraps, skips disabled (Tabs.tsx:63-106, tabIndex :145).
  Tree = roving tabindex hand-rolled (ADR-0024). `aria-pressed` is used only for PasswordInput's reveal
  button (PasswordInput.tsx:40). ButtonGroup is role=group of plain Buttons, purely CSS (ButtonGroup.tsx).
- No sliding-indicator precedent. Motion convention: `transition: ... var(--vpg-duration-fast)
  var(--vpg-ease-standard)`; durations collapse to 0.01ms under reduced motion by the base
  stylesheet (base-stylesheet.ts, reduced-motion block), so components need no own media query
  (only Skeleton/Spinner/Progress add one, for keyframe animations). Emulate in tests via
  `cdp` from "vitest/browser" (see vitest-browser-cdp-import-specifier).
- Conventions: stylesheet key is `<style href="vpg-x" precedence="vpg-x">` in the component, constant
  from `X.stylesheet.ts`; class names `vpg-x`, `vpg-x-<variant>`; `className` merged via
  `[..., className].filter(Boolean).join(" ")`; rest spread. Controlled = `value !== undefined`, plus
  `defaultValue` + `onChange(value)` (Tabs.tsx, RadioGroup.tsx:31-37,56-59). Size props are
  "sm"|"md"|"lg" (Button, Spinner, Progress; Badge sm|md; Avatar adds xl), mapped to
  `--vpg-size-sm/md/xl` min-heights in Button.stylesheet.ts:104-116. ref: React 19 ref-as-prop, no
  forwardRef anywhere (grep -rl forwardRef -> only comments/none); NumberInput declares `ref?: Ref<..>`
  explicitly (NumberInput.tsx:27) because InputHTMLAttributes has no ref.
  Data attrs in use are sparse (data-value on Tabs.Tab; data-state/selected in Tree); selection is mostly
  expressed with a class (`vpg-tabs-tab-selected`) not data attr.
- Required extras: bundle-check entry (.agents/rules/update-bundle-check-with-every-component.md),
  Storybook story (.claude/rules/ship-storybook-stories-with-every-component.md), index.ts named export.
