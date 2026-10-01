---
about: adding a new published package under source/react-ui touches only package-local files plus one .lydite/components.yml entry; @vipengele/* is exempt from minimumReleaseAge
saw:
  - source/react-ui/pnpm-workspace.yaml
  - .lydite/components.yml
  - .github/workflows/release.yml
  - .github/workflows/ci-test.yml
  - .github/actions/changed-projects/action.yml
  - source/react-ui/packages/tokens/vitest.config.ts
  - source/react-ui/packages/ui/vitest.config.ts
  - docs/adr/0015-a-project-is-the-unit-of-release.md
  - docs/adr/0016-the-brand-is-its-own-repo-consumed-as-a-published-package.md
---

Found while planning issue #92 (ScopeProvider/useScope). Evidence by reading each file.

New package inside `source/react-ui/packages/<x>`:
- Auto-discovered: `pnpm-workspace.yaml` globs `packages/*`; `release.yml:170,278` lists every
  non-private package via `pnpm list --recursive`; `changed-projects/action.yml` works per
  `source/<dir>`; `pages-deploy.yml:100` loops `source/*/`. None name packages.
- Must be added by hand: a `.lydite/components.yml` entry (icons/tokens/ui each are one component;
  `depends_on` plus `setup:` builds of workspace deps because lydite has no turbo graph; the file
  comment says unlisted code is "orphan" scanned), the package's own package.json/tsup/tsconfig/
  vitest.config (100% v8 thresholds, copy `tokens/vitest.config.ts`), Storybook story (repo rule).
- Browser (chromium) project exists only in `packages/ui/vitest.config.ts`; ci-test.yml:74-75
  installs Chromium with `--filter @vipengele/react-ui`, so a new package with a `*.browser.test.*`
  needs its own playwright devDeps and CI install step. tokens/icons are jsdom-only.
- A new npm name needs a `0.0.0` placeholder publish and a trusted-publisher enrolment (ADR-0015)
  before the tag release works; lockstep versioning means it joins the 0.1.x train.

Dependency policy: `minimumReleaseAge: 10080` (minutes, one week) but `minimumReleaseAgeExclude:
["@vipengele/*"]` (pnpm-workspace.yaml:7,19-20; rationale in ADR-0016), so a fresh
`@vipengele/ts*` release installs immediately. `trustPolicy: no-downgrade` still applies: a
version lacking provenance that an earlier one had is rejected.
