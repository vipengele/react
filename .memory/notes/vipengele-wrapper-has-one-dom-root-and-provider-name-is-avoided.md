---
name: vipengele-wrapper-has-one-dom-root-and-provider-name-is-avoided
kind: rationale
description: <Vipengele> from @vipengele/react is the one wrapper mounting ThemeProvider, LocaleProvider and ScopeProvider; it has exactly one DOM root (div.vpg-root from ThemeProvider), and VipengeleProvider stays an avoided name.
anchors:
  - path: CONTEXT.md
    blob: d3d9a7b8173a
  - path: docs/adr/0055-vipengele-wrapper-composes-the-providers-in-its-own-package.md
    blob: f590714485a2
  - path: source/react-ui/packages/react/src/Vipengele.tsx
    blob: 5656b02e16ea
  - path: source/react-ui/packages/tokens/src/ThemeProvider.tsx
    blob: 3b5e833d319c
confidence: suspect
---

The wrapper lives in its own package because react-tokens cannot depend on react-telemetry (ADR-0036) and a charts-only
consumer should not install react-ui (ADR-0055). `CONTEXT.md:38,46` lists `VipengeleProvider` as an avoided name and
points at ADR-0055; an earlier "rejected - see below" pointed at the unrelated namespace-import barrel paragraph.
ADR-0025 ("Left to later decisions") deferred the wrapper as reopenable. ADR numbers 0034 and 0046 are each duplicated in
`docs/adr` (explorer report).

DOM: `ThemeProvider` renders the only element, `div.vpg-root` (`ThemeProvider.tsx:71`); LocaleProvider and ScopeProvider
render none (explorer report, not re-read), so `<Vipengele>` has exactly one DOM root and div props land on it.
