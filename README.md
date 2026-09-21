# vipengele/react

The React side of the vipengele design system. The repo holds **projects**, each a
self-contained pnpm workspace under `source/<project>/` whose packages share one version
([ADR-0015](docs/adr/0015-a-project-is-the-unit-of-release.md)).

| Project | Packages |
|---------|----------|
| [`source/react-ui`](source/react-ui) | [`@vipengele/react-tokens`](source/react-ui/packages/tokens), [`@vipengele/react-icons`](source/react-ui/packages/icons), [`@vipengele/react-ui`](source/react-ui/packages/ui), and the Storybook in [`apps/storybook`](source/react-ui/apps/storybook) |

Packages publish to the public npm registry under the `@vipengele` scope. In code and CSS the
short alias `vpg` is the identifier prefix (`--vpg-*`, `.vpg-*`, `data-vpg-mode`) —
[ADR-0014](docs/adr/0014-vpg-is-the-code-level-prefix-for-vipengele.md).

## Develop

Work happens inside a project's directory:

```sh
cd source/react-ui
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
