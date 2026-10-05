# Charts are their own project, `source/react-charts`, built on Recharts

`@vipengele/react-charts` lives in `source/react-charts/`, a project of its own (ADR-0015): its own
pnpm workspace, lockfile, `turbo.json`, `tsconfig.base.json` and Biome config, released by a tag
`react-charts@vX.Y.Z`. Charts version independently of the component library, and ADR-0015
versions every package of a project together, so a package inside `source/react-ui/` would tie
every chart release to a `react-ui` release and the reverse.

ADR-0022 reaches the opposite answer for `react-telemetry`: a new project is "more machinery than a
package that shares the `react-ui` version, toolchain and Storybook needs". That holds when the
package has no reason to version apart from `react-ui`. Charts do, and independent versioning is
the one reason for the separate project; the machinery ADR-0022 weighs is the price of it.

## Running cost

`react-charts` consumes `@vipengele/react-tokens` as a published range (`^0.1.1`), never
`workspace:*`, because a cross-project dependency is an ordinary published range (ADR-0015). A chart
type that needs a new token role therefore costs two releases: `react-tokens` in `react-ui` first,
then a range bump in `react-charts`. `@vipengele/*` is exempt from `minimumReleaseAge`
(`minimumReleaseAgeExclude`), so the second release does not wait out the age gate. Series and
categorical colours are deferred for exactly this reason: they need new roles in `react-tokens`.

## Library

Recharts 3.10.1.

- It renders SVG, so `var(--vpg-*)` flows through to marks and axes and a chart themes like any
  other component (ADR-0001). A canvas renderer, which is ECharts' default, would have to read
  resolved values back with `getComputedStyle`, the JS read ADR-0001 defers until a real case
  needs it.
- It passes the supply-chain gates in `source/react-charts/pnpm-workspace.yaml`
  (`minimumReleaseAge`, `trustPolicy: no-downgrade`, `blockExoticSubdeps`) and takes React 19 as a
  peer. It declares `react-is` as a peer, so the package declares it too.

Rejected: visx, whose SVG primitives are low-level, so each chart is more assembly work and there
is no container or theming surface of its own; and ECharts, for the canvas default above.

## Bundle cost

`packages/charts/bundle-check/run.mjs` bundles a downstream consumer with Recharts bundled, not
external, and asserts what lands in the output.

- A consumer importing only `ThemedChartContainer` is about 23 KB unminified (22,905 bytes): clsx,
  Recharts' `ResponsiveContainer` and its utils, es-toolkit `debounce`/`throttle`, and the
  package's `dist`. There is no Recharts chart type, no Redux store, no immer and no d3
  (`victory-vendor`).
- Importing one chart type pulls the store and d3 in. Single-chart bundles measure roughly
  590-745 KB, for example `PieChart` about 763 KB with the container, `LineChart` about 761 KB and
  `Treemap` about 676 KB. Every chart type together is about 1.17 MB.

Recharts 3's store therefore arrives with the chart components, not with `ResponsiveContainer`, and
tree-shaking drops chart types a consumer does not import.

The check asserts `vpg-chart-container` and `recharts-responsive-container` present, and absent the
class-name markers of the Line, Area, Bar, Scatter, Pie, Radar, RadialBar, Funnel, Treemap, Sankey
and Sunburst charts plus `recharts-wrapper`, `@@redux/INIT`, `[Immer]` and `invalid format: `. A
positive control bundles every one of those chart types and must carry every marker, so an absence
assertion cannot pass because a marker was renamed. No `treeshake.moduleSideEffects` rule is
needed, because nothing asserts an external absent.

A consumer pays about 0.6-0.75 MB unminified for its first chart type, and a thin wrapper cannot
hide Recharts' cost.

## Consequences

Before the first `react-charts@v...` tag a human makes a one-time manual placeholder publish of
`@vipengele/react-charts` with a token, because npm enrols a trusted publisher only on a name the
registry holds, and writes `docs/release-notes/react-charts@v0.1.0.md`, which the release workflow
requires. The project's Storybook is `private`, because the release workflow requires every
non-private package's version to equal the tag.
