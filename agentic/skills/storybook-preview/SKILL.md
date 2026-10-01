---
name: storybook-preview
description: >-
  Use this skill when the user wants to see, try or validate Storybook from a cloud session
  (e.g. "start storybook", "let me look at the stories", "preview the storybook", "show me the
  component"). A cloud sandbox has no inbound network access and its proxy blocks tunnels, so
  `storybook dev` is unreachable; this builds the static Storybook and publishes it as a private
  Artifact instead.
---

# Preview Storybook from a cloud session

`storybook dev` cannot be reached from outside a cloud sandbox, and the sandbox's outbound proxy
carries only HTTPS on port 443, which rules out cloudflared, ngrok and SSH tunnels. The static
build has no such limit: it is published as a private Artifact that frames it.

The preview is a snapshot. Every change needs a rebuild and a republish; there is no hot reload.
On a local checkout, run `pnpm --filter @vipengele/react-storybook dev` instead.

## 1 — Stage the build

From `source/react-ui`:

```bash
node scripts/storybook-preview.mjs <outDir>
```

`<outDir>` should be inside the session's scratchpad directory. The script builds every package
in dependency order with `pnpm -r` (turbo cannot spawn processes in the sandbox), builds
Storybook, and writes into `<outDir>`:

- `preview.html` — the page, a full-height iframe onto `sb/index.html`
- `sb/` — the static build
- `files.json` — the `files` list to hand the Artifact tool

The script rewrites a literal U+FFFD in bundled JS, CSS and JSON to its `�` escape, because
the Artifact publisher rejects text files that contain one. It fails if the character turns up in
any other text file.

## 2 — Publish

Read `<outDir>/files.json`, then call the `Artifact` tool with:

- `file_path`: `<outDir>/preview.html`
- `root`: `<outDir>`
- `files`: the contents of `files.json`
- first publish only: `icon: "book"` and a one-sentence `description`

Give the user the link. The artifact is private to them.

## 3 — Republish after a change

Re-run step 1 into the same `<outDir>` and publish the same `file_path` again. The URL stays the
same and the user reloads. Pass `url` when the artifact was published in an earlier conversation,
and read it first.

## Notes

- A change to a component's stories ships in the same PR as the component; see
  `ship-storybook-stories-with-every-component`.
- The Artifact frame blocks downloads and outbound requests, so stories that fetch from the
  network will not load their data in the preview.
