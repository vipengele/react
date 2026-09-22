---
about: docs/adr already has two files numbered 0018 (merged independently, PRs #86 and #87) and nothing in CI or a CONTRIBUTING doc checks ADR numbers for uniqueness
saw:
  - docs/adr/0018-statepanel-default-art-is-inline-svg-in-the-ui-package.md
  - docs/adr/0018-textarea-autogrows-with-css-field-sizing.md
  - .github/workflows
---

`ls docs/adr` shows two `0018-*.md` files: `0018-statepanel-default-art-is-inline-svg-in-the-ui-package.md`
and `0018-textarea-autogrows-with-css-field-sizing.md`. Recent commit log
(`806d4c9 feat(react-ui): add Checkbox (#85)`, `9765687 feat(react-ui): add Textarea ... (#86)`,
`2977147 feat(react-ui): add StatePanel (#87)`) shows Textarea (#86) and StatePanel (#87)
landed as separate PRs, each independently claiming 0018 — a numbering collision from parallel
work, left unresolved after merge.

`grep -rln "docs/adr" .github/workflows` and a search for a `CONTRIBUTING.md` both came back
empty: no CI check and no contributor doc enforces unique ADR numbers or tells a PR author
what number to use next. The next ADR (for the layout-primitives decision, issue #31) should
be `0019` (one past the highest existing number, ignoring the duplicate), but a second parallel
PR could collide with that too — there's no mechanical guard against it, only whoever authors
the ADR checking `ls docs/adr` by hand.
