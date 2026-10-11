---
about: the @vipengele/ts floor is now ^0.1.0, not ^0.0.2; the umbrella exports Locale
saw:
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/tokens/package.json
  - source/react-ui/pnpm-lock.yaml
  - source/react-ui/pnpm-workspace.yaml
targets: vipengele-ts-floor-is-0-0-2-because-0-0-1-was-empty
verdict: now-false
---
`ui/package.json:39` and `tokens/package.json:36` declare `"@vipengele/ts": "^0.1.0"`; lockfile `:1726,:3714` resolves `@vipengele/ts@0.1.0`. The note's `^0.0.2` claim is out of date (and tokens now also depends on it, for `Locale`). The "never lower the floor" rule is still sensible. Also `pnpm-workspace.yaml` exempts `@vipengele/*` from `minimumReleaseAge` (10080 min), so a just-published @vipengele/ts installs at once.
