# tandiko-design

The tandiko design system: visual language, brand assets, and — as it grows —
design tokens and UI components shared across tandiko and every app built on it.

A pnpm + Turborepo workspace of independently-versioned packages:

| Package | What it is | Runtime deps |
|---------|-----------|--------------|
| [`@tandiko/brand`](packages/brand) | Brand kit — logo/mark/wordmark SVG vectors (text source + outlined dist), Poppins TTFs, the visual brand guide, and the `tandiko-brand-png` rasterizer | `@resvg/resvg-js` |

## Develop

```sh
pnpm install
pnpm build          # turbo: all packages
```

Brand assets ship as outlined, self-contained SVGs in
[`packages/brand/assets/dist`](packages/brand/assets/dist). Regenerate them from
the text sources after editing `assets/src/` (re-outlines `<text>` → `<path>`
with the brand fonts):

```sh
pnpm --filter @tandiko/brand build
```

Rasterize any vector to a PNG on demand (favicons, app icons, email art):

```sh
pnpm brand-png packages/brand/assets/dist/tandiko-mark.svg 512 mark-512.png
```

The brand guide is [`packages/brand/guide.html`](packages/brand/guide.html) —
open it in a browser, or print it to PDF.

## Distribution

Packages publish to **GitHub Packages** under the `@tandiko` scope. This
repository is private, so consumers need a token with `read:packages` and access
to the `tandiko` org. Route the scope in the consumer's `pnpm-workspace.yaml`:

```yaml
registries:
  default: https://registry.npmjs.org/
  "@tandiko": https://npm.pkg.github.com/
```

pnpm never expands `${...}` in committed config, so the token lives in
user-level config. Locally, once (after `gh auth refresh -s read:packages`):

```sh
pnpm config set //npm.pkg.github.com/:_authToken "$(gh auth token)"
```

In CI, run the same `pnpm config set --location user …` with a token that can
read `tandiko` packages, and grant `permissions: packages: read` (see
[`release.yml`](.github/workflows/release.yml) for the pattern).

## Release

Versioning is via [Changesets](https://github.com/changesets/changesets);
publishing is **tag-gated** (merging never publishes):

1. PRs that change a package include a changeset (`pnpm changeset`).
2. `pnpm changeset version` on a branch → release-prep PR (bumps + changelogs).
3. Merge it — nothing publishes yet.
4. `pnpm changeset tag && git push --follow-tags` — the per-package tags
   (`@tandiko/brand@x.y.z`) trigger the `Release` workflow, which publishes to
   GitHub Packages.

The `bump-version` agent skill (`agentic-src/skills/bump-version`) walks through
exactly this.
