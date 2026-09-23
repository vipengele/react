# Vipengele React

The `vipengele/react` repo: one repo per language, holding **projects** — each a self-contained
pnpm workspace under `source/<project>/` whose packages share one version (ADR-0015). See
`CONTEXT.md` for the project's glossary (Project, vpg, Seed, Theme, ThemeProvider, ColorMode,
Slice) before naming things.

Names people read spell `vipengele` out (`@vipengele/react-ui`); identifiers in code, CSS and
markup carry the short prefix `vpg` (`--vpg-*`, `.vpg-*`, `data-vpg-mode`) — ADR-0014.

## Layout

- `source/<project>/` — one pnpm workspace per project, with its own `pnpm-workspace.yaml`,
  lockfile, `turbo.json`, `tsconfig.base.json` and `biome.json`. A cross-project dependency is a
  published range, never `workspace:*`.
- `source/react-ui/` — the themeable React component library and its Storybook:
  - `packages/tokens` — `@vipengele/react-tokens`: seed-and-derive theming (`createTheme`, `ThemeProvider`). Own `AGENTS.md`.
  - `packages/icons` — `@vipengele/react-icons`: curated, tree-shakable `lucide-react` re-exports plus `Icon`. Own `AGENTS.md`.
  - `packages/ui` — `@vipengele/react-ui`: themeable React components. Own `AGENTS.md`.
  - `packages/brand` — `@vipengele/brand`: brand assets (SVG source outlined to `assets/dist`, built via `pnpm brand-png`).
  - `apps/storybook` — Vite-based Storybook demonstrating the packages above. Own `AGENTS.md`.
- `.github/actions/changed-projects` — the projects a change affects; CI builds only those.
- `.github-pages/` — the shell of the Pages site; each project contributes a subdirectory.
- `docs/adr/` — architecture decision records. Read before revisiting a decision recorded there.
- `docs/release-notes/` — one file per release, named after its tag. The release workflow
  refuses to publish without the one its tag names.

## Commands (run from `source/<project>`)

```bash
pnpm build          # turbo run build — builds every workspace in dependency order
pnpm type-check      # turbo run type-check
pnpm test            # turbo run test — vitest with v8 coverage, gated by lydite
pnpm lint            # biome lint . --error-on-warnings
pnpm format:check    # biome format .
pnpm build:pages     # the project's contribution to the Pages site, into pages-dist/
```

Per-package scripts (`build`, `type-check`, `test`) exist under each `packages/*` and
`apps/*` and are what `turbo` invokes; the project's `turbo.json` declares the task graph
(`^build` before `build`, `test` depends on `^build` and `build`).

## Workspace and dependency policy

- Workspace membership: the project's `pnpm-workspace.yaml` (`packages/*`, `apps/*`).
- `@vipengele/*` packages publish to the public npm registry and resolve from it like every
  other dependency; installing and building need no token.
- A project's `pnpm-workspace.yaml` enforces `minimumReleaseAge`, `trustPolicy: no-downgrade`, and
  `blockExoticSubdeps: true` for supply-chain hygiene, plus `overrides` for specific
  provenance-driven pins (see the comments in that file before touching `overrides`).
- New dependencies with a postinstall script need an entry in the project's `pnpm-workspace.yaml`
  `allowBuilds`, or pnpm silently skips the script.

## CI

- `.github/actions/changed-projects` lists the `source/` projects a diff touches. A change to a
  shared CI file (`ci-*.yml`, that action, `.lydite/`) selects every project; a change that
  touches no project (docs, agentic instructions) selects none and the stages skip.
- `.github/workflows/ci-preflight.yml` skips the build and test stages when no project is affected.
- `.github/workflows/ci-build.yml` (`workflow_call`, invoked by `ci-orchestration.yml`) runs, per
  affected project, `pnpm lint` and `pnpm format:check`, then `pnpm build`, verifies
  `packages/brand/assets/dist` is up to date with its sources, then `pnpm type-check`.
- `.github/workflows/ci-test.yml` (`workflow_call`, invoked by `ci-orchestration.yml`) installs,
  per affected project, the Chromium engine `@vipengele/react-ui`'s browser Vitest project drives,
  then runs `pnpm test` per affected project. The `lydite` stage gates coverage separately,
  running each `.lydite/components.yml` component's suite itself; linting is Biome, not ESLint
  (see `docs/adr/0010-biome-owns-formatting.md` for why).

## Release

A release is one tag, `<project>@vX.Y.Z`, pushed by a human (ADR-0015). It publishes every
non-private package in `source/<project>` at that version — the packages of a project share one
version because their internal dependencies are `workspace:*`, which pnpm packs as exact pins.
There is no changesets and no release-please. The `release` skill walks the whole sequence.

- `.github/workflows/release.yml` reads the project name from the tag, so one workflow serves
  every project. Its `tag` job validates the tag and requires `docs/release-notes/<tag>.md`;
  `build` holds no credentials and hands `dist/` on as an artefact; `publish` holds the OIDC
  token, verifies the artefact carries nothing but `dist/`, and publishes with provenance
  through npm trusted publishing. Publishing is idempotent, so a re-run finishes a partial
  release rather than failing on what already landed.
- A brand-new package name must be created by a one-time manual publish with a token before a
  trusted publisher can be enrolled on it: npm only enrols one on a name the registry holds.

## Pages

`https://vipengele.github.io/react/<project>/` — the `.github-pages/` shell plus each project's
`pnpm build:pages` output, built from that project's **latest release tag**, so the site shows
what is installable rather than what is merged. `pages-deploy.yml` runs when a release succeeds
(and on `workflow_dispatch`) and rebuilds every project, because a Pages deployment replaces the
whole site.

## React version floor

Components in this design system render React 19 and rely on `<style href precedence>` for
stylesheet injection (see `source/react-ui/packages/tokens/src/ThemeProvider.tsx`). React 19 and React DOM 19
are peer dependencies of every package that renders React — this excludes consumers still on
React 18.
