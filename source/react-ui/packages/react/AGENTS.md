# @vipengele/react

The `<Vipengele>` wrapper in the Vipengele design system: one component that mounts the theme,
locale and telemetry providers. See the root `AGENTS.md` for monorepo-wide commands and policy,
`README.md` in this directory for the consumer-facing API, and `docs/adr/0055-*.md` for the
decision.

## Commands

```bash
pnpm --filter @vipengele/react build        # tsup && tsc -p tsconfig.build.json
pnpm --filter @vipengele/react type-check
pnpm --filter @vipengele/react test         # vitest run --coverage
```

## Architecture

- `src/index.ts` is the single entry point; everything public is a plain named export, never a
  namespace barrel, which would defeat tree-shaking (`"sideEffects": false`).
- tsup bundles the JavaScript and `tsc -p tsconfig.build.json` emits the declarations.
- `src/Vipengele.tsx` nests `ThemeProvider` > `LocaleProvider` > `ScopeProvider`. `ThemeProvider`
  is outermost and renders `div.vpg-root`, the one DOM root; the other two render no element.
- Props: `VipengeleProps` extends `ThemeProviderProps`, so `theme`, `colorMode`,
  `defaultColorMode`, `onColorModeChange` and the `div` props are flat and pass to
  `ThemeProvider`. `locale?: Locale` is flat. `ScopeProvider`'s props are nested as
  `scope?: { attributes, tag, isolate }` so that `tag` and `attributes` are not read as props of
  the root element.
- Without `locale`, the component uses `Locale.default()`, called at most once and held in a ref,
  so the object is stable across renders and safe as an effect or memo dependency. A `locale`
  prop given later wins. A server render has no browser language, so a server-rendered site must
  pass `locale`.
- Dependency direction: the package depends on `@vipengele/react-tokens` and
  `@vipengele/react-telemetry` (peers, `workspace:^`) and on `@vipengele/ts`. Only the Storybook
  app depends on it. `react-tokens` cannot depend on
  `react-telemetry` (ADR-0036), which is why the wrapper has a package of its own.
- No component may require the wrapper. A component that works under `<Vipengele>` must work
  under the providers it composes, mounted individually; the wrapper adds no behaviour beyond
  composition and the locale default.

## Tests

`vitest.config.ts` has one environment, jsdom, running `src/*.test.tsx` with
`src/vitest.setup.ts`. There is no browser project.

Compare a `Locale` by its `.tag`, never with `instanceof Locale`: two resolved copies of
`@vipengele/ts` give the class two identities.

## Coverage

`vitest.config.ts` sets 100% thresholds on statements, branches, functions and lines.
A line no test can reach may take `/* v8 ignore next -- <reason> */` (or a `start -- <reason>` /
`stop` pair); nothing wider is allowed. `pnpm lint` fails a pragma without a reason and any
`file`, `if`, `else`, `try`, `catch` or whole-function form. Each pragma counts against this
package's entry in `source/react-ui/coverage-ignore-budget.json`, which starts at 0 and which CI fails a package for exceeding, so
adding one means raising that number in the same diff.
