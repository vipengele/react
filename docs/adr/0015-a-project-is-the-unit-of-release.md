# A project is the unit of release

The repo is `vipengele/react`: one repo per language. Inside it, each **project** lives in
`source/<project>/` as its own pnpm workspace — its own `pnpm-workspace.yaml`, lockfile,
`turbo.json`, `tsconfig.base.json` and Biome config. `source/react-ui/` holds `react-tokens`,
`react-icons`, `react-ui` and the Storybook app; a future `source/react-store/` sits beside it.
The repo root holds only what crosses projects: `.github/`, `.github-pages/`, `agentic/`,
`.memory`, `.lydite`, `docs/` and `CONTEXT.md`.

A release is a tag `<project>@vX.Y.Z`. One workflow reads the project name from the tag and
publishes every non-private package in `source/<project>/` at that version, so all packages of a
project share one version. Publishing follows the hatua model: a human pushes the tag, a
credential-free `build` job hands `dist/` to a `publish` job that authenticates with npm trusted
publishing (OIDC, `--provenance`, environment `npm-release`), and a re-run finishes a partial
publish. Each package name is created once with a `0.0.0` placeholder before its trusted publisher
can be enrolled.

CI computes the changed projects from the diff and builds only those. The Pages site is assembled
from `.github-pages/` plus each project's `build:pages` output, built from that project's latest
release tag, and redeployed on every release, because a Pages deploy replaces the whole site.

## Why a project is a workspace, not a directory of a shared one

Internal dependencies inside a project are `workspace:*`, which pnpm packs as an exact pin.
Publishing one package alone strands every consumer of the others, so a project's packages version
together. Two projects that shared a root workspace could couple through `workspace:*` and inherit
the same stranding across a version boundary they do not share. Separate workspaces make a
cross-project dependency an ordinary published range.

## Considered options

- **Flat `packages/*` with per-package tags and changesets.** Tags carry the npm scope
  (`@vipengele/react-ui@x.y.z`), `changeset tag` offers no way to change that, and independent
  package versions contradict the exact-pin lockstep above.
- **`release-please`.** It models per-package or per-component releases, not one tag versioning a
  group, and the tags it creates with the default token do not trigger the publish workflow.
- **One repo per project.** Multiplies repos, settings and CI for what the org's one-repo-per-language
  rule already groups.

## Consequences

Each project pays for its own lockfile and tool config, and Dependabot needs one entry per project
directory. A change to shared root CI files selects every project.
