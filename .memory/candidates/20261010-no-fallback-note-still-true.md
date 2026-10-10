---
about: ui-token-reads-carry-no-fallback re-checked, claim holds
saw:
  - source/react-ui/packages/ui/src
  - source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---

`grep -rnE "var\(--vpg-[a-z0-9-]+\s*," --include=*.ts --include=*.tsx src` (excluding the enforcing test) -> 0 hits across
all current components, including those added since the note (Accordion, Disclosure, Drawer, Tree...). Line pointers in the
note's body (theme.ts, base-stylesheet.ts) were not re-verified.
