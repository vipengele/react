---
about: "<Vipengele> from @vipengele/react is the one wrapper mounting ThemeProvider, LocaleProvider and ScopeProvider; VipengeleProvider stays an avoided name, and the old 'rejected - see below' pointed at the unrelated namespace-barrel paragraph"
saw:
  - CONTEXT.md
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - docs/adr/0036-non-visual-primitives-live-in-react-telemetry.md
  - docs/adr/0055-vipengele-wrapper-composes-the-providers-in-its-own-package.md
  - source/react-ui/packages/react/src/Vipengele.tsx
  - source/react-ui/packages/tokens/src/ThemeProvider.tsx
  - source/react-ui/packages/tokens/src/LocaleProvider.tsx
  - source/react-ui/packages/telemetry/src/ScopeProvider.tsx
---

The wrapper lives in its own package because react-tokens cannot depend on react-telemetry
(ADR-0036) and a charts-only consumer should not install react-ui (ADR-0055).
The CONTEXT.md avoid entry for `VipengeleProvider` now points at ADR-0055; the previous "see below" reached the
namespace-import barrel paragraph, which rejects an import style and says nothing about a component.
ADR-0025 ("Left to later decisions") deferred the wrapper as reopenable.
ADR numbers 0034 and 0046 are each duplicated in docs/adr; the telemetry ADR is 0036, and no ADR records an
umbrella-package precedent.
DOM: ThemeProvider renders the only element, `div.vpg-root` (ThemeProvider.tsx); LocaleProvider and ScopeProvider
render none, so `<Vipengele>` (Vipengele.tsx) has exactly one DOM root and div props land on it.
