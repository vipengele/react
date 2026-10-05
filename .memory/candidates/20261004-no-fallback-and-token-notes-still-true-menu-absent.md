---
about: ui-token-reads-carry-no-fallback re-checked, claim holds despite 14 added component files
targets: ui-token-reads-carry-no-fallback
verdict: still-true
saw:
  - source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
  - source/react-ui/packages/ui/src
---

`grep -rnE 'var\(--vpg-[a-z0-9-]+\s*,' src` excluding the enforcing test -> 0 hits across the new AspectRatio/Badge/Center/FileInput/Grid/Inline/Link/NumberInput/Stack/Table/Tag/Tree stylesheets. Staleness is only the glob-matched new files; the glob test covers them. Tokens `theme.ts` line pointers were not re-checked.
