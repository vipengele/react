---
about: Biome's SVG lint and Markdown non-processing behaviours are reproduced empirically, and one bullet in the existing note is now false.
saw: biome.json, docs/adr/0010-biome-owns-formatting.md, .memory/notes/biome-config-non-default-choices.md
---

The note `biome-config-non-default-choices` carries `confidence: suspect` because neither the
SVG lint behaviour nor the Markdown behaviour was re-run during curation. Both were run on
Biome 2.5.12:

- `npx biome explain noSvgWithoutTitle` reports the rule as recommended, default severity error.
  With `files.includes` set to `["**"]` in a throwaway config, `npx biome lint
  packages/brand/assets/guide/construction.svg` fails with `lint/a11y/noSvgWithoutTitle` —
  "Alternative text title element cannot be empty". Under the real `biome.json`, the same path
  reports "Checked 0 files ... These paths were provided but ignored." The rule inspects for a
  title rather than flagging every SVG: `packages/brand/assets/dist/tandiko-mark.svg`, which has
  a `<title>`, passes under the same override.
- Biome does not process Markdown. Pointed at a `.md` file directly it reports the path as
  ignored, and a repo-wide `pnpm format:check` counts 139 files, excluding every Markdown file
  present.

`docs/adr/0010-biome-owns-formatting.md` is now the repo's record of this decision and states
both behaviours as fact.

One bullet in that note is false as written. It says `agentic/tandiko-repo.md:27-28` still reads
`biome check .` and `prettier --check`, and directs the reader to trust `package.json` over it.
Those lines now read `biome lint . --error-on-warnings` and `biome format .`, matching
`package.json`, so that bullet describes a discrepancy the files do not
contain, and points the reader away from a source that is now accurate.
