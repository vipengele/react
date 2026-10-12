---
about: two things the date ADRs and the installed @vipengele/ts 0.1.0 disagree on - locale-aware tryParse/format on LocalDate, and the ADR numbering (NumberInput is 0035, not 0020) - plus where the narrow-viewport hook lives
saw:
  - docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md
  - docs/adr/0045-sidenav-owns-its-responsive-switch.md
  - docs/adr/0035-numberinput-owns-spinbutton-semantics-and-locale-parsing.md
  - docs/adr/0047-coverage-stays-at-100-percent-with-reasoned-ignores.md
  - source/react-ui/node_modules/.pnpm/@vipengele+ts-core-common@0.1.0/node_modules/@vipengele/ts-core-common/dist/types/date-time/local-date.d.ts
  - source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
  - source/react-ui/packages/ui/src/Calendar/Calendar.tsx
  - source/react-ui/packages/tokens/src/color-mode.ts
---
1. ADR-0025 (`docs/adr/0025-date-and-time-are-zoneless-local-values-from-ts.md:46-47`) says "locale-aware `tryParse` and `format` on each
   type, in the shape of `Numeric.tryParse`". The installed `@vipengele/ts` 0.1.0 (`local-date.d.ts`) differs: `LocalDate.tryParse(str)` /
   `parse(str)` are ISO `YYYY-MM-DD` only (the d.ts says a locale-aware reader under that name "would make `parse(str)` read the runtime's
   locale"). The locale-aware readers are `LocalDate.parseLocalized(str, locale?)` and `tryParseLocalized(str, locale?)`, returning
   `{ success, value? }`. Year must be four digits, month/day 1-2 digits, bidi marks and surrounding whitespace ignored. `format(locale?)` and
   `segments(locale?)` are locale-aware. `segments` returns `DateSegment[]` = `{ type: "year"|"month"|"day"|"literal", value: string }`, padded digits,
   no empty literals, values joined equal `format()`. `tryParse` for `NumberInput` is `Numeric.tryParse(draft, locale).value` (`NumberInput.tsx:259`).
2. ADR numbers: NumberInput's decision is ADR-0035. ADR-0020 is ErrorBoundary/StatePanel. ADR-0025 is the date one (there is also a
   different "0025" mention in the tokens locale notes, which is this same ADR).
3. The narrow-viewport hook is `useMediaQuery` in `source/react-ui/packages/ui/src/internal/useMediaQuery.ts` with the breakpoint constants
   `NARROW_VIEWPORT_REM` / `NARROW_VIEWPORT_QUERY` beside it (a constant, not a token: a media query cannot read a custom property;
   `docs/adr/0045-sidenav-owns-its-responsive-switch.md` records this). Only `DateField` reads it; `SideNav` does not yet
   (`grep -rn useMediaQuery source/react-ui/packages/ui/src`). Its server snapshot is `false`, so SSR and first paint are the wide layout.
4. ADR-0047 (reasoned `v8 ignore` with a budget) is accepted, but its enforcement "ships separately; until it lands, no ignore may be added"
   and `grep -rn "v8 ignore" source` still finds none, so for DateField the 100% gate means no pragmas (note
   coverage-is-100-percent-with-no-ignore-pragmas still holds, with this ADR as the future relaxation).
