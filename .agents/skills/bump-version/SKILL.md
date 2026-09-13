---
name: bump-version
description: |
  Use this skill when the user asks to cut/release/bump/publish a new version
  of a tandiko-design package (e.g. "release the brand package", "cut a new
  version", "publish @tandiko/brand"). Covers adding changesets, the
  release-prep PR (`changeset version`), tagging after it merges (which fires
  .github/workflows/release.yml → GitHub Packages), and verifying the publish.
---

# Release tandiko-design packages

Every package under `packages/` is versioned independently with
**Changesets** and published to **GitHub Packages** under the `@tandiko`
scope. Publishing is **tag-gated**: merging to `main` never publishes. The
only trigger is pushing a per-package tag matching `@tandiko/*@*`, which
fires `.github/workflows/release.yml`.

A release is always three steps, in this order, and each is its own gate:

1. **Changesets** land on `main` with the changes they describe.
2. A **release-prep PR** runs `changeset version` (bumps + CHANGELOGs) and is
   merged.
3. **Tags** for the new versions are pushed from that merged commit.

Never collapse them — in particular never tag a commit whose `package.json`
versions were not bumped by a merged release-prep PR.

## 0. Preconditions

- You are in the `gt` bare-repo layout; `gh`/`git` authenticate as the user
  in the root `.envrc` (`gh auth token --user <username>`). Read that user
  before any `gh`/push command.
- The changes to release are **already merged to `main`**, and `main`'s CI
  (`ci-gate`) is green. This skill does not merge feature PRs.
- `git fetch origin --tags` so local tags and `origin/main` are current.

## 1. Find what is pending

```bash
ls .changeset/*.md 2>/dev/null | grep -v README    # pending changesets on main
pnpm changeset status --verbose                    # what each would bump
git tag --list '@tandiko/*' --sort=-creatordate | head
```

For each package, compare against its last tag:

```bash
git log --oneline "@tandiko/brand@$(node -p "require('./packages/brand/package.json').version")"..origin/main -- packages/brand
```

(The first release of a package has no tag yet — read the whole path history.)

If a change that should ship has **no changeset**, add one on a branch and
merge it before continuing (`pnpm changeset`, or write
`.changeset/<slug>.md` by hand):

```md
---
"@tandiko/brand": minor
---

Add the app-icon tile.
```

## 2. Pick the bump

SemVer, by the **highest-impact change to what the package ships** since its
last release. For `@tandiko/brand` the shipped surface is the `exports` map
(`svg/*`, `svg-src/*`, `fonts/*`, `guide.html`, `guide.css`) and the
`tandiko-brand-png` bin:

- **patch** — visual corrections that keep every file name and the
  coordinate space (a path fix, a colour correction mandated by the guide,
  guide copy edits).
- **minor** — additive: new variants/files, new exports, new bin options.
- **major** — breaking: a file renamed or removed, a changed `viewBox` or
  coordinate space (consumers' layouts shift), a removed export or bin, a
  rebrand of the mark.

Repo-only changes (CI, README at the root, agent config) do **not** warrant a
release and should not carry a changeset.

## 3. Release-prep PR

On a fresh `chore` worktree off `origin/main`:

```bash
pnpm install --frozen-lockfile
pnpm changeset version        # consumes .changeset/*.md, bumps versions, writes CHANGELOG.md
pnpm install                  # refresh pnpm-lock.yaml if internal ranges moved
pnpm build                    # dist must still build from the bumped tree
git status                    # only package.json / CHANGELOG.md / .changeset / pnpm-lock.yaml
```

If `pnpm --filter @tandiko/brand build` changed anything under
`assets/dist/`, stop: dist was stale on `main`, which is a bug to fix in its
own PR first, not something to ship inside a version bump.

Commit as `chore(release): version packages — @tandiko/brand X.Y.Z` (list
every bumped package) and open the PR. Its description must include a
**Merge Commit Message** section with that same subject. Do not merge it
unless told to.

## 4. Tag and push (after the release-prep PR is merged)

```bash
git fetch origin --tags
git switch --detach origin/main
git log -1 --oneline          # must be the merged release-prep commit
pnpm install --frozen-lockfile
pnpm changeset tag            # creates @tandiko/<pkg>@<version> for versions without a tag
git push origin --tags        # or push each new tag explicitly
```

`changeset tag` only creates tags that do not exist yet, so it is safe to
re-run. Pushing fires one `Release` run per tag; they are serialized, and
the first publishes **every** pending version, so later runs no-op.

## 5. Verify

```bash
gh run list --workflow release.yml --limit 5
gh run watch "$(gh run list --workflow release.yml --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
gh api /orgs/tandiko/packages/npm/brand/versions --jq '.[].name' | head
```

The new version must appear in the package's version list. A green run where
the version is missing means `pnpm -r publish` found it already published
and skipped it — check that the tag really points at the bumped commit.

Finally, report back: each package and version published, the tag(s) pushed,
and the release run URL.
