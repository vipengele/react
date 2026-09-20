# Vipengele React

The `vipengele/react` repo: one repo per language, holding **projects** — each a self-contained
pnpm workspace under `source/<project>/` whose packages share one version (ADR-0015). See
`CONTEXT.md` for the project's glossary (Project, vpg, Seed, Theme, ThemeProvider, ColorMode,
Slice) before naming things.

Names people read spell `vipengele` out (`@vipengele/react-ui`); identifiers in code, CSS and
markup carry the short prefix `vpg` (`--vpg-*`, `.vpg-*`, `data-vpg-mode`) — ADR-0014.

## Rules

This module has prescriptive rules in `agentic/rules/`. **Read every file in that directory before making changes here, and follow each rule strictly.**
Each file contains one rule. New rules go in that directory — one file per rule, kebab-case filename matching the rule's intent.

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
- `docs/adr/` — architecture decision records. Read before revisiting a decision recorded there.

## Commands (run from `source/<project>`)

```bash
pnpm build          # turbo run build — builds every workspace in dependency order
pnpm type-check      # turbo run type-check
pnpm test            # turbo run test — vitest with v8 coverage, gated by bulwark (.bulwark.yml)
pnpm lint            # biome lint . --error-on-warnings
pnpm format:check    # biome format .
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
  shared CI file (`ci-*.yml`, that action, `.bulwark.yml`) selects every project; a change that
  touches no project (docs, agentic instructions) selects none and the stages skip.
- `.github/workflows/ci-preflight.yml` skips the build and test stages when no project is affected.
- `.github/workflows/ci-build.yml` (`workflow_call`, invoked by `ci-orchestration.yml`) runs, per
  affected project, `pnpm lint` and `pnpm format:check`, then `pnpm build`, verifies
  `packages/brand/assets/dist` is up to date with its sources, then `pnpm type-check`.
- `.github/workflows/ci-test.yml` (`workflow_call`, invoked by `ci-orchestration.yml`) installs,
  per affected project, the Chromium engine `@vipengele/react-ui`'s browser Vitest project drives,
  then runs `pnpm test` and uploads coverage for the bulwark stage.
- Coverage is enforced by bulwark (`.bulwark.yml`) against the v8 coverage report `pnpm test`
  produces; linting is Biome, not ESLint (see `.bulwark.yml` for why).

## React version floor

Components in this design system render React 19 and rely on `<style href precedence>` for
stylesheet injection (see `source/react-ui/packages/tokens/src/ThemeProvider.tsx`). React 19 and React DOM 19
are peer dependencies of every package that renders React — this excludes consumers still on
React 18.
