---
name: biome-config-non-default-choices
kind: rationale
description: Biome is the only formatter/linter (ADR 0010); the **/*.svg exclusion was added for brand assets that have since left the repo, and Markdown is formatted by nothing.
anchors:
  - path: source/react-ui/biome.json
    blob: 3d1464b03187
  - path: source/react-ui/package.json
    blob: 7325023efcae
  - path: docs/adr/0010-biome-owns-formatting.md
    blob: efef3f715f33
confidence: verified
---

The decision and its reasons are recorded in `docs/adr/0010-biome-owns-formatting.md`; read that
before changing `source/react-ui/biome.json`. The project's scripts call only Biome
(`source/react-ui/package.json:9-11`), and `agentic/vipengele-react.md:34-35` agrees with them.

The three non-default settings in `biome.json`, each explained in the ADR:

- `formatter.indentStyle: "space"` (`biome.json:13`; `adr/0010:25-27`) — Biome defaults to tabs.
- `lineWidth: 140` (`biome.json:14`; `adr/0010:34-37`).
- `files.includes` excludes `**/*.svg` (`biome.json:9`; `adr/0010:28-33`), because the
  `recommended` preset's `lint/a11y/noSvgWithoutTitle` fails an SVG with no `<title>`. The asset
  the ADR cites as the trigger, `source/react-ui/packages/brand/assets/guide/construction.svg`
  (`adr/0010:30`), no longer exists: the brand moved to its own repo and is consumed as a published
  package (`docs/adr/0016-the-brand-is-its-own-repo-consumed-as-a-published-package.md`). No
  tracked SVG remains under `source/react-ui` today (the ones in `apps/storybook/storybook-static/`
  are build output, git-ignored at `source/react-ui/.gitignore:4`). The exclusion is therefore
  latent, not load-bearing — but under it an SVG passed to Biome by path is reported as "provided
  but ignored", so a clean lint of an SVG proves nothing.

**Markdown is formatted by nothing** (`adr/0010:39-43`). Biome reports a `.md` path as ignored,
and `pnpm format:check` does not count Markdown among the files it checks. This is an accepted
gap (`adr/0010:45-53`), not a reason to reintroduce Prettier.

`pnpm lint` runs with `--error-on-warnings` (`source/react-ui/package.json:9`), so any warning
fails CI. Biome is pinned at 2.5.12 (`source/react-ui/package.json:15`).

Related: which ignore file Biome honours — [[biome-reads-the-gitignore-beside-its-config]].
