---
name: ui-token-reads-carry-no-fallback
kind: invariant
description: No var(--vpg-*) read in the ui package's src has a literal fallback; a glob-driven test enforces it, including in components that do not exist yet.
anchors:
  - path: source/react-ui/packages/ui/src/*/*.ts
    matches:
      - path: source/react-ui/packages/ui/src/Avatar/Avatar.stylesheet.ts
        blob: 86115d9cab83
      - path: source/react-ui/packages/ui/src/Button/Button.stylesheet.ts
        blob: 0118bb989957
      - path: source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.stylesheet.ts
        blob: ff80e6d4da93
      - path: source/react-ui/packages/ui/src/Card/Card.stylesheet.ts
        blob: 6f1685d3df13
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.stylesheet.ts
        blob: a10631e08c15
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.stylesheet.ts
        blob: f5332bcc4633
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.stylesheet.ts
        blob: fe96778bf3c1
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.stylesheet.ts
        blob: cd03cfd90664
      - path: source/react-ui/packages/ui/src/FormField/FormField.stylesheet.ts
        blob: 5d9dc9ea4e45
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.stylesheet.ts
        blob: f9a312d6f430
      - path: source/react-ui/packages/ui/src/Popover/Popover.stylesheet.ts
        blob: 50f691016412
      - path: source/react-ui/packages/ui/src/Progress/Progress.stylesheet.ts
        blob: 62bd6f8460ed
      - path: source/react-ui/packages/ui/src/RadioButton/RadioButton.stylesheet.ts
        blob: 9f82d130da5d
      - path: source/react-ui/packages/ui/src/RadioGroup/RadioGroup.stylesheet.ts
        blob: 2e3e29cea33f
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.stylesheet.ts
        blob: d23d9836c3e2
      - path: source/react-ui/packages/ui/src/Slider/Slider.stylesheet.ts
        blob: 4e827709d87c
      - path: source/react-ui/packages/ui/src/Spinner/Spinner.stylesheet.ts
        blob: 6ac87edea672
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.stylesheet.ts
        blob: 426e7bca31ad
      - path: source/react-ui/packages/ui/src/Tabs/Tabs.stylesheet.ts
        blob: 7a3c8dc3fdc0
      - path: source/react-ui/packages/ui/src/TextField/TextField.stylesheet.ts
        blob: 7b634f614251
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.stylesheet.ts
        blob: 1cd7c2f65099
      - path: source/react-ui/packages/ui/src/Toggle/Toggle.stylesheet.ts
        blob: 107e95f491f0
      - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.stylesheet.ts
        blob: 33be265cfab9
      - path: source/react-ui/packages/ui/src/Typography/Typography.stylesheet.ts
        blob: 76df2a12d3d1
      - path: source/react-ui/packages/ui/src/internal/listbox.stylesheet.ts
        blob: b7082a9ecf1a
      - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.ts
        blob: 917e1aea36fa
  - path: source/react-ui/packages/ui/src/*/*.tsx
    matches:
      - path: source/react-ui/packages/ui/src/Avatar/Avatar.test.tsx
        blob: fb8e54ebaf99
      - path: source/react-ui/packages/ui/src/Avatar/Avatar.tsx
        blob: 6b1558b6354c
      - path: source/react-ui/packages/ui/src/Button/Button.browser.test.tsx
        blob: 30b17044dae0
      - path: source/react-ui/packages/ui/src/Button/Button.test.tsx
        blob: 556a4769e15b
      - path: source/react-ui/packages/ui/src/Button/Button.tsx
        blob: 3422690f74ba
      - path: source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.test.tsx
        blob: 599a34f806ea
      - path: source/react-ui/packages/ui/src/ButtonGroup/ButtonGroup.tsx
        blob: 426c90bbf1a2
      - path: source/react-ui/packages/ui/src/Card/Card.test.tsx
        blob: 0c319bfc32f9
      - path: source/react-ui/packages/ui/src/Card/Card.tsx
        blob: e5a1b5d75b1e
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.browser.test.tsx
        blob: 5a130278366d
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.test.tsx
        blob: cc68512d1f5d
      - path: source/react-ui/packages/ui/src/Checkbox/Checkbox.tsx
        blob: b02e053aeaa1
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.browser.test.tsx
        blob: ea49625f9b93
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.test.tsx
        blob: 190b2be02406
      - path: source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
        blob: d5a03f7bf488
      - path: source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.test.tsx
        blob: ecf081e3633f
      - path: source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.tsx
        blob: ad93e06df9cc
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.browser.test.tsx
        blob: 84d8836de348
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.test.tsx
        blob: 433f2f735cdb
      - path: source/react-ui/packages/ui/src/FieldSet/FieldSet.tsx
        blob: 25d61ecf7b19
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.browser.test.tsx
        blob: f1d2dcc6f85a
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.test.tsx
        blob: 1defe0e919e2
      - path: source/react-ui/packages/ui/src/FieldShell/FieldShell.tsx
        blob: 5d54f16c41a8
      - path: source/react-ui/packages/ui/src/FormField/FormField.browser.test.tsx
        blob: 078a8597e9bb
      - path: source/react-ui/packages/ui/src/FormField/FormField.test.tsx
        blob: ff59ef7738b7
      - path: source/react-ui/packages/ui/src/FormField/FormField.tsx
        blob: 8674cdbfd205
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.test.tsx
        blob: e80c7ea7101f
      - path: source/react-ui/packages/ui/src/PasswordInput/PasswordInput.tsx
        blob: 72989a581b25
      - path: source/react-ui/packages/ui/src/Popover/Popover.test.tsx
        blob: 5268f7357b8b
      - path: source/react-ui/packages/ui/src/Popover/Popover.tsx
        blob: ae569b837f86
      - path: source/react-ui/packages/ui/src/Progress/Progress.test.tsx
        blob: b84c7f481de6
      - path: source/react-ui/packages/ui/src/Progress/Progress.tsx
        blob: 08dcbd266f02
      - path: source/react-ui/packages/ui/src/RadioButton/RadioButton.test.tsx
        blob: 4bf73f3232c0
      - path: source/react-ui/packages/ui/src/RadioButton/RadioButton.tsx
        blob: 9017b64df455
      - path: source/react-ui/packages/ui/src/RadioGroup/RadioGroup.test.tsx
        blob: 999734d3cf2a
      - path: source/react-ui/packages/ui/src/RadioGroup/RadioGroup.tsx
        blob: 7fe883085688
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.test.tsx
        blob: aed0e089f86e
      - path: source/react-ui/packages/ui/src/Skeleton/Skeleton.tsx
        blob: 89964291a59e
      - path: source/react-ui/packages/ui/src/Slider/Slider.test.tsx
        blob: a56b303fd6ed
      - path: source/react-ui/packages/ui/src/Slider/Slider.tsx
        blob: 660cced8e09d
      - path: source/react-ui/packages/ui/src/Spinner/Spinner.test.tsx
        blob: a2c69e78f3e0
      - path: source/react-ui/packages/ui/src/Spinner/Spinner.tsx
        blob: 62162b88f650
      - path: source/react-ui/packages/ui/src/StatePanel/EmptyIllustration.tsx
        blob: 59b3e79db9a7
      - path: source/react-ui/packages/ui/src/StatePanel/ErrorIllustration.tsx
        blob: 15f4f7236125
      - path: source/react-ui/packages/ui/src/StatePanel/NotFoundIllustration.tsx
        blob: 048f779b94ec
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.browser.test.tsx
        blob: cd8036f0f5b5
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.test.tsx
        blob: 5176ec0952d2
      - path: source/react-ui/packages/ui/src/StatePanel/StatePanel.tsx
        blob: 8651efe57b98
      - path: source/react-ui/packages/ui/src/Tabs/Tabs.test.tsx
        blob: 376c2779b18b
      - path: source/react-ui/packages/ui/src/Tabs/Tabs.tsx
        blob: 66a23cea03bb
      - path: source/react-ui/packages/ui/src/TextField/TextField.test.tsx
        blob: 622dcd62e3ff
      - path: source/react-ui/packages/ui/src/TextField/TextField.tsx
        blob: 5e082e2f346f
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.browser.test.tsx
        blob: 8e717ee58496
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.test.tsx
        blob: ba8b7d02b3f7
      - path: source/react-ui/packages/ui/src/Textarea/Textarea.tsx
        blob: f9b5fa7fef71
      - path: source/react-ui/packages/ui/src/Toggle/Toggle.test.tsx
        blob: 3b252809287d
      - path: source/react-ui/packages/ui/src/Toggle/Toggle.tsx
        blob: 50563385e52d
      - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.test.tsx
        blob: "153100585237"
      - path: source/react-ui/packages/ui/src/Tooltip/Tooltip.tsx
        blob: 03ede73a3242
      - path: source/react-ui/packages/ui/src/Typography/Typography.test.tsx
        blob: d05673bc3fdc
      - path: source/react-ui/packages/ui/src/Typography/Typography.tsx
        blob: 2a60d82e22ec
      - path: source/react-ui/packages/ui/src/internal/listbox.browser.test.tsx
        blob: 3b178ae40e6b
      - path: source/react-ui/packages/ui/src/internal/useListboxKeyboard.browser.test.tsx
        blob: 499826d51e93
  - path: source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
    blob: 5f097f26581d
  - path: source/react-ui/packages/ui/vitest.config.ts
    blob: 869e816c7b00
  - path: source/react-ui/packages/tokens/src/theme.ts
    blob: d1628b49c2ef
  - path: source/react-ui/packages/tokens/src/base-stylesheet.ts
    blob: 74b7ad0b4452
  - path: docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
    blob: b95f6963f69b
