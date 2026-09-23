---
about: source/react-ui/packages/ui/package.json
saw: adding NumberInput's dependency on the new Numeric class from vipengele/typescript
---

`@vipengele/ts` (the "batteries included" umbrella package from `vipengele/typescript`) and
`@vipengele/ts-core-common` released at the same version (`0.0.1`), but the umbrella package
ships intentionally empty — it carries no dependency on `ts-core-common` yet. Depending on
`@vipengele/ts` to reach `Numeric` (or any other `ts-core-common` export) compiles cleanly and
exposes nothing; the umbrella package's own `package.json` has no `ts-core-common` dependency at
that version.

A consumer needs `@vipengele/ts-core-common` as a direct dependency
(`source/react-ui/packages/ui/package.json`'s `dependencies`), imported from its subpath export
(e.g. `@vipengele/ts-core-common/types/numeric`), until `vipengele/typescript` wires the umbrella
package to depend on `ts-core-common` in a later release. Check that package's own `package.json`
dependencies before assuming the umbrella package re-exports anything from it.
