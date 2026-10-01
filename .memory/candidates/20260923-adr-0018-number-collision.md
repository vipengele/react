---
about: docs/adr/0018-statepanel-default-art-is-inline-svg-in-the-ui-package.md
saw: writing ADR-0020 and needing the next free ADR number and to cite prior ADRs correctly
---

Two ADRs both carry the number `0018`:
`docs/adr/0018-statepanel-default-art-is-inline-svg-in-the-ui-package.md` and
`docs/adr/0018-textarea-autogrows-with-css-field-sizing.md`. `docs/adr/0019-layout-primitives-accept-token-values-only.md`
cites "Textarea (ADR-0018)", which is only unambiguous if the reader already knows which of the
two files that number was meant to point at.

`ls docs/adr/ | tail -1` (the handoff's own method for finding "the next free number") does not
surface this: it only shows the highest number, not a duplicate earlier in the sequence. A
session citing "ADR-0018" from prose alone should verify which file is meant by title, not
number, until one of the two is renumbered.
