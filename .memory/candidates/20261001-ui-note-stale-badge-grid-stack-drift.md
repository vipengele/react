---
about: ui-token-reads-carry-no-fallback and custom-property-read-back-is-unresolved still hold; staleness is only new sibling components and shifted line numbers
saw:
  - source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
  - source/react-ui/packages/ui/vitest.config.ts
  - source/react-ui/packages/ui/src/Stack/Stack.stylesheet.ts
  - source/react-ui/packages/ui/AGENTS.md
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---

Re-checked: Stack/Grid/Badge/Link stylesheets read tokens bare; ui/vitest.config.ts still runs the
glob test in the jsdom project and excludes `*.browser.test.*` from it (and the comment there says
a duplicated browser run would fail the geometry assertions, because jsdom lays nothing out).
The `vitest.config.ts:23-33`/`:6`/`:37`/`:31` pointers in the two notes have shifted (jsdom exclude is now
about :28-31, `browserTests` const :6). The "ADR 0009 names the deleted Autocomplete" aside still
stands. New sibling stylesheets (Stack, Grid, Badge, Link, NumberInput) all comply.
Layout primitives additionally assign `--vpg-<primitive>-<prop>` inline (ADR-0019), which the
note's "never assign inline" sentence did not allow for: it is narrowed for those names.
