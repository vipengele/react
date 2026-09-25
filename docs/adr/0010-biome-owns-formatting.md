# Biome owns formatting

`biome.json` lints and formats from one config: `formatter.enabled` is `true`, `lineWidth` is
140, and `pnpm format` and `pnpm format:check` both run `biome format` with no other formatter
in the pipeline. `pnpm lint` runs `biome lint . --error-on-warnings`. No dependency on Prettier,
or any other formatter, remains in `package.json`; where Prettier appears in `pnpm-lock.yaml` at
all, it is a transitive peer of Storybook, not a tool this repo invokes.

Biome also replaces ESLint as the *linter*, which is a separate decision from this one: ESLint's
`detect-object-injection` rule fires on every `obj[key]` with no per-rule exclusion available, and
the only way to quiet it is a suppression at each call site. Biome's security and correctness rule
sets carry that weight instead, with no equivalent false-positive rate on this codebase's own
`obj[key]` idiom — the same choice made across every repository this governance applies to. This
decision is about the *formatter* — Prettier held that role until Biome took over both jobs, and
no record of why existed anywhere in the repo until now.

## Decision

One tool formats and lints the whole repository. Adding a second tool for either job means two
configs that can disagree about the same file, and a contributor who has to know which tool
governs which extension before running either. Consolidating onto Biome removes that ambiguity
for every extension Biome supports.

Two settings in `biome.json` depart from Biome's defaults, and one exclusion follows from a
lint rule that a design system trips over more than most repositories do:

- **`formatter.indentStyle` is pinned to `"space"`.** Biome's default is tab. The tree is
  two-space-indented throughout; left at the default, the first format run would rewrite every
  indented line in the repository.
- **`lineWidth` is `140`**, wider than Biome's 80-column default. Source, tests and config in
  this repo run long-established, descriptive identifiers — token names like
  `--vpg-typography-body-md-size`, test names, table rows — and 80 columns would fold most
  of them across two or three lines for no gain in readability.

Markdown is formatted by nothing. Biome does not process `.md` files at all: pointed at one
directly it reports the path as ignored, and a repo-wide `biome format .` run does not count
Markdown files among the files it checks. This is an accepted gap, not an oversight — the
alternative considered and rejected below is what closes it, and closing it was judged not
worth its cost.

## Considered options

- **Keep Prettier for Markdown, Biome for everything else.** This would format `docs/adr/`,
  `CONTEXT.md`, every package's `AGENTS.md`, and this file. Rejected because documentation prose
  does not need a tool choosing where its line breaks fall — an ADR's table columns, a numbered
  list's wrapping, a code fence's indentation inside a bullet are all judgment calls a human
  already made when writing the file, and a formatter re-flowing them is as likely to make a table
  harder to read as easier. It also reintroduces the two-tool ambiguity this decision exists to
  remove, for the sole benefit of one file extension.

## Cost

No tool checks Markdown for consistent line length, trailing whitespace, or heading style,
including in this file. A reviewer's eye is the only gate on Markdown formatting drifting across
`docs/adr/`, `CONTEXT.md`, and every package's `AGENTS.md`, and nothing in CI will catch a
Markdown file that widens beyond what the rest of the repo does.

A 140-column line width is wide enough that a diff viewer sized for 80 or 100 columns wraps or
truncates lines Biome considers already formatted, and a long line that would have been an
obvious signal to shorten at 80 columns can sit unnoticed at 140.
