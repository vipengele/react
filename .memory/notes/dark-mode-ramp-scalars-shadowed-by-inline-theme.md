---
name: dark-mode-ramp-scalars-shadowed-by-inline-theme
kind: gotcha
description: The dark rule's ramp scalars never apply, because ThemeProvider sets the same properties inline.
anchors:
  - path: packages/tokens/src/theme.ts
    blob: a2b12cd87822
  - path: packages/tokens/src/base-stylesheet.ts
    blob: 2b9ac56bd283
  - path: packages/tokens/src/ThemeProvider.tsx
    blob: 571e9875e8d2
confidence: verified
---

An inline declaration beats any non-`!important` stylesheet rule for the same property on the
same element, however specific the selector is. The tokens package already works around this
for the three mode-resolved colours:

- `createTheme` leaves out `--tandiko-accent`, `--tandiko-ink` and `--tandiko-surface`
  (`packages/tokens/src/theme.ts:54-62`).
- The base stylesheet assigns those three instead (`packages/tokens/src/base-stylesheet.ts:37-44`).

This was the fix for a dark mode that never worked, even though the `data-tandiko-mode`
attribute was set correctly. Components follow the same rule
(`packages/ui/.agents/rules/never-assign-theme-properties-inline.md`).

**The three ramp scalars do not follow the rule.** The code shows the bug:

- `createTheme` returns `--tandiko-state-shift: -0.05`, `--tandiko-lift: 0.02` and
  `--tandiko-sink: 0.04` (`theme.ts:100-102`).
- `ThemeProvider` spreads the whole theme into `style` (`ThemeProvider.tsx:39`).
- So the dark reassignments in `DARK_DECLARATIONS` (`base-stylesheet.ts:13-15`: `0.05`, `0.055`,
  `0.025`) are overridden on `.tandiko-root` and never apply.
- In dark mode, hover and press steps (`theme.ts:105-110`) still darken instead of lightening.
- Raised and sunken surfaces (`theme.ts:125-132`) keep the light-mode sizes.

The comment at `base-stylesheet.ts:4-6` says this block is enough to flip the ramps. It is
wrong for the scalars.

This was found by reading the code, not by rendering it. jsdom cannot show the bug. The
Chromium test `packages/ui/src/theme.browser.test.ts` cannot catch it either: its mode-driven
fixture (`:165-176`) sets the light scalar in a stylesheet rule, not inline. The likely fix is
to move the light values of the three scalars out of `createTheme` and into the
`.tandiko-root` rule, as was done for the colours. See [[light-dark-cannot-carry-ramp-scalars]].