confidence: verified
---

U = `source/react-ui/packages/ui`, T = `source/react-ui/packages/tokens`.

No `var(--vpg-*)` read in `U/src` has a second argument. Every name a component reads is assigned
by `createTheme` (`T/src/theme.ts:135-310`; radius, size, icon, spacing, type and focus-ring
families at `:201-274`) or by the base stylesheet (`T/src/base-stylesheet.ts:14-19` dark
declarations, `:42-88` base `.vpg-root` rule). A regex search for `var\(--vpg-[a-z0-9-]+\s*,`
over `U/src` matches only the error message inside the enforcing test
(`no-fallback-var-reads.test.ts:42`). The rule is stated in `docs/adr/0009-*.md:15-19`.

**It is enforced by a test.** `U/src/no-fallback-var-reads.test.ts:17-21` reads every
`./**/*.{ts,tsx}` under `src` through `import.meta.glob(..., { query: "?raw" })`, excluding itself
(`:17`, why at `:14-15`), and fails on any line matching the fallback pattern (`:31-36`,
`:38-46`). Because the file list comes from a glob at run time, a fallback added in a component
that does not exist yet is still caught. It runs in the `jsdom` project, which is every
non-`*.browser.test.*` file (`U/vitest.config.ts:23-33`). The pattern is assembled from parts
(`:25`, comment `:23-24`) so the test's own source cannot match it; keep it that way if you edit
the test. Why a test can read files this way rather than through `node:fs`:
[[tests-read-source-via-import-meta-glob-not-node-fs]].

