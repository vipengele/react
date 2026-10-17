---
about: "no record anywhere explains why VipengeleProvider was rejected; ADR-0025 defers a wrapper provider, and LocaleProvider/ScopeProvider render no DOM while ThemeProvider renders the only root div"
saw:
  - CONTEXT.md
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - docs/adr/0036-non-visual-primitives-live-in-react-telemetry.md
  - docs/adr/0054-consumers-alias-their-semantic-names-onto-vpg-tokens.md
  - source/react-ui/packages/tokens/src/ThemeProvider.tsx
  - source/react-ui/packages/tokens/src/LocaleProvider.tsx
  - source/react-ui/packages/telemetry/src/ScopeProvider.tsx
---

Searched CONTEXT.md, docs/adr, git log (-S VipengeleProvider, --grep), memory: `rg -i 'VipengeleProvider|umbrella|aggregator'`.
CONTEXT.md:38 says "rejected - see below" but nothing below explains it; no ADR or commit does either
(the only git hit, 035f885, is unrelated). The reason is unrecorded; the name's origin is hatua's HatuaProvider (ADR-0001).
ADR-0025:148-154 ("Left to later decisions") says a wrapper `<Vipengele theme locale>` "reopens the
`VipengeleProvider` entry in CONTEXT.md's avoid list" and needs a home depending on both react-tokens and react-telemetry.
ADR-0025:143-146 rejects LocaleProvider in react-telemetry/react-ui/new package.
ADR numbering: 0034 and 0046 are each duplicated; next free is 0055. Telemetry ADR is 0036 (not 0022); no umbrella-package ADR exists.
DOM: ThemeProvider renders `div.vpg-root` with data-vpg-mode and inline vars (ThemeProvider.tsx:62-76); LocaleProvider (LocaleProvider.tsx:15-17) and ScopeProvider (ScopeProvider.tsx:55) render no element.
