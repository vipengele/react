---
name: ui-token-reads-carry-no-fallback
kind: invariant
description: No var(--tandiko-*) read in packages/ui/src has a literal fallback; a glob-driven test enforces it, including in components that do not exist yet.
anchors:
  - path: packages/ui/src/*/*.ts
    matches:
      - path: packages/ui/src/Autocomplete/Autocomplete.stylesheet.ts
        blob: 2548fcc47bb6
      - path: packages/ui/src/Avatar/Avatar.stylesheet.ts
        blob: 3911c626a829
      - path: packages/ui/src/Button/Button.stylesheet.ts
        blob: 81d4393041bf
      - path: packages/ui/src/ButtonGroup/ButtonGroup.stylesheet.ts
        blob: 1cb6d8fd3eb2
      - path: packages/ui/src/Card/Card.stylesheet.ts
        blob: a6f77c28dd5f
      - path: packages/ui/src/Dropdown/Dropdown.stylesheet.ts
        blob: 4812673acc4a
      - path: packages/ui/src/FieldSet/FieldSet.stylesheet.ts
        blob: 70a5e9adb059
      - path: packages/ui/src/FieldShell/FieldShell.stylesheet.ts
        blob: 4d6167f3b832
      - path: packages/ui/src/FormField/FormField.stylesheet.ts
        blob: 5710f82f3efd
      - path: packages/ui/src/PasswordInput/PasswordInput.stylesheet.ts
        blob: 70fdaa4c69ff
      - path: packages/ui/src/Popover/Popover.stylesheet.ts
        blob: 0428290aaf82
      - path: packages/ui/src/Progress/Progress.stylesheet.ts
        blob: 20f5681ae50e
      - path: packages/ui/src/RadioButton/RadioButton.stylesheet.ts
        blob: dfe252cd4b28
      - path: packages/ui/src/RadioGroup/RadioGroup.stylesheet.ts
        blob: a147560897aa
      - path: packages/ui/src/Skeleton/Skeleton.stylesheet.ts
        blob: 08f2208b861f
      - path: packages/ui/src/Slider/Slider.stylesheet.ts
        blob: 541f614ca48d
      - path: packages/ui/src/Spinner/Spinner.stylesheet.ts
        blob: 3bc1a8831baa
      - path: packages/ui/src/Tabs/Tabs.stylesheet.ts
        blob: 7b0fe831917f
      - path: packages/ui/src/TextField/TextField.stylesheet.ts
        blob: 66b9bbbc5efd
      - path: packages/ui/src/Toggle/Toggle.stylesheet.ts
        blob: 48292cc5799c
      - path: packages/ui/src/Tooltip/Tooltip.stylesheet.ts
        blob: fa730d8b75b6
      - path: packages/ui/src/Typography/Typography.stylesheet.ts
        blob: 93a8e0f32849
      - path: packages/ui/src/internal/listbox.stylesheet.ts
        blob: 74ca41dae798
      - path: packages/ui/src/internal/useListboxKeyboard.ts
        blob: f241e7c60a6d
  - path: packages/ui/src/*/*.tsx
    matches:
      - path: packages/ui/src/Autocomplete/Autocomplete.browser.test.tsx
        blob: 5f7a03dbcab4
      - path: packages/ui/src/Autocomplete/Autocomplete.test.tsx
        blob: 6f1a1232b019
      - path: packages/ui/src/Autocomplete/Autocomplete.tsx
        blob: 0fb7353ef4ef
      - path: packages/ui/src/Avatar/Avatar.test.tsx
        blob: 0361958414da
      - path: packages/ui/src/Avatar/Avatar.tsx
        blob: d01fe6b8035c
      - path: packages/ui/src/Button/Button.browser.test.tsx
        blob: aaec205ac91f
      - path: packages/ui/src/Button/Button.test.tsx
        blob: 23ad864bfd12
      - path: packages/ui/src/Button/Button.tsx
        blob: 6d577eb62d16
      - path: packages/ui/src/ButtonGroup/ButtonGroup.test.tsx
        blob: 29c579f91cb6
      - path: packages/ui/src/ButtonGroup/ButtonGroup.tsx
        blob: add1a298aae3
      - path: packages/ui/src/Card/Card.test.tsx
        blob: cda1aff29ec6
      - path: packages/ui/src/Card/Card.tsx
        blob: 2aa301664f08
      - path: packages/ui/src/Dropdown/Dropdown.browser.test.tsx
        blob: f1ef1c3d7208
      - path: packages/ui/src/Dropdown/Dropdown.test.tsx
        blob: 482dbc064d30
      - path: packages/ui/src/Dropdown/Dropdown.tsx
        blob: 3ece2c53e83e
      - path: packages/ui/src/FieldSet/FieldSet.test.tsx
        blob: 667e65934357
      - path: packages/ui/src/FieldSet/FieldSet.tsx
        blob: c5fa1ff46bf9
      - path: packages/ui/src/FieldShell/FieldShell.browser.test.tsx
        blob: 400eadb04fa5
      - path: packages/ui/src/FieldShell/FieldShell.test.tsx
        blob: ea123028331a
      - path: packages/ui/src/FieldShell/FieldShell.tsx
        blob: d4f756d47597
      - path: packages/ui/src/FormField/FormField.browser.test.tsx
        blob: 4966ee079175
      - path: packages/ui/src/FormField/FormField.test.tsx
        blob: 729ce9f94571
      - path: packages/ui/src/FormField/FormField.tsx
        blob: f9087de16d16
      - path: packages/ui/src/PasswordInput/PasswordInput.test.tsx
        blob: 06396e755994
      - path: packages/ui/src/PasswordInput/PasswordInput.tsx
        blob: 9495b735a7b6
      - path: packages/ui/src/Popover/Popover.test.tsx
        blob: 10dc5ea56829
      - path: packages/ui/src/Popover/Popover.tsx
        blob: bf3949392e69
      - path: packages/ui/src/Progress/Progress.test.tsx
        blob: 6c4765283483
      - path: packages/ui/src/Progress/Progress.tsx
        blob: 467390394c81
      - path: packages/ui/src/RadioButton/RadioButton.test.tsx
        blob: 81d7aad05c8a
      - path: packages/ui/src/RadioButton/RadioButton.tsx
        blob: 46999f1026b0
      - path: packages/ui/src/RadioGroup/RadioGroup.test.tsx
        blob: c8e25a3a3f2b
      - path: packages/ui/src/RadioGroup/RadioGroup.tsx
        blob: 5297aa5c4f13
      - path: packages/ui/src/Skeleton/Skeleton.test.tsx
        blob: a9784b136ac1
      - path: packages/ui/src/Skeleton/Skeleton.tsx
        blob: 86aa3bcd1355
      - path: packages/ui/src/Slider/Slider.test.tsx
        blob: e6b7db0ee3dc
      - path: packages/ui/src/Slider/Slider.tsx
        blob: e98018c98c44
      - path: packages/ui/src/Spinner/Spinner.test.tsx
        blob: 0138469405c7
      - path: packages/ui/src/Spinner/Spinner.tsx
        blob: 0368e7b754e6
      - path: packages/ui/src/Tabs/Tabs.test.tsx
        blob: 3f02fc28b6b7
      - path: packages/ui/src/Tabs/Tabs.tsx
        blob: e530cd1faf05
      - path: packages/ui/src/TextField/TextField.test.tsx
        blob: d18de9c121ea
      - path: packages/ui/src/TextField/TextField.tsx
        blob: bdfe6b9ccdf4
      - path: packages/ui/src/Toggle/Toggle.test.tsx
        blob: d54c37b26012
      - path: packages/ui/src/Toggle/Toggle.tsx
        blob: c918aa1af763
      - path: packages/ui/src/Tooltip/Tooltip.test.tsx
        blob: e9ee46ea0e87
      - path: packages/ui/src/Tooltip/Tooltip.tsx
        blob: 299fe2231f9b
      - path: packages/ui/src/Typography/Typography.test.tsx
        blob: 26dc008b2a87
      - path: packages/ui/src/Typography/Typography.tsx
        blob: 4f4ea21e7f92
      - path: packages/ui/src/internal/listbox.browser.test.tsx
        blob: f0ea546b705c
  - path: packages/ui/src/no-fallback-var-reads.test.ts
    blob: 73b3fd98b455
  - path: packages/tokens/src/theme.ts
    blob: 016a5133657d
  - path: packages/tokens/src/base-stylesheet.ts
    blob: 2f49d2706bf0
  - path: docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
    blob: cc8f3ee2a0d9
