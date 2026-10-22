# `<Vipengele>` composes the providers, in its own package `@vipengele/react`

An application that uses the design system mounts three providers at its root: `ThemeProvider`
and `LocaleProvider` from `@vipengele/react-tokens`, and `ScopeProvider` from
`@vipengele/react-telemetry`. Each works alone, and a consumer that wants all three writes the same
nesting every time. Decided: one component, `<Vipengele>`, mounts the three for a consumer that
wants one, and it lives in a new package, `@vipengele/react`, in `source/react-ui/packages/react`.
The individual providers stay the primitives; the wrapper is a convenience over them.

ADR-0025 left a single wrapper provider to a decision of its own, because it reopens the
`VipengeleProvider` entry in `CONTEXT.md`'s avoid list and needs a home that can depend on both
`react-tokens` and `react-telemetry`. That avoid entry reads "rejected — see below", and the nearest
paragraph below it rejects a namespace-import barrel (`import * as Vipengele from
'@vipengele/react-ui'`) for defeating tree-shaking. A barrel is an import style, not a component,
and that reasoning does not reach a wrapper; the wrapper was most likely rejected by conflation with
it. The aggregator is accepted here. The name `VipengeleProvider` stays avoided: the component is
`<Vipengele>`.

## Decision

**The package is `@vipengele/react`.** It depends on `@vipengele/react-tokens` and
`@vipengele/react-telemetry`, and `react-tokens` cannot depend on `react-telemetry` (ADR-0036), so
neither existing package can hold it without pulling in a dependency it must not have. It shares the
`react-ui` project's version (ADR-0015). A consumer that uses tokens without the component library,
such as `react-charts`, installs it without installing `@vipengele/react-ui`. The name breaks the
`react-*` prefix its siblings carry (`react-tokens`, `react-ui`, `react-telemetry`): it is the
umbrella over them rather than one concern beside them, and `@vipengele/react` is the name a
consumer reaches for first.

**`<Vipengele>` always mounts `ThemeProvider`, `LocaleProvider` and `ScopeProvider`.** The
`div.vpg-root` that `ThemeProvider` renders is the one DOM root; `LocaleProvider` and
`ScopeProvider` render no element. The wrapper adds no behaviour beyond composition other than the
locale default below. Every individual provider stays usable alone, and no component may require
the wrapper: a component that works under `<Vipengele>` works under the providers it composes.

**Props are flat where they belong to the root, nested where they do not.** `ThemeProviderProps` are
flat — `theme`, `colorMode`, `defaultColorMode`, `onColorModeChange`, and the `div` props through
rest, which land on `div.vpg-root`. `locale?: Locale` is flat. `ScopeProvider`'s props are nested as
`scope?: { attributes, tag, isolate }`, so that `tag` and `attributes` are not read as props of the
root element.

**Without a `locale`, the wrapper defaults to the browser language.** A server render has no browser
language to read, so a server-rendered site passes `locale`.

The issue proposing the wrapper cites the telemetry package as ADR-0022 and an `@vipengele/ts`
umbrella precedent as ADR-0003. In this repository the telemetry package is ADR-0036, ADR-0022 is
badge and tag, and ADR-0003 is Card's compound components; no ADR records an umbrella package, so
this decision rests on none.

## Considered options

- **A new umbrella package, `@vipengele/react`.** Chosen.
- **Inside `@vipengele/react-ui`.** Rejected: `react-ui` already peers both `react-tokens` and
  `react-telemetry`, but a consumer that uses only charts and tokens would have to install the whole
  component library to get the wrapper.
- **Inside `@vipengele/react-tokens`, without `ScopeProvider`.** Rejected: the wrapper would compose
  only what tokens holds, and the decision reopens as soon as a provider that lives outside tokens
  belongs in it — which `ScopeProvider` already is.
- **A namespace-import barrel (`import * as Vipengele from …`).** Rejected: it conflicts with the
  tree-shaking requirement (`CONTEXT.md`, flagged ambiguities), and it is an import style that
  mounts nothing.
- **No wrapper.** Rejected: every application repeats the same three-provider nesting, and the
  locale default has nowhere to live.

## Consequences

- `@vipengele/react` is a brand-new npm name. npm enrols a trusted publisher only on a name the
  registry holds (ADR-0015), so a human makes a one-time manual `0.0.0` placeholder publish with a
  token and enrols the trusted publisher before the next `react-ui@v...` tag. Without it that tag
  passes the release workflow's `tag` and `build` jobs and fails in `publish` on the new name.
- A server-rendered site that omits `locale` renders with no browser language to default to, so
  passing `locale` is part of mounting `<Vipengele>` on the server.
- Consumers that mount the providers individually are unaffected, and documentation shows both
  forms: `<Vipengele>` for an application root, the individual providers for a subtree that
  overrides one of them.
