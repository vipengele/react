---
about: "a brand-new package name in source/react-ui passes the release workflow's tag and build jobs and fails in publish until a human makes a one-time manual 0.0.0 placeholder publish and enrols the trusted publisher"
saw:
  - docs/adr/0015-a-project-is-the-unit-of-release.md
  - docs/adr/0055-vipengele-wrapper-composes-the-providers-in-its-own-package.md
  - .github/workflows/release.yml
  - source/react-ui/packages/react/package.json
---

`release.yml` discovers non-private packages with `pnpm list --recursive` and hardcodes no names, so adding a
package needs no workflow change, and it requires every package at the tag's version. npm enrols a trusted
publisher only on a name the registry already holds, so `@vipengele/react` (package.json, version shared with its
siblings) cannot publish through OIDC until the placeholder exists. The failure shows only in the `publish` job.
