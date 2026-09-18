---
name: biome-config-non-default-choices
kind: rationale
description: Biome is the only formatter/linter (ADR 0010); the **/*.svg exclusion exists because noSvgWithoutTitle fails brand assets, and Markdown is formatted by nothing.
anchors:
  - path: biome.json
    blob: 3d1464b03187
  - path: package.json
    blob: 9f99fbb71d5b
  - path: docs/adr/0010-biome-owns-formatting.md
    blob: 661728db2e76
confidence: verified
---

The decision and its reasons are recorded in `docs/adr/0010-biome-owns-formatting.md`; read that
before changing `biome.json`. The root scripts call only Biome (`package.json:9-11`), and
`agentic/tandiko-repo.md:27-28` now agrees with them.

The three non-default settings in `biome.json`, each explained in the ADR:

- `formatter.indentStyle: "space"` (`biome.json:13`; `adr/0010:25-27`) — Biome defaults to tabs.
- `lineWidth: 140` (`biome.json:14`; `adr/0010:34-37`).
- `files.includes` excludes `**/*.svg` (`biome.json:9`; `adr/0010:28-33`). Reproduced on Biome
  2.5.12 (`package.json:18`): with the exclusion lifted, `biome lint
  packages/brand/assets/guide/construction.svg` fails `lint/a11y/noSvgWithoutTitle`. The rule
  checks for a `<title>` rather than flagging every SVG — `packages/brand/assets/dist/tandiko-mark.svg`,
  which has one, passes. Under the real config an SVG passed by path is reported as "provided but
  ignored", so a clean lint of an SVG proves nothing.

**Markdown is formatted by nothing** (`adr/0010:39-43`). Biome reports a `.md` path as ignored,
and `pnpm format:check` does not count Markdown among the files it checks. This is an accepted
gap (`adr/0010:45-53`), not a reason to reintroduce Prettier.

`pnpm lint` runs with `--error-on-warnings` (`package.json:9`), so any warning fails CI.
