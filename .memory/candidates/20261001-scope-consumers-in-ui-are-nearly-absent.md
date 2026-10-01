---
about: almost no ui component crosses an await or runs user async code, and @vipengele/ts 0.0.2 has no logger/tracer/metrics, so applying ScopeProvider/useScope to ui has no consumer today
saw:
  - source/react-ui/packages/ui/src/Dropdown/Dropdown.tsx
  - source/react-ui/packages/ui/src/ErrorBoundary/ErrorBoundary.tsx
  - source/react-ui/packages/ui/src/Card/Card.tsx
  - source/react-ui/packages/ui/package.json
  - source/react-ui/packages/telemetry/package.json
  - source/react-ui/node_modules/.pnpm/@vipengele+ts@0.0.2/node_modules/@vipengele/ts/dist/index.d.ts
  - handoff/done/20261001-1200-react-telemetry-scope-provider.md
---
Evidence:
- `@vipengele/ts@0.0.2` `dist/index.d.ts` exports only Numeric, Scope, redact (+types), normalizeAttributes, VipengeleError. No logger, tracer or metrics. `grep -rniE "useLogger|logger|tracer"` over repo md/ts: only hit is the handoff line "a later `useLogger` lands here" (handoff/done/...scope-provider.md:29). No ADR/CONTEXT.md mentions applying scope to ui; nothing tried or rejected.
- ui async/closure surface (grep async/await/Promise/setTimeout in ui/src non-test): only Dropdown `loadOptions` (Dropdown.tsx:218; useAsyncOptions :479-545, a setTimeout debounce at :514 then `load(query).then`, via a ref `loadOptionsRef`) and ErrorBoundary `onError` (class, componentDidCatch :78-79, so no hooks). Everything else (Button, Toggle, Checkbox, TextField, PasswordInput, Slider, Card onClick, NumberInput onChange, Tabs/RadioGroup onChange) forwards sync handlers; no component awaits.
- Telemetry package is a lockstep 0.1.1 package, deps `@vipengele/ts ^0.0.2`, React 19 peers; ui does not depend on it (`ui/package.json` deps: floating-ui, react-icons workspace:*, @vipengele/ts ^0.0.2). ui already depends on @vipengele/ts so a scope import costs no new third-party dep; depending on react-telemetry would be a new workspace edge needing a lydite `depends_on` and a bundle-check marker.
