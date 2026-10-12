---
name: aria-disabled-browser-clicks-need-force
kind: gotcha
description: "In vitest browser tests Playwright treats aria-disabled=\"true\" as not enabled, so userEvent click/hover on such a button times out unless given { force: true }."
anchors:
  - path: source/react-ui/packages/ui/src/Button/Button.browser.test.tsx
    blob: 594f7b753b46
confidence: verified
---

`userEvent.click`/`hover` wait for actionability, and an `aria-disabled` button is not actionable, so the
calls in `Button.browser.test.tsx:69`, `:137`, `:150`, `:165` and the hover at `:182` pass `{ force: true }`.
Without it the test times out rather than failing on an assertion.
