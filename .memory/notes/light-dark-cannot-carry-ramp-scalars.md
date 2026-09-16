---
name: light-dark-cannot-carry-ramp-scalars
kind: rationale
description: A light-dark() theme can replace the dark rule for colours only; the unitless ramp scalars still need a mode rule.
anchors:
  - path: packages/tokens/src/base-stylesheet.ts
    blob: 2b9ac56bd283
  - path: packages/tokens/src/theme.ts
    blob: a2b12cd87822
  - path: packages/ui/src/theme.browser.test.ts
    blob: 61758108cadf
confidence: verified
---

`DARK_DECLARATIONS` (`packages/tokens/src/base-stylesheet.ts:8-16`) switches two kinds of value:

- the three mode-resolved colours (`:10-12`)
- three unitless scalars, `--tandiko-state-shift`, `--tandiko-lift` and `--tandiko-sink` (`:13-15`)

The ramps read the scalars inside `calc()` (`packages/tokens/src/theme.ts:105-110`,
`:125-132`). The scalar's sign decides whether a hover step darkens or lightens.

`light-dark()` accepts only `<color>` values. The colours could be set once, inline, as
`light-dark(<light>, <dark>)`, but the scalars cannot. A "single source of truth" redesign
therefore still needs a mode rule, or some other mechanism, for the scalars. It cannot remove
the dark rule entirely. The tokens package uses no `light-dark()` today.

The colour half is backed by a test. `packages/ui/src/theme.browser.test.ts` checks that
Chromium resolves `oklch(from var(--x) calc(l + var(--s)) c h)` correctly when `--x` holds a
`light-dark()`:

- it picks the arm that matches `color-scheme` (`:200-231`)
- this still holds when a mode rule changes `color-scheme` and the scalar together (`:234-256`)

The evidence covers Chromium only; no Firefox or Safari project exists
(`packages/ui/vitest.config.ts`). Before relying on the scalars' current mode rule, see
[[dark-mode-ramp-scalars-shadowed-by-inline-theme]]: in the shipped theme that rule is
already overridden.
