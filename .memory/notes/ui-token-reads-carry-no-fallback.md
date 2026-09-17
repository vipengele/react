---
name: ui-token-reads-carry-no-fallback
kind: invariant
description: No var(--tandiko-*) read in packages/ui/src has a literal fallback, and nothing but review enforces that.
anchors:
  - path: packages/ui/src/*/*.ts
    matches:
      - path: packages/ui/src/Autocomplete/Autocomplete.stylesheet.ts
        blob: 6f00d6adf141
      - path: packages/ui/src/Avatar/Avatar.stylesheet.ts
        blob: 3911c626a829
      - path: packages/ui/src/Button/Button.stylesheet.ts
        blob: 81d4393041bf
      - path: packages/ui/src/ButtonGroup/ButtonGroup.stylesheet.ts
        blob: 1cb6d8fd3eb2
      - path: packages/ui/src/Card/Card.stylesheet.ts
        blob: a6f77c28dd5f
      - path: packages/ui/src/Dropdown/Dropdown.stylesheet.ts
        blob: 7e7dc1f0a801
      - path: packages/ui/src/FieldSet/FieldSet.stylesheet.ts
        blob: 77a0c1a91a62
      - path: packages/ui/src/FormField/FormField.stylesheet.ts
        blob: da4382782192
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
        blob: 3ed00af3638c
      - path: packages/ui/src/Toggle/Toggle.stylesheet.ts
        blob: 2f6413b4167c
      - path: packages/ui/src/Tooltip/Tooltip.stylesheet.ts
        blob: fa730d8b75b6
      - path: packages/ui/src/Typography/Typography.stylesheet.ts
        blob: 93a8e0f32849
      - path: packages/ui/src/internal/listbox.stylesheet.ts
        blob: a3a43666f134
      - path: packages/ui/src/internal/useListboxKeyboard.ts
        blob: fd3eb734a779
  - path: packages/ui/src/*/*.tsx
    matches:
      - path: packages/ui/src/Autocomplete/Autocomplete.test.tsx
        blob: 65d32ec9dc73
      - path: packages/ui/src/Autocomplete/Autocomplete.tsx
        blob: 44326f244bbc
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
      - path: packages/ui/src/Dropdown/Dropdown.test.tsx
        blob: c5af4e607c2e
      - path: packages/ui/src/Dropdown/Dropdown.tsx
        blob: 0c0d1b51341e
      - path: packages/ui/src/FieldSet/FieldSet.test.tsx
        blob: 667e65934357
      - path: packages/ui/src/FieldSet/FieldSet.tsx
        blob: c5fa1ff46bf9
      - path: packages/ui/src/FormField/FormField.test.tsx
        blob: 729ce9f94571
      - path: packages/ui/src/FormField/FormField.tsx
        blob: f9087de16d16
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
        blob: 193e81deab83
      - path: packages/ui/src/TextField/TextField.tsx
        blob: 89d77e00dcce
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
  - path: packages/tokens/src/theme.ts
    blob: a35f20a25281
  - path: docs/adr/0009-components-read-role-tokens-with-no-literal-fallback.md
    blob: 74f21701d013
confidence: verified
---

No `var(--tandiko-*)` read in `packages/ui/src` has a second argument. Every name a component
reads is assigned by `createTheme` (`packages/tokens/src/theme.ts:147-300`) or by the base
stylesheet (`packages/tokens/src/base-stylesheet.ts:42-84`). As of 2026-09-17, a regex search for
`var\(--tandiko-[a-z0-9-]+\s*,` over `packages/ui/src` finds nothing. Collecting every
`var(--tandiko-...` read name there turns up none that those two files leave unassigned. The
rule is stated in `docs/adr/0009-*.md:15-19`.

**Nothing enforces it.** No test in `packages/*/src` checks for fallbacks, so a reintroduced
fallback passes every gate. It is also inviting, because `var(--tandiko-x, 8px)` renders the same
whether or not anything defines `--tandiko-x`. That is how the library had built up 54 of them
(`adr/0009:7`).

The fallbacks also disagreed with the scales, which made undoing them a visual change rather than
a refactor. For example, `--tandiko-button-height-md` fell back to `2.25rem`, but the size
scale's `md` is `2rem`. The adoption moved pixels in fifteen places (`adr/0009:143-181`), and the
full mapping is at `adr/0009:32-88`.

A new component uses a scale step. If no step fits, there are two options:

- add a step to the scale, as was done for `size-2xl`, `icon-xl` and `font-size-5xl`
  (`adr/0009:220-223`)
- write a literal, with a reason, in the component's own stylesheet. Six container measurements
  already do this (`adr/0009:135-139`).

A `var()` fallback is never an option: it looks like a token but is not one.
