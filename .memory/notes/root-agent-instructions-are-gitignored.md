---
name: root-agent-instructions-are-gitignored
kind: gotcha
description: Only the root CLAUDE.md/AGENTS.md are git-ignored, so re-rendering them produces no diff; the per-package ones are tracked.
anchors:
  - path: .gitignore
    blob: f8b0346b29b7
  - path: agentic/vipengele-react.md
    blob: 194d70790f8a
  - path: .agentic-toolkit.yaml
    blob: 156ef3a77cbf
confidence: verified
---

`.gitignore:151` and `.gitignore:154` list `/CLAUDE.md` and `/AGENTS.md` under "Agentic toolkit
generated config" (`.gitignore:149`). The leading slash anchors them to the repo root, so the
files under `source/react-ui/packages/*` and `source/react-ui/apps/*` (e.g.
`source/react-ui/packages/ui/AGENTS.md`) are not ignored — neither `.gitignore` nor
`source/react-ui/.gitignore` names them — and are tracked.

The root instructions are rendered from `agentic/vipengele-react.md` (`.agentic-toolkit.yaml:14`,
`context:`). Editing that file and running `agtk render` updates the root `CLAUDE.md`/`AGENTS.md`
on disk, but `git status` shows only the source file, and that file is the whole commit. A render
that appears to have changed nothing has not failed.

A change to a per-package `AGENTS.md` or `CLAUDE.md` does show up and does need committing. Check
which set you touched before concluding a change was a no-op.
