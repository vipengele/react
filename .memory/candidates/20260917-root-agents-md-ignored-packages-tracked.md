---
about: Only the root AGENTS.md/CLAUDE.md are git-ignored; the per-package ones are tracked files.
saw: agentic/tandiko-repo.md, .gitignore, CLAUDE.md
---

`agtk render` regenerates `CLAUDE.md` and `AGENTS.md` at the repo root and under each package,
but git treats the two sets differently. `.gitignore:167` and `.gitignore:170` list `/CLAUDE.md`
and `/AGENTS.md` — anchored with a leading slash, so they match the root pair only.
`git ls-files` returns eight such files, all of them under `packages/*` and `apps/*`.

The consequence catches a reviewer out: correcting the rendered root instructions produces **no
diff at all**. Editing `agentic/tandiko-repo.md` and running `agtk render` updates the root
`CLAUDE.md` and `AGENTS.md` on disk, `git status` reports only the source file, and that source
file is the entire commit. A render that appears to have changed nothing has not failed.

The per-package files are tracked, so a render that touches one of those does show up and does
need committing. Check which set is in play before concluding a render was a no-op.
