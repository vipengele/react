# Non-visual React primitives live in `react-telemetry`, not `react-ui`

`ScopeProvider` and `useScope` carry a `@vipengele/ts` scope through the React tree. They render
no markup and read no theme token, so they have nothing to do with the components in
`@vipengele/react-ui`, and the packages that own them should not drag a design system along. We
put them in their own package, `@vipengele/react-telemetry`, named for the concern (telemetry
context in React) rather than for any one primitive, so the next non-visual primitive of the same
kind lands beside them.

Three alternatives were rejected. Putting them inside `react-ui` makes every consumer that only
wants scope propagation install the component library, its stylesheet machinery and its peer
dependencies, and ties the primitive's release to UI changes. Starting a new project for them
(ADR-0015) is more machinery than a package that shares the `react-ui` version, toolchain and
Storybook needs. Naming the package for the single primitive (`react-scope`) would leave no home
for a second telemetry primitive and force another package, or a rename, when one arrives.
