---
name: biome-config-non-default-choices
kind: rationale
description: Biome is the only formatter/linter; indentStyle=space and the **/*.svg exclusion are deliberate, and Markdown is formatted by nothing.
anchors:
  - path: biome.json
    blob: 3d1464b03187
  - path: package.json
    blob: 9f99fbb71d5b
  - path: agentic/tandiko-repo.md
    blob: 9bb711df11a9
confidence: suspect
---

Biome formats and lints the whole repo from `biome.json`, and the root scripts call only Biome
(`package.json:9-11`). Prettier is not a direct dependency. It appears in `pnpm-lock.yaml:2318`
only as a Storybook peer. JSON cannot hold comments, so the reasons behind the two non-default
settings in `biome.json` live here:

- **`formatter.indentStyle: "space"` (`biome.json:13`).** Biome defaults to tabs, and the tree
  uses two-space indentation throughout. Left at the default, the first format run would rewrite
  every indented line in the repo.
- **`files.includes` excludes `**/*.svg` (`biome.json:9`).** According to the explorer, Biome
  lints SVG without formatting it, and `lint/a11y/noSvgWithoutTitle` flags the standalone assets
  in `packages/brand/assets/{src,dist}` as though they were inline markup.

The explorer also reports that **Biome does not process Markdown**: it prints "no files were
processed". If so, no tool formats the repo's ADRs, `CONTEXT.md` or `AGENTS.md` files. This is
the accepted cost of a single toolchain, not a reason to bring back a second formatter.

`suspect` because neither the Markdown behaviour nor the SVG lint behaviour was re-run during
curation.

Other points:

- `pnpm lint` runs with `--error-on-warnings` (`package.json:9`), so any warning fails the lint.
- `.github/workflows/ci-build.yml:55-56` runs `pnpm lint` and `pnpm format:check` before the build.
- `agentic/tandiko-repo.md:27-28` is out of date. It still says `biome check .` and
  `prettier --check`. Trust `package.json` over it.
