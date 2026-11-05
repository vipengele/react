# vipengele/react

The React side of the vipengele design system. The repo holds **projects**, each a
self-contained pnpm workspace under `source/<project>/` whose packages share one version
([ADR-0015](docs/adr/0015-a-project-is-the-unit-of-release.md)).

| Project | Packages | Storybook |
|---------|----------|-----------|
| [`source/react-ui`](source/react-ui) | [`@vipengele/react-tokens`](source/react-ui/packages/tokens), [`@vipengele/react-icons`](source/react-ui/packages/icons), [`@vipengele/react-ui`](source/react-ui/packages/ui), [`@vipengele/react-telemetry`](source/react-ui/packages/telemetry), [`@vipengele/react`](source/react-ui/packages/react) | [vipengele.github.io/react/react-ui](https://vipengele.github.io/react/react-ui/) |
| [`source/react-charts`](source/react-charts) | [`@vipengele/react-charts`](source/react-charts/packages/charts) | [vipengele.github.io/react/react-charts](https://vipengele.github.io/react/react-charts/) |

Packages publish to the public npm registry under the `@vipengele` scope. In code and CSS the
short alias `vpg` is the identifier prefix (`--vpg-*`, `.vpg-*`, `data-vpg-mode`) —
[ADR-0014](docs/adr/0014-vpg-is-the-code-level-prefix-for-vipengele.md).

## Install

React 19 and React DOM 19 are peer dependencies of every package that renders React.

```sh
pnpm add @vipengele/react @vipengele/react-ui @vipengele/react-tokens @vipengele/react-telemetry @vipengele/react-icons
pnpm add @vipengele/react-charts   # charts, themed by the same @vipengele/react-tokens
```

Wrap the app in `<Vipengele>` from [`@vipengele/react`](source/react-ui/packages/react), which
mounts the theme, locale and telemetry scope every component reads. Each package's README
documents its API, and the Storybook links above show every component live.

## Versions and releases

Every package in a project carries the project's version, and the project releases them together
under one tag, `<project>@vX.Y.Z`. Upgrade a project's packages together, to the same version.
The projects version independently: `@vipengele/react-charts` takes `@vipengele/react-tokens` as a
published range. Each release's notes are in [`docs/release-notes`](docs/release-notes) and on
its [GitHub Release](https://github.com/vipengele/react/releases), and the Storybook shows each
project at its latest release.

## Develop

Work happens inside a project's directory:

```sh
cd source/react-ui   # or source/react-charts
pnpm install
pnpm build          # turbo: every package, in dependency order
pnpm test
pnpm lint
```

The brand lives in [`vipengele/brand`](https://github.com/vipengele/brand) and is consumed here
as the published [`@vipengele/brand`](https://www.npmjs.com/package/@vipengele/brand) — a
cross-project dependency is a published range, never `workspace:*` (ADR-0015). The Storybook
takes its sidebar lockup from it; nothing else here depends on it.

The brand guidance — lockups, palette, clear space, minimum sizes — is that package's README.
