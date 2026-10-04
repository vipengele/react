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
  - source/react-ui/packages/telemetry/vitest.config.ts
  - docs/adr/0015-a-project-is-the-unit-of-release.md
  - docs/adr/0016-the-brand-is-its-own-repo-consumed-as-a-published-package.md
---

Established by reading each file, and by adding `packages/telemetry` as the worked example.

New package inside `source/react-ui/packages/<x>`:
- Auto-discovered: `pnpm-workspace.yaml` globs `packages/*`; `release.yml` lists every
  non-private package via `pnpm list --recursive`; `changed-projects/action.yml` works per
  `source/<dir>`; `pages-deploy.yml` loops `source/*/`. None name packages.
- Must be added by hand: a `.lydite/components.yml` entry (icons/tokens/ui/telemetry are each one
  component; `depends_on` plus `setup:` builds of workspace deps because lydite has no turbo
  graph; unlisted code is scanned as "orphan"), the package's own package.json/tsup/tsconfig/
  vitest.config (100% v8 thresholds, copy `tokens/vitest.config.ts`), a Storybook story (repo rule),
  and a `depends_on`/`setup:` build line on the `storybook` component when the story imports it.
- A browser (chromium) project lives in `packages/ui/vitest.config.ts` and
  `packages/telemetry/vitest.config.ts`; tokens/icons are jsdom-only. `ci-test.yml` installs
  Chromium for every workspace package that declares `playwright`, once per distinct declared
  version, so a package that adds a `*.browser.test.*` needs `playwright` in its devDependencies
  at ui's pin but no CI change. Its lydite entry needs the
  `npx playwright install --with-deps chromium` `setup:` line, because lydite runs its own install.
- A new npm name needs a `0.0.0` placeholder publish and a trusted-publisher enrolment (ADR-0015)
  before the tag release works; lockstep versioning means it joins the shared version train, so
  the next release tag fails on the new name until that is done.

Dependency policy: `minimumReleaseAge: 10080` (minutes, one week) but `minimumReleaseAgeExclude:
["@vipengele/*"]` (`pnpm-workspace.yaml`; rationale in ADR-0016), so a fresh `@vipengele/ts*`
release installs immediately. `trustPolicy: no-downgrade` still applies: a version lacking
provenance that an earlier one had is rejected.
