# react-ui v1.0.0

The first stable release. Every package in the project moves to 1.0.0 (ADR-0015), and from here
the public API follows semver: a breaking change is a major release. A `^0.3.x` range does not
admit this release, so raise it to `^1.0.0` for every `@vipengele/react-*` package together.
Nothing breaks between 0.3.0 and 1.0.0, so upgrading is just raising the ranges.

`@vipengele/react-ui`, `@vipengele/react-tokens`, `@vipengele/react-telemetry` and the new
`@vipengele/react` depend on `@vipengele/ts` `^0.2`. The date and time components check its values
with `instanceof`, so an app that constructs `LocalDate`, `LocalTime`, `LocalDateTime` or `Locale`
values needs its own `@vipengele/ts` on a `^0.2` range that resolves to the same copy.

## `@vipengele/react` (new package)

`<Vipengele>` is one provider for the whole design system. It mounts `ThemeProvider` and
`LocaleProvider` from `@vipengele/react-tokens` and `ScopeProvider` from
`@vipengele/react-telemetry`, in that order, for its subtree:

```tsx
import { Vipengele } from "@vipengele/react";

<Vipengele theme={theme} colorMode="dark" scope={{ tag: "app" }}>
  <App />
</Vipengele>;
```

- Theme props (`theme`, `colorMode`, `defaultColorMode`, `onColorModeChange`) and `locale` are
  flat props. The scope props (`attributes`, `tag`, `isolate`) are nested under `scope`. Every
  other `div` prop lands on `div.vpg-root`, the one element it renders.
- With no `locale`, it reads `Locale.default()` once per mount. A server render has no browser
  language to read, so a server-rendered site passes `locale`.
- The providers stay usable alone, and no component requires `<Vipengele>`. Mount them
  individually for a subtree that overrides one of them
  (`docs/adr/0055-vipengele-wrapper-composes-the-providers-in-its-own-package.md`).

Install it beside its peers: `@vipengele/react-tokens`, `@vipengele/react-telemetry`, React 19 and
React DOM 19.

## `@vipengele/react-ui`

- **A clear button on text controls.** `TextField`, `Textarea` and `NumberInput` take `clearable`
  (default `false`) and `clearLabel` (default `"Clear"`). The button shows while the field holds
  text and is neither disabled nor read-only. Clearing returns focus to the field and reports
  through `onChange`: `""` from `TextField` and `Textarea`, `undefined` from `NumberInput`.
  `PasswordInput` takes neither prop. `TextField` and `Textarea` also take a typed `ref`.
- **`Dropdown` takes `clearLabel`** (default `"Clear selection"`) for its clear button. It works
  as before otherwise.
- **The date, time and date-time fields type and step the same way.** `DateTimeField` and
  `DateTimeRangeField` now type each half the way `DateField` and `TimeField` do: they add the
  separators, zero-pad finished time segments and complete the day period. ArrowUp and ArrowDown
  step the segment under the caret, and the step commits at once. A step outside `min`/`max`
  is refused, and on an empty field a step lands on today at 00:00. All four free-text fields
  apply the typing rule once an IME composition ends, not on every keystroke inside it.

`TextField` and `Textarea` always attach an `onChange` to the native element. React's
development warning for a controlled `value` passed without `onChange` therefore no longer
appears for these two components.

`@tanstack/react-table` moves to 9.3.1 and `@tanstack/react-virtual` to `^3.14.23`.

## `@vipengele/react-icons`

`lucide-react` moves to `^1.62.0`. The re-exports are unchanged.

## `@vipengele/react-tokens` and `@vipengele/react-telemetry`

No API change.

## Not in this release

`@vipengele/react-charts` is a separate project with its own tag, `react-charts@v1.0.0`, and
is not published here.
