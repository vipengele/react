---
about: Dropdown's loadOptions is the only ui seam that consumes a scope; every other ui component forwards synchronous handlers, and @vipengele/ts 0.0.2 has no logger/tracer/metrics, so no other component has a scope consumer
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.tsx
  - source/react-ui/packages/ui/src/Card/Card.tsx
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/telemetry/package.json
  - .lydite/components.yml
---
Evidence:
- `@vipengele/ts@0.0.2` exports only Numeric, Scope, redact (+types), normalizeAttributes, VipengeleError: no logger, tracer or metrics, so a scope has nothing to carry beyond a consumer reading `Scope.current()` itself.
- ui async/closure surface: Dropdown `loadOptions` (`useAsyncOptions`, a setTimeout debounce then `load(query).then`) and ErrorBoundary `onError` (a class, `componentDidCatch`, so no hooks). Button, Toggle, Checkbox, TextField, PasswordInput, Slider, Card onClick, NumberInput onChange, Tabs/RadioGroup onChange forward sync handlers; no component awaits. Only Dropdown reads `useScope()`.
- ui declares `@vipengele/react-telemetry` as a peer (`workspace:^`) plus a devDependency (`workspace:*`); `.lydite/components.yml` lists `telemetry` in ui's `depends_on` and builds it in ui's setup because lydite has no turbo graph.