A fallback is tempting because `var(--vpg-x, 8px)` renders the same whether or not anything
defines `--vpg-x`. That is how the library had built up fifty-four of them (`adr/0009:7`).

The fallbacks also disagreed with the scales, which made undoing them a visual change rather than
a refactor. For example, `--vpg-button-height-md` fell back to `2.25rem` (`adr/0009:43`), but the
size scale's `md` is `2rem` (`T/src/theme.ts:216`). Thirteen of the mappings move geometry
(`adr/0009:93`); the fifteen visible changes are listed at `adr/0009:144-185`, and the full mapping
table is at `adr/0009:32-89`.

A new component uses a scale step. If no step fits, there are two options:

- add a step to the scale, as was done for `size-2xl`, `icon-xl` and `font-size-5xl`
  (`adr/0009:224-227`)
- write a literal, with a reason, in the component's own stylesheet. Six container measurements
  already do this (`adr/0009:136-140`).

A `var()` fallback is never an option: it looks like a token but is not one.

**The literal carve-out covers container sizes only, not padding.** `adr/0009:136-140` names six
container measurements and says nothing about padding or gaps, so a literal padding or gap in a
component stylesheet is drift, not a sanctioned exception. `Dropdown` carries none: it composes
`FieldShell`, whose doc comment it repeats (`U/src/Dropdown/Dropdown.stylesheet.ts:17-21` names the
shell as owner of border, fill, corner radius, height, horizontal padding, focus ring, danger
border and hover fill). `FieldShell` reads `--vpg-size-md` and `padding: 0 var(--vpg-space-3)`
once (`U/src/FieldShell/FieldShell.stylesheet.ts:38-39`). The only `padding` declarations in
`Dropdown.stylesheet.ts` are the clear button's token read (`:112`) and a `padding: 0` in the
visually-hidden selection description (`:144`). ADR 0009 still names the since-deleted
`Autocomplete` in its tables (e.g. `adr/0009:52`); read those rows as history.
