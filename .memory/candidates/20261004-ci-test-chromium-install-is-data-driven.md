---
about: ci-test.yml installs Chromium once per distinct playwright version declared by any package in the project's workspace; lydite's handling of a second pnpm workspace and of a compound licence expression is unverified
saw:
  - .github/workflows/ci-test.yml
  - .lydite/components.yml
  - .lydite/config.yml
  - source/react-charts/pnpm-lock.yaml
---

- The Chromium step has no `if: matrix.project == ...`. It lists the workspace's packages with
  `pnpm --recursive list --depth -1 --json`, reads `playwright` from each `package.json`, and runs
  `pnpm --dir <pkg> exec playwright install --with-deps chromium` once per distinct version, so a
  project with a browser suite is covered without editing the workflow and a project without one
  installs nothing and passes. It needs `jq`, which `ubuntu-latest` carries. The listing is a bare
  assignment: under `-e`/`pipefail` only an assignment fails the step, a `for x in $(...)` swallows it.
- `.lydite/components.yml` carries `charts` and `charts-storybook` entries written by analogy with
  `icons`/`storybook`. Whether lydite installs a second pnpm workspace has not been observed; the
  first CI run is the test. `victory-vendor@37.3.6` in the charts production tree declares
  `MIT AND ISC`, while `.lydite/config.yml` allows `[Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, MIT,
  Unicode-3.0]`; whether lydite evaluates an AND expression or compares the raw string is unknown.
  react-ui's dev tree already holds licences outside the list (MPL-2.0, CC-BY-4.0, `MIT OR Apache-2.0`)
  and passes, so lydite scans production dependencies only or does not block on licence.
