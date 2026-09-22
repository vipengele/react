---
about: the no-var()-fallback invariant still holds after StatePanel and Textarea were added
saw:
  - source/react-ui/packages/ui/src/StatePanel/*.ts
  - source/react-ui/packages/ui/src/StatePanel/*.tsx
  - source/react-ui/packages/ui/src/Textarea/*.ts
  - source/react-ui/packages/ui/src/Textarea/*.tsx
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---

Re-checked because the note was stale (StatePanel/Textarea files added, matching its glob
anchors). `grep -rn 'var(--vpg-[a-z0-9-]*\s*,' StatePanel Textarea` from
`source/react-ui/packages/ui/src` returns zero matches, so neither new component introduced a
`var()` fallback; the enforcing glob test (`no-fallback-var-reads.test.ts`) still covers them
automatically since it globs `src/**/*.{ts,tsx}` at run time. No other claim in the note needed
re-checking (StatePanel and Textarea don't affect ADR-0009's mapping table or the six-container
literal carve-out).
