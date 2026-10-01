---
about: ui-token-reads-carry-no-fallback still holds; test line pointers drifted
saw:
  - source/react-ui/packages/ui/src/no-fallback-var-reads.test.ts
  - source/react-ui/packages/ui/vitest.config.ts
targets: ui-token-reads-carry-no-fallback
verdict: still-true
---

Re-read while scoping a Stack primitive. The glob (`import.meta.glob(["./**/*.{ts,tsx}", "!./no-fallback-var-reads.test.ts"], {query:"?raw"})`) is at `no-fallback-var-reads.test.ts:~16-20`, the pattern assembled from parts at `:~25-26`, the offence loop at `:~29-46`. Body pointers (`:17-21`, `:25`, `:31-46`) are off by a few lines. `vitest.config.ts` still excludes `*.browser.test.*` from the jsdom project, which is where this test runs. Rule unchanged; ADR-0019 additionally requires layout primitives to write their `--vpg-<primitive>-<prop>` inline so the stylesheet can read it bare.
