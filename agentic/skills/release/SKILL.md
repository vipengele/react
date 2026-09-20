---
name: release
description: >-
  Use this skill when the user asks to release, publish, cut or tag a version of
  a project in this repo (e.g. "release react-ui", "cut 0.2.0", "publish the
  component library"). Covers choosing the version, writing the release notes,
  tagging, and verifying what the release workflow published to npm and to the
  Pages site.
---

# Release a project

A release is one tag: `<project>@vX.Y.Z`. It publishes **every non-private package** in
`source/<project>` at that version, creates the GitHub Release, and — once the release
workflow succeeds — rebuilds the Pages site so every project is shown at its latest release
(ADR-0015).

There is no changesets and no release-please. The tag is the only input, and a human pushes it.

## Before you start

Check the repo's git rules: establish the `gt` bare layout and read the GitHub user from the
root `.envrc` before any `gh` call. Never merge a PR yourself.

## 1 — Decide the version

Every package in the project moves to the same version, because internal dependencies are
`workspace:*` and pnpm packs those as exact pins. Publishing one package alone strands the
consumers of the others.

Read `git log` since the last `<project>@v*` tag and pick the bump from the Conventional Commit
types: a `!` or `BREAKING CHANGE` is major, `feat` is minor, anything else is patch. While a
project is pre-1.0, a breaking change is a minor bump.

## 2 — Set the version in every manifest

```bash
cd source/<project>
# Every publishable package, plus the project's own package.json if it carries a version.
pnpm -r exec npm version <version> --no-git-tag-version
```

The release workflow refuses a tag whose version not every publishable manifest carries, so
this and the tag have to agree exactly.

## 3 — Write the release notes

`docs/release-notes/<project>@vX.Y.Z.md`, at the repo root. **The workflow fails without it**,
before it publishes anything, because the GitHub Release body is a file a human wrote and
reviewed.

Say what changed and what a consumer has to do about it. A breaking change names the old and
new spelling; "various fixes" is not release notes.

## 4 — Open it as a pull request, and merge it

The version bump and the notes are an ordinary change: `build(<project>): <version>` as the
subject. Nothing publishes on merge.

## 5 — Tag the merged commit

```bash
git fetch origin
git tag <project>@v<version> origin/main
git push origin <project>@v<version>
```

The tag must point at the merged commit, not at the branch.

## 6 — Watch it

```bash
gh run list --workflow release --limit 3
gh run watch <run-id>
```

The workflow's jobs are `tag` (validates the tag and the notes), `build` (no credentials) and
`publish` (npm trusted publishing with provenance). A publish is idempotent: it probes the
registry per package and publishes only what is absent, so a re-run finishes a partial release
rather than failing on what already landed.

Then `pages-deploy` runs on the release's success and rebuilds the site from every project's
latest tag.

## 7 — Verify

```bash
npm view @vipengele/<package> version
gh release view <project>@v<version>
```

The Pages site is `https://vipengele.github.io/react/<project>/`.

## When a package name is new

npm can only enrol a trusted publisher on a name the registry already holds, so a brand-new
package name has to be created by a one-time manual publish with a token before the workflow
can ever publish it. That is a deliberate, irreversible act — a published name and version
cannot be reused — so ask the user to run it, and do not publish on their behalf without them
saying so explicitly in that moment.

After the name exists, the user enrols the trusted publisher on npm against this repository,
the `release.yml` workflow file and the `npm-release` environment.
