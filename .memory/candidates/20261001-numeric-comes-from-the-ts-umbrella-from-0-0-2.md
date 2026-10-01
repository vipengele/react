---
about: source/react-ui/packages/ui/package.json
saw:
  - source/react-ui/packages/ui/package.json
  - source/react-ui/pnpm-lock.yaml
  - source/react-ui/packages/ui/AGENTS.md
---

`@vipengele/react-ui` reaches `Numeric` through the umbrella package: its only `@vipengele/ts*`
dependency is `"@vipengele/ts": "^0.0.2"` (`ui/package.json`), and `@vipengele/ts-core-common` is
not a direct dependency. `pnpm-lock.yaml` resolves `@vipengele/ts@0.0.2` and pulls
`ts-core-common@0.0.2` and `ts-core-redaction@0.0.2` in transitively.

The floor matters: the umbrella at `0.0.1` shipped empty, so a range that allows it compiles
against nothing and exposes no `Numeric`. `0.0.2` is the first release whose umbrella re-exports
it. Raise the floor, never lower it, and do not add `ts-core-common` back as a direct dependency
to work around a resolution problem. `ui/AGENTS.md` names `@vipengele/ts` as one of the package's
runtime dependencies alongside `@floating-ui/react`.
