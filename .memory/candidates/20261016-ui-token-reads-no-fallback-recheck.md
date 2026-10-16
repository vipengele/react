---
about: no-fallback test re-verified; details of what it does and does not catch
saw:
  - source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
  - source/react-ui/packages/ui/.agents/rules/no-literal-fallback-in-token-reads.md
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---
Read the test: line-based regex `var\(--vpg-[a-z0-9-]+,` over every `./**/*.{ts,tsx}` under ui/src
(raw via import.meta.glob), minus itself. Needs no registration: a new component directory is picked
up automatically. Gotchas: it scans comments, docs strings and test files too, so a comment quoting a
fallback fails it; a space before the comma (`var(--vpg-x , 1px)`) or a fallback on a following line
would evade the regex (not enforced by anything else). Runs in the jsdom project. Pointers in the
note's body (`:17-21`, `:25`, `:31-46`) are shifted: the glob is at lines 17-21 still but the
pattern is built at the `fallbackPattern` line near 26; trust symbol names. Also: the ui vitest.config
.ts line numbers cited in the note (`:6`, `:25-31`) have moved.
