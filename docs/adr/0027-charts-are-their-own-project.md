# Charts are their own project, `source/react-charts`, with Recharts as an internal detail

`@vipengele/react-charts` lives in `source/react-charts/`, a project of its own (ADR-0015): its own
pnpm workspace, lockfile, `turbo.json`, `tsconfig.base.json` and Biome config, released by a tag
`react-charts@vX.Y.Z`. Charts version independently of the component library, and ADR-0015
versions every package of a project together, so a package inside `source/react-ui/` would tie
every chart release to a `react-ui` release and the reverse.

ADR `0022-non-visual-primitives-live-in-react-telemetry` reaches the opposite answer for
`react-telemetry`: a new project is "more machinery than a package that shares the `react-ui`
version, toolchain and Storybook needs". That holds when the package has no reason to version
apart from `react-ui`. Charts do, and independent versioning is
the one reason for the separate project; the machinery that ADR weighs is the price of it.

## Running cost

`react-charts` consumes `@vipengele/react-tokens` as a published range (`^0.2.0`), never
`workspace:*`, because a cross-project dependency is an ordinary published range (ADR-0015). A chart
type that needs a new token role therefore costs two releases: `react-tokens` in `react-ui` first,
then a range bump in `react-charts`. `@vipengele/*` is exempt from `minimumReleaseAge`
(`minimumReleaseAgeExclude`), so the second release does not wait out the age gate. The series
roles `--vpg-chart-1..6` exist in `react-tokens`
(ADR `0030-chart-series-colours-rotate-hue-from-the-accent`) and charts read them bare.

## Library

Recharts 3.10.1, as an internal detail behind props the package owns. No Recharts type, element,
prop or event crosses the public API: `LineChart` and `AreaChart` are the only exports, and the
container they render inside is internal. The library can therefore be replaced without a breaking
release. The DOM below the `.vpg-chart-*` classes, `recharts-*` classes included, is explicitly not
part of the contract.

`packages/charts/api-check/run.mjs` enforces it. It asserts the exact runtime export set of
`dist/index.js`, that each export's `dist/<Name>/<Name>.d.ts` is reachable from `dist/index.d.ts`,
and that no reachable declaration file names Recharts or the container. Changing the public surface
means changing that list in the same change.

`react-is` is a regular dependency of the package, not a peer. It is Recharts' peer, and declaring
it as a peer of ours would make every consumer install a package they never import.

Why Recharts underneath:

- It renders SVG, so `var(--vpg-*)` flows through to marks and axes and a chart themes like any
  other component (ADR-0001). A canvas renderer, which is ECharts' default, would have to read
  resolved values back with `getComputedStyle`, the JS read ADR-0001 defers until a real case
  needs it.
- It passes the supply-chain gates in `source/react-charts/pnpm-workspace.yaml`
  (`minimumReleaseAge`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`) and takes React 19 as a
  peer.

Rejected:

- Exposing the container, or accepting Recharts elements and props as children or props of the
  chart components (the original shape). Consumers would write Recharts into their code, and a
  later swap of the library would break every one of them.
- visx, whose SVG primitives are low-level, so each chart is more assembly work and there is no
  container or theming surface of its own.
- ECharts, for the canvas default above.

## Bundle cost

`packages/charts/bundle-check/run.mjs` bundles a downstream consumer with Recharts bundled, not
external, and asserts what lands in the output.

- A consumer that imports `LineChart` only gets a bundle of 999,266 bytes unminified: the chart's
  own code, the container, Recharts' `ResponsiveContainer`, `Line`, the Redux store, immer and d3.
  It carries no `Area`, no `ReferenceLine` and no other chart type.
- A consumer that imports `AreaChart` only gets 1,014,652 bytes: the same, with `Area` and
  `ReferenceLine` in place of `Line`. It carries no `Line` and no other chart type.
- A control that imports every chart type measures 1,356,618 bytes.
- The first chart type carries the store and d3, and tree-shaking drops the chart types a consumer
  does not import.

Each check asserts `vpg-chart-container`, `recharts-responsive-container`, its own chart type's
markers and the store, immer and d3 markers present, and the markers of every other chart type
(Line or Area as the case may be, Bar, Scatter, Pie, Radar, RadialBar, Funnel, Treemap, Sankey,
Sunburst) absent, `ReferenceLine` from the `LineChart` bundle included. The all-charts control must
carry every marker asserted absent anywhere, so an absence assertion cannot pass because a marker
was renamed. No `treeshake.moduleSideEffects` rule is needed, because nothing asserts an external
absent.

A consumer's first chart costs roughly a megabyte unminified, and a thin wrapper cannot hide
Recharts' cost.

## Consequences

Before the first `react-charts@v...` tag a human makes a one-time manual placeholder publish of
`@vipengele/react-charts` with a token, because npm enrols a trusted publisher only on a name the
registry holds, and writes `docs/release-notes/react-charts@v0.1.0.md`, which the release workflow
requires. No `react-charts@v...` release may be cut before that publish and the trusted-publisher
enrolment are done. The project's Storybook is `private`, because the release workflow requires
every non-private package's version to equal the tag.
