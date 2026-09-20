# vipengele/react

The React side of the vipengele design system. The repo holds **projects**, each a
self-contained pnpm workspace under `source/<project>/` whose packages share one version
([ADR-0015](docs/adr/0015-a-project-is-the-unit-of-release.md)).

| Project | Packages |
|---------|----------|
| [`source/react-ui`](source/react-ui) | [`@vipengele/react-tokens`](source/react-ui/packages/tokens), [`@vipengele/react-icons`](source/react-ui/packages/icons), [`@vipengele/react-ui`](source/react-ui/packages/ui), [`@vipengele/brand`](source/react-ui/packages/brand), and the Storybook in [`apps/storybook`](source/react-ui/apps/storybook) |

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

Brand assets ship as outlined, self-contained SVGs in
[`source/react-ui/packages/brand/assets/dist`](source/react-ui/packages/brand/assets/dist).
Regenerate them from the text sources after editing `assets/src/`:

```sh
pnpm --filter @vipengele/brand build
```

Rasterize any vector to a PNG on demand (favicons, app icons, email art):

```sh
pnpm brand-png packages/brand/assets/dist/tandiko-mark.svg 512 mark-512.png
```

The brand guide is [`source/react-ui/packages/brand/guide.html`](source/react-ui/packages/brand/guide.html) —
open it in a browser, or print it to PDF.
