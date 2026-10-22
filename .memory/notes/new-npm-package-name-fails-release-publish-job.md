---
name: new-npm-package-name-fails-release-publish-job
kind: gotcha
description: A brand-new package name in source/react-ui passes the release workflow's tag and build jobs and fails only in publish until a human makes a one-time manual 0.0.0 placeholder publish and enrols the trusted publisher.
anchors:
  - path: .github/workflows/release.yml
    blob: 5709c93e969d
  - path: source/react-ui/packages/react/package.json
    blob: ba0774123e26
  - path: docs/adr/0015-a-project-is-the-unit-of-release.md
    blob: 72c75f4b10e7
confidence: suspect
---

`release.yml` discovers non-private packages with `pnpm list --recursive --depth -1 --json | jq ... select(.private ==
false)` (`release.yml:170`, `:278`) and hardcodes no names, so adding a package needs no workflow change. Publishing is npm
trusted publishing over OIDC (`id-token: write`, `:204`; the `publish` job starts at `:194`). The explorer's claim is that
npm enrols a trusted publisher only on a name the registry already holds, so `@vipengele/react` cannot publish through OIDC
until a human has published a `0.0.0` placeholder by hand and enrolled the publisher, and that the failure shows only in the
`publish` job, after tag and build have passed. That registry behaviour is not checkable from the repo and was not
re-verified here.
