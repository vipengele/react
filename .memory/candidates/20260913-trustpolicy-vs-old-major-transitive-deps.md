---
about: pnpm-workspace.yaml's trustPolicy:no-downgrade rejecting old-major transitive dependencies with no provenance history
saw: pnpm-workspace.yaml overrides block
---

`trustPolicy: no-downgrade` in `pnpm-workspace.yaml` rejects installing any version of a
package that carries weaker trust evidence (no npm provenance attestation) than a version of
the *same package name* already resolved elsewhere in the dependency graph — even across major
versions, and even when the low-provenance version is the only one satisfying some other
package's declared range.

This has bitten twice so far, both times because a widely-used tool depends on an old major of
a small utility whose entire old-major release line predates npm's 2023 provenance feature:

- `tsup@8.5.1`'s `chokidar: ^4.0.3` only resolves to `4.0.2`/`4.0.3`, neither of which has
  provenance, while `4.0.0`/`4.0.1` do. Fixed by pinning tsup itself to `8.3.6` (whose own
  range is `^4.0.1`) plus an explicit `overrides: { chokidar: 4.0.1 }` — pnpm's default
  "highest" resolution mode still picks the newest in-range patch even when an older one in the
  same range would satisfy the declared dependency, so the tsup downgrade alone wasn't enough.
- Every Babel 7.x package (pulled in transitively by anything using `react-docgen`, e.g.
  `@storybook/react-vite`) depends on `semver: ^6.3.1`, and no `6.x` release of `semver` has
  ever carried provenance (6.x's last release predates the provenance feature entirely). Fixed
  by `overrides: { semver: 7.8.5 }` — a deliberate cross-major pin, justified because semver's
  public API (`satisfies`/`gt`/`lt`/`valid`/`major`) is unchanged across the 6→7 boundary.

Expect this pattern to recur for any new devDependency that transitively pulls in an
old-but-still-declared major of a small utility package. The fix is almost always a targeted
`overrides` entry in `pnpm-workspace.yaml`'s `overrides` block (not a `trustPolicy` change),
pinned to a specific provenance-carrying version, with a comment explaining why.

Note: `pnpm.overrides` in a package.json's `"pnpm"` key is NOT read by this repo's pnpm version
(12.4.1) — the override must live in `pnpm-workspace.yaml` under a top-level `overrides:` key,
or pnpm silently ignores it with only a warning.
