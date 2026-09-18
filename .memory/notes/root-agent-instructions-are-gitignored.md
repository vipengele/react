---
name: root-agent-instructions-are-gitignored
kind: gotcha
description: Only the root CLAUDE.md/AGENTS.md are git-ignored, so re-rendering them produces no diff; the per-package ones are tracked.
anchors:
  - path: .gitignore
    blob: ca00c2707847
  - path: agentic/tandiko-repo.md
    blob: 79507fa13e86
confidence: verified
---

`.gitignore:167` and `.gitignore:170` list `/CLAUDE.md` and `/AGENTS.md` under "Agentic toolkit
generated config" (`.gitignore:165`). The leading slash anchors them to the repo root, so the
files under `packages/*` and `apps/*` (e.g. `packages/ui/AGENTS.md`, `packages/ui/CLAUDE.md`) are
not ignored and are tracked.

The root instructions are rendered from `agentic/tandiko-repo.md`. Editing that file and running
`agtk render` updates the root `CLAUDE.md`/`AGENTS.md` on disk, but `git status` shows only the
source file, and that file is the whole commit. A render that appears to have changed nothing has
not failed.

A change to a per-package `AGENTS.md` or `CLAUDE.md` does show up and does need committing. Check
which set you touched before concluding a change was a no-op.
