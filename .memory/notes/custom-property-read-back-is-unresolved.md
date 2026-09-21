---
name: custom-property-read-back-is-unresolved
kind: gotcha
description: getPropertyValue on an unregistered --vpg-* property returns its calc() token stream, not pixels; consume it as a real property (and in a browser test) to measure it.
anchors:
  - path: source/react-ui/packages/ui/src/theme-scalars.browser.test.ts
    blob: 5f116b87fe72
  - path: source/react-ui/packages/tokens/src/theme.ts
    blob: d1628b49c2ef
  - path: source/react-ui/packages/ui/vitest.config.ts
    blob: 869e816c7b00
confidence: verified
---

`--vpg-radius-sm` and `--vpg-radius-lg` are `calc()` multiples of the seed radius
(`source/react-ui/packages/tokens/src/theme.ts:205-206`, comment `:202-204`).
`getComputedStyle(el).getPropertyValue("--vpg-radius-sm")` returns the substituted token stream —
the `calc(...)` text — because an unregistered custom property has no syntax the engine resolves
it against. That read says nothing about pixels, and a test asserting the emitted string proves
the expression, not the measurement.

What resolves it is consuming the token as a length, the way a component does.
`source/react-ui/packages/ui/src/theme-scalars.browser.test.ts` renders one probe per radius
token (`--vpg-radius`, `-sm`, `-lg`) in `resolveRadii` (`:101-120`) with
`style: { borderRadius: \`var(${name})\` }` (`:107`) and reads
`getComputedStyle(probe).borderTopLeftRadius` (`:117`), expecting 8px / 6px / 12px at the default
seed (`DEFAULT_RADII`, `:86-90`; asserted at `:127`). The rationale is at `:92-100`.

A `var()` *read* inline like this is not the banned pattern: what a component must never do is
*assign* a `--vpg-*` property inline, because an inline declaration shadows the base stylesheet's
mode reassignment (see the header of any `*.stylesheet.ts`, e.g.
`FieldShell/FieldShell.stylesheet.ts:8-12`).

This is also why a measured design target belongs in a `*.browser.test.*` file: jsdom resolves
neither `calc()` nor custom properties, and only `*.browser.test.*` runs in Chromium
(`source/react-ui/packages/ui/vitest.config.ts:6`, used at `:37`; the jsdom project excludes them
at `:31`). See also [[element-box-cannot-detect-own-padding]] and
[[vitest-browser-cdp-import-specifier]].
