---
about: success/warning/danger/info status families already exist in tokens; a tone prop with glyph needs no tokens release
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/base-stylesheet.ts
  - source/react-ui/packages/ui/src/Toast/ToastRegion.tsx
  - source/react-ui/packages/ui/src/Toast/Toast.stylesheet.ts
  - docs/adr/0033-status-colours-extend-beyond-danger.md
  - CONTEXT.md
---
ADR-0033 + theme.ts:184-256: `--vpg-{danger,success,warning,info}` with -light/-dark seeds and
-hover/-press/-wash/-ring/-contrast/-visited; base names are stylesheet-owned (base-stylesheet.ts:66-67).
CONTEXT.md "Status colour" reserves the vocabulary: danger/success/warning/info, avoid "semantic
colour"/"error". No `pass`/`fail` names exist; ToastTone = neutral|success|warning|info|danger
(Toast/toaster.ts:2); Badge = neutral|accent|danger. ADR-0033 says a component gaining success/warning
tones does so in its own change with its own stories. Warning caveat: `--vpg-warning` alone lacks
contrast as text/border/glyph on a light surface (ADR-0033, Toast.stylesheet.ts:17-19); Toast puts
glyph on a filled disc using `-contrast`. Toast status glyphs: Check/AlertCircle/Info from
@vipengele/react-icons (ToastRegion.tsx:1,30-36), so ui->icons dependency is established
(package.json dependencies workspace:*; also Tag, Avatar). No `pass|fail` precedent: a tone named
pass/fail would diverge from success/danger.
Also: new ui component needs an entry in bundle-check/run.mjs (rule update-bundle-check-with-every-component),
index.ts export, and api-check list possibly.
