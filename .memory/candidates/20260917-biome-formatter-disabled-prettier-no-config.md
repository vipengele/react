---
about: biome.json's formatter:false and Prettier-without-config is a stated but unexplained choice, and the resulting format:check drift is tracked as an accepted baseline, not fixed
saw:
  - biome.json
  - .bulwark.yml
  - package.json
  - handoff/20260917-0630-components-token-migration.md
---

Whether the formatter being disabled in `biome.json` is deliberate has a definite answer:
deliberate, but with no recorded rationale beyond the fact of the choice.

`git log --all -p -- biome.json` shows `"formatter": { "enabled": false }` present from the very
first commit that added the file, `2ecedb0` ("build(design-system): scaffold workspace tooling
for tokens/icons/storybook"). That commit's message states the decision explicitly: "wires
vitest/testing-library and Biome (linter only, Prettier stays formatter)" — so it is not an
oversight or default left untouched. But no comment in `biome.json`, no ADR under `docs/adr/`,
and no line in `.bulwark.yml` gives a *reason* to prefer Prettier's formatter over Biome's.
`.bulwark.yml`'s comment only explains the linter choice (Biome over ESLint, because
`eslint-plugin-security`'s `detect-object-injection` has no rule-level exclusion) — it does not
mention formatting at all, despite the root CLAUDE.md's "see `.bulwark.yml` for why" pointing
there for the Biome decision generally.

Prettier has no config anywhere in the repo (no `.prettierrc*`, no `prettier` key in
`package.json` — confirmed by `find` and `grep`), so it runs at its default 80-column width
while the codebase is written at 100. Running `pnpm format:check` on this branch
(`feature/design-system-core`, commit `7a92f82`) fails on 76 files; on `main`
(`e7161b31bfc88657665ed4ba1cd988c00cce43cc`) it fails on 4. This is not undocumented drift: the
most recent handoff, `handoff/20260917-0630-components-token-migration.md:157`, records
`pnpm format:check` (75 files, one commit before the 76 counted here) as "inherited red from
main" and instructs the next session to check the *count* is unchanged rather than that the
command exits 0 — and corrects an earlier handoff's count of 79 down to 75. So the check being
red is a known, tracked baseline across handoffs, not something nobody noticed — but nothing
explains *why* it is red (i.e., that the root cause is a missing `printWidth: 100` in a
Prettier config) or proposes fixing it; it is carried forward as accepted debt.
