---
name: custom-property-read-back-is-unresolved
kind: gotcha
description: getPropertyValue on an unregistered --tandiko-* property returns its calc() token stream, not pixels; consume it as a real property (and in a browser test) to measure it.
anchors:
  - path: packages/ui/src/theme-scalars.browser.test.ts
    blob: 93da8130a511
  - path: packages/tokens/src/theme.ts
    blob: 016a5133657d
  - path: packages/ui/vitest.config.ts
    blob: 869e816c7b00
confidence: verified
---

`--tandiko-radius-sm` and `--tandiko-radius-lg` are `calc()` multiples of the seed radius
(`packages/tokens/src/theme.ts:205-206`). `getComputedStyle(el).getPropertyValue("--tandiko-radius-sm")`
returns the substituted token stream — the `calc(...)` text — because an unregistered custom
property has no syntax the engine resolves it against. That read says nothing about pixels, and a
test asserting the emitted string proves the expression, not the measurement.

What resolves it is consuming the token as a length, the way a component does.
`theme-scalars.browser.test.ts:93-118` renders one probe per radius token under a real
`ThemeProvider` with `style={{ borderRadius: "var(<name>)" }}` (`:107`) and reads
`getComputedStyle(probe).borderTopLeftRadius` (`:117`), expecting `6px` / `12px` at the default
seed (`:87-89`). The rationale is written at `:96-99`.

A `var()` *read* inline like this is not the banned pattern: what a component must never do is
*assign* a `--tandiko-*` property inline, because an inline declaration shadows the base
stylesheet's mode reassignment (see the header of any `*.stylesheet.ts`, e.g.
`FieldShell.stylesheet.ts:8-12`).

This is also why a measured design target belongs in a `*.browser.test.*` file: jsdom resolves
neither `calc()` nor custom properties, and `vitest.config.ts` routes only `*.browser.test.*` to
chromium (`packages/ui/vitest.config.ts:5-6,37`). See also
[[element-box-cannot-detect-own-padding]] and [[vitest-browser-cdp-import-specifier]].