confidence: verified
---

No `var(--tandiko-*)` read in `packages/ui/src` has a second argument. Every name a component
reads is assigned by `createTheme` (`packages/tokens/src/theme.ts:135-310`: radius, size, icon,
spacing, type and focus-ring families at `:201-274`) or by the base
stylesheet (`packages/tokens/src/base-stylesheet.ts:14-19` dark block, `:41-108` base rule). As of
2026-09-19, a regex search for
`var\(--tandiko-[a-z0-9-]+\s*,` over `packages/ui/src` matches only the error message inside the
test that enforces the rule (`no-fallback-var-reads.test.ts:42`). The rule is stated in
`docs/adr/0009-*.md:15-19`.

**It is enforced by a test.** `packages/ui/src/no-fallback-var-reads.test.ts:17-21` reads every
`./**/*.{ts,tsx}` under `src` through `import.meta.glob(..., { query: "?raw" })`, excluding
itself, and fails on any line matching the fallback pattern (`:25`, `:38-46`). Because the file
list comes from a glob at run time, a fallback added in a component that does not exist yet is
still caught. It runs in the `jsdom` project, which is every non-`*.browser.test.*` file
(`packages/ui/vitest.config.ts:22-33`). The pattern is assembled from parts (`:25`) so the test's
own source cannot match it; keep it that way if you edit the test. Why a test can read files this
way rather than through `node:fs`: [[tests-read-source-via-import-meta-glob-not-node-fs]].

