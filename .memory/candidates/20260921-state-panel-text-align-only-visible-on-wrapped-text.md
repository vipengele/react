---
about: why the StatePanel centring test needs a description that wraps, and what each centring declaration is responsible for
saw:
  - source/react-ui/packages/ui/src/StatePanel/StatePanel.browser.test.tsx
  - source/react-ui/packages/ui/src/StatePanel/StatePanel.stylesheet.ts
---

`StatePanel` centres its copy through two declarations that overlap: `align-items: center` on
`.vpg-state-panel` and `.vpg-state-panel-text` (the Typography blocks shrink-wrap and sit in the
middle of the column) and `text-align: center` on `.vpg-state-panel` (each wrapped line of a
paragraph centres inside its block).

A single short line is centred by `align-items` alone, so flipping `text-align: center` to `left`
leaves a one-line title and description at the panel's midpoint and a test that only checks one
line stays green. Only a description long enough to fill the line and leave a short last line
exposes the `text-align` regression, which is why `StatePanel.browser.test.tsx` has a separate
"centres every line of a description that wraps" case measured with a `Range` over the text.

Mutation check performed while writing the test, each flip alone: `align-items` on either
container to `flex-start` turns the single-line centring test red; `text-align: left` turns only
the wrapped-description test red.
