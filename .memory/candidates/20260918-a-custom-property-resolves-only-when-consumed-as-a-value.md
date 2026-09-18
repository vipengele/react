---
about: getComputedStyle().getPropertyValue on an unregistered custom property returns its unevaluated token stream, so proving a calc() token resolves to pixels means consuming it as a real property
saw:
  - packages/ui/src/theme-scalars.browser.test.ts
  - packages/tokens/src/theme.ts
---

`--tandiko-radius-sm` and `--tandiko-radius-lg` are `calc()` expressions over the seed radius
(`packages/tokens/src/theme.ts:201-202`). Reading one back with
`getComputedStyle(el).getPropertyValue("--tandiko-radius-sm")` hands over the substituted token
stream — the `calc(...)` text — because an unregistered custom property has no syntax the engine can
resolve it against. Such a read says nothing about pixels, and a unit test asserting the emitted
string proves the expression and not the measurement.

What resolves it is consuming it as a length, which is how a component consumes it. The fixture in
`theme-scalars.browser.test.ts` renders one probe element per token under a real `ThemeProvider`
with `style={{ borderRadius: "var(--tandiko-radius-sm)" }}`, then reads
`getComputedStyle(probe).borderTopLeftRadius` and gets `6px`.

Reading a token inline this way is not the banned pattern: the rule is that a component never
*assigns* a `--tandiko-*` property inline, because an inline declaration shadows the base
stylesheet's mode reassignment. A `var()` read consuming the token shadows nothing.

This is why a measured design target belongs in a `*.browser.test.*` file. jsdom resolves neither
`calc()` nor custom properties, so the same assertion there cannot fail for the right reason.
