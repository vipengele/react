# tandiko-design

The tandiko design system: visual language, brand assets, and — as it grows —
design tokens and UI components shared across tandiko and every app built on it.

A yarn 4 + Turborepo workspace of independently-versioned packages:

| Package | What it is | Runtime deps |
|---------|-----------|--------------|
| [`@tandiko/brand`](packages/brand) | Brand kit — logo/mark/wordmark SVG vectors (text source + outlined dist), Poppins TTFs, the visual brand guide, and the `tandiko-brand-png` rasterizer | `@resvg/resvg-js` |

## Develop

```sh
yarn install
yarn build          # turbo: all packages
```

Brand assets ship as outlined, self-contained SVGs in
[`packages/brand/assets/dist`](packages/brand/assets/dist). Regenerate them from
the text sources after editing `assets/src/` (re-outlines `<text>` → `<path>`
with the brand fonts):

```sh
yarn workspace @tandiko/brand build
```

Rasterize any vector to a PNG on demand (favicons, app icons, email art):

```sh
yarn tandiko-brand-png packages/brand/assets/dist/tandiko-mark.svg 512 mark-512.png
```

The brand guide is [`packages/brand/guide.html`](packages/brand/guide.html) —
open it in a browser, or print it to PDF.

## Distribution

Packages publish to **GitHub Packages** under the `@tandiko` scope. This
repository is private, so consumers need a token with `read:packages` and access
to the `tandiko` org:

```yaml
# .yarnrc.yml
npmScopes:
  tandiko:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAuthToken: "${GH_TOKEN-}"
```

Repos managed by `gt` already export a per-repo `GH_TOKEN` via direnv — add the
scope once with `gh auth refresh -s read:packages`. In CI, set `GH_TOKEN` from a
token that can read `tandiko` packages and grant `permissions: packages: read`.

## Release

Versioning is via [Changesets](https://github.com/changesets/changesets);
publishing is **tag-gated** (merging never publishes):

1. PRs that change a package include a changeset (`yarn changeset`).
2. `yarn changeset version` on a branch → release-prep PR (bumps + changelogs).
3. Merge it — nothing publishes yet.
4. `yarn changeset tag && git push --follow-tags` — the per-package tags
   (`@tandiko/brand@x.y.z`) trigger the `Release` workflow, which publishes to
   GitHub Packages.

The `bump-version` agent skill (`.agents/skills/bump-version`) walks through
exactly this.