A fallback is tempting because `var(--tandiko-x, 8px)` renders the same whether or not anything
defines `--tandiko-x`. That is how the library had built up 54 of them (`adr/0009:7`).

The fallbacks also disagreed with the scales, which made undoing them a visual change rather than
a refactor. For example, `--tandiko-button-height-md` fell back to `2.25rem` (`adr/0009:43`), but
the size scale's `md` is `2rem` (`theme.ts:216`). The adoption moved pixels in fifteen places
(`adr/0009:144-185`), and the full mapping is at `adr/0009:32-89`.

A new component uses a scale step. If no step fits, there are two options:

- add a step to the scale, as was done for `size-2xl`, `icon-xl` and `font-size-5xl`
  (`adr/0009:224-227`)
- write a literal, with a reason, in the component's own stylesheet. Six container measurements
  already do this (`adr/0009:136-140`).

A `var()` fallback is never an option: it looks like a token but is not one.

**The literal carve-out covers container sizes only, not padding.** `adr/0009:136-140` names six
container measurements (the 12rem min-widths, 16rem/20rem max sizes) and says nothing about
padding or gaps. A literal padding or gap in a component stylesheet is drift, not a sanctioned
exception. The padding drift that `Dropdown` and `Autocomplete` used to carry is gone as of
2026-09-19: both now compose `FieldShell` and leave height and horizontal padding to it
(`Dropdown.stylesheet.ts:16-17`, `Autocomplete.stylesheet.ts:17-18`). `FieldShell` reads
`--tandiko-size-md` / `--tandiko-space-3` (`FieldShell.stylesheet.ts:38-39`).
