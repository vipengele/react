---
about: the tandiko name is hard-coded in strings that tests, bundle-check, CI tag triggers and the publish registry match literally
saw:
  - packages/ui/bundle-check/run.mjs
  - packages/ui/src/no-fallback-var-reads.test.ts
  - pnpm-workspace.yaml
  - .github/workflows/release.yml
  - agentic/skills/bump-version/SKILL.md
  - .lydite/components.yml
  - turbo.json
  - .changeset/config.json
---
No ADR records a decision about the `tandiko` prefix or `@tandiko` scope; ADRs 0001/0002/0007/0009 only use them.
Literal-match sites: bundle-check/run.mjs:42-76 (`.tandiko-*` markers); no-fallback-var-reads.test.ts:25 (regex `var\(--tandiko-`, a rename that misses it makes the guard pass vacuously);
pnpm-workspace.yaml:24 registries."@tandiko"; release.yml:11 tag glob `@tandiko/*@*`; bump-version SKILL.md:16,43,110,123 (`gh api /orgs/tandiko/packages`);
.lydite/components.yml:31-57 `--filter @tandiko/*`; turbo.json:8,11 `@tandiko/brand#build`; .changeset/config.json:10 ignore.
Found by `grep -rli tandiko`. package.json repository/homepage URLs are github.com/tandiko/tandiko-design.
