# Tandiko Design System

A pnpm/Turborepo monorepo: the themeable component library Tandiko-branded consumers build UI
with, the tooling that packages it, and the sites that showcase it. See `CONTEXT.md` for the
project's glossary (Seed, Theme, ThemeProvider, ColorMode, Slice) before naming things.

## Rules

This module has prescriptive rules in `agentic/rules/`. **Read every file in that directory before making changes here, and follow each rule strictly.**
Each file contains one rule. New rules go in that directory — one file per rule, kebab-case filename matching the rule's intent.

## Layout

- `packages/tokens` — `@tandiko/tokens`: seed-and-derive theming (`createTheme`, `ThemeProvider`). Own `AGENTS.md`.
- `packages/icons` — `@tandiko/icons`: curated, tree-shakable `lucide-react` re-exports plus `Icon`. Own `AGENTS.md`.
- `packages/ui` — `@tandiko/ui`: themeable React components (`Spinner`, `Button`, `Typography`, `ButtonGroup`, `Avatar`, `Skeleton`). Own `AGENTS.md`.
- `packages/brand` — brand assets (SVG source outlined to `assets/dist`, built via `pnpm brand-png`).
- `apps/storybook` — Vite-based Storybook demonstrating the packages above. Own `AGENTS.md`.
- `docs/adr/` — architecture decision records. Read before revisiting a decision recorded there.

## Commands (run from repo root)

```bash
pnpm build          # turbo run build — builds every workspace in dependency order
pnpm type-check      # turbo run type-check
pnpm test            # turbo run test — vitest with v8 coverage, gated by bulwark (.bulwark.yml)
pnpm lint            # biome lint . --error-on-warnings
pnpm format:check    # biome format .
```

Per-package scripts (`build`, `type-check`, `test`) exist under each `packages/*` and
`apps/*` and are what `turbo` invokes; `turbo.json` declares the task graph (`^build` before
`build`, `test` depends on `^build` and `build`).

## Workspace and dependency policy

- Workspace membership: `pnpm-workspace.yaml` (`packages/*`, `apps/*`).
- `@tandiko/*` packages publish to and resolve from GitHub Packages
  (`registries."@tandiko"` in `pnpm-workspace.yaml`); everything else resolves from the public
  npm registry. Installing/building this repo needs no token — only `pnpm release` does.
- `pnpm-workspace.yaml` enforces `minimumReleaseAge`, `trustPolicy: no-downgrade`, and
  `blockExoticSubdeps: true` for supply-chain hygiene, plus `overrides` for specific
  provenance-driven pins (see the comments in that file before touching `overrides`).
- New dependencies with a postinstall script need an entry in `pnpm-workspace.yaml`'s
  `allowBuilds`, or pnpm silently skips the script.

## CI

- `.github/workflows/ci-build.yml` (`workflow_call`, invoked by `ci-orchestration.yml`) runs
  `pnpm lint` and `pnpm format:check`, then `pnpm build`, verifies
  `packages/brand/assets/dist` is up to date with its sources, then `pnpm type-check`.
- `.github/workflows/ci-test.yml` (`workflow_call`, invoked by `ci-orchestration.yml`) installs
  the Chromium engine `@tandiko/ui`'s browser Vitest project drives, then runs `pnpm test` and
  uploads coverage for the bulwark stage.
- `.github/workflows/pages-deploy.yml` deploys Storybook to GitHub Pages on push to `main`
  only, split into `configure` / `build` / `deploy` jobs so each job holds the minimum GitHub
  token permissions it needs (see the comments in that file before changing job boundaries or
  permissions).
- Coverage is enforced by bulwark (`.bulwark.yml`) against the v8 coverage report `pnpm test`
  produces; linting is Biome, not ESLint (see `.bulwark.yml` for why).

## React version floor

Components in this design system render React 19 and rely on `<style href precedence>` for
stylesheet injection (see `packages/tokens/src/ThemeProvider.tsx`). React 19 and React DOM 19
are peer dependencies of every package that renders React — this excludes consumers still on
React 18.
