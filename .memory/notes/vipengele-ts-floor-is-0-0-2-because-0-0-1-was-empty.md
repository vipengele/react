---
name: vipengele-ts-floor-is-0-0-2-because-0-0-1-was-empty
kind: gotcha
description: react-ui reaches Numeric through the @vipengele/ts umbrella at ^0.0.2; the umbrella at 0.0.1 shipped empty, so the floor must not be lowered and ts-core-common must not be re-added as a direct dependency.
anchors:
  - path: source/react-ui/packages/ui/package.json
    blob: 9f545d5134af
  - path: source/react-ui/pnpm-lock.yaml
    blob: 7501d1c96cb9
confidence: suspect
---

`@vipengele/react-ui`'s only `@vipengele/ts*` dependency is `"@vipengele/ts": "^0.0.2"`
(`packages/ui/package.json:39`; telemetry declares the same at `packages/telemetry/package.json:35`).
`@vipengele/ts-core-common` is not a direct dependency. `pnpm-lock.yaml` resolves
`@vipengele/ts@0.0.2` (`:3707`) and pulls `ts-core-common@0.0.2` in transitively (`:3709`).

The explorer's reason for the floor: the umbrella at `0.0.1` shipped empty, so a range that allows
it compiles against nothing and exposes no `Numeric`; `0.0.2` is the first release whose umbrella
re-exports it. Raise the floor, never lower it, and do not add `ts-core-common` back as a direct
dependency to work around a resolution problem. That `0.0.1` was empty comes from the explorer
reading the registry and is not checkable from the repo, hence `suspect`; the pinned range and
lockfile resolution above were re-read.
