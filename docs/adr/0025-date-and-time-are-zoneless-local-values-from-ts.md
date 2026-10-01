---
status: proposed
---

# Date and time are zoneless local values from `@vipengele/ts`

Wave 4 builds `Calendar`, `DateField`, `TimeField`, `DatePicker`, `DateTimePicker` and range
variants of each. Every one of them exchanges a date or a time with a consumer, reads a locale, and
shows a month grid, so the type of that exchange, where the calendar arithmetic lives and where the
locale comes from fix the whole wave. Decided: the components are custom controls that accept and
emit only **local values**, the date model lives in `@vipengele/ts`, and the locale is a value a
component reads from its prop, else a provider, else the runtime.

## Decision

**The controls are custom on every platform.** `Calendar` is a month grid this package draws and
`DateField` is a segmented text control that edits day, month and year (or hour and minute) one
segment at a time. `DatePicker` is a `DateField` plus a `Calendar` in a `Popover`, and a `Dialog` on
small viewports. There is no native `<input type="date">` path, mobile included. The overlay rules
of ADR-0024 apply unchanged: the calendar portals through `useOverlayRoot` and dismisses through the
`FloatingTree`.

**The value is a local value.** A date component's value is a `LocalDate`, a time component's a
`LocalTime`, and a date-time component's a `LocalDateTime`, all from `@vipengele/ts`: immutable
readings with no time zone, as in `java.time`.

```ts
value?: LocalDate;
defaultValue?: LocalDate;
onChange?: (value: LocalDate | undefined) => void;
```

A range is `{ start, end }` of the same type. An empty field is `undefined`. As in ADR-0020,
`onChange` fires on **commit** only, the visible control carries no `name`, and a sibling
`<input type="hidden">` carries the caller's `name` and the canonical ISO 8601 string
(`2026-10-01`, `14:30`, `14:30:15`, `2026-10-01T14:30`), so a server never parses a
locale-formatted string. A controlled update does not overwrite an edit in progress.

**The model lives in `@vipengele/ts`.** `react-ui` carries no date arithmetic and no date library.
The surface it requires of `@vipengele/ts`:

- the three local types, with validated construction that rejects an impossible date rather than
  rolling it over;
- compare, plus and minus days and months (the day clamps at month end), day of week and length of
  month, which is everything a month grid needs;
- ISO 8601 parse and format, and locale-aware `tryParse` and `format` on each type, in the shape of
  `Numeric.tryParse` and `Numeric.format`, including the segment order of a locale's date pattern;
- `now()` on each type, read in the system default zone;
- a `Locale` carrying the first day of the week, the 12/24-hour preference, and month and weekday
  names.

The design of that API belongs to `@vipengele/ts`; this ADR fixes only what the components need.
The work is tracked as vipengele/typescript#87.

**Time zones stay out of the UI.** A component never imports a zoned type and takes no `timeZone`
prop. The one place a zone is consulted is `now()`, which the today marker and the default visible
month use, and it reads the system default zone inside `@vipengele/ts`. A local value becomes an
instant only when a consumer pairs it with a zone through `ZoneId`, `ZonedDateTime` and `Instant`
in `@vipengele/ts` (vipengele/typescript#88), where a daylight-saving gap or overlap is resolved at
the single `atZone` conversion. A component holds no instant, so none of these cases can arise
inside one.

**Only the local types gate Wave 4.** `react-ui` needs `LocalDate`, `LocalTime`, `LocalDateTime`,
`Locale` and `now()`. The zoned types ship in `@vipengele/ts` on their own schedule, and Wave 4
starts once a release containing the local types is published and `@vipengele/react-ui` raises its
`@vipengele/ts` range to it.

**The locale is a value, resolved prop first.** A component reads its `Locale` from its `locale`
prop, else the nearest `LocaleProvider`, else the runtime's own default from `@vipengele/ts`. A set
prop wins outright and nothing blends the three. `LocaleProvider` is optional and lives in
`@vipengele/react-tokens`, which `react-ui` already takes as a peer and which already owns the root
scope. It carries the `Locale` by React context, which follows the component tree through the
portals of ADR-0024, so an overlay portaled out of the provider's DOM subtree still reads it. A
locale cannot be expressed as a CSS custom property, which is why this is a context where
`ThemeProvider` (ADR-0001) is not.

The first day of the week comes from the `Locale`. Where the engine offers no week information,
`@vipengele/ts` falls back to Monday, per ISO 8601. `Calendar`, `DateField` and `TimeField` have no
separate `firstDayOfWeek` or `hourCycle` prop: both follow the `Locale`, and one control does not
disagree with the rest of the application.

**`NumberInput` follows.** The no-`locale`-prop rule and the module-scope capture of the runtime
locale in ADR-0020 do not survive this decision: `NumberInput` reads the same `Locale` by the same
resolution order, and `Numeric.tryParse` and `Numeric.format` accept it. That is a change to
`NumberInput` tracked separately. The rest of ADR-0020 stands, and the date controls follow its
commit-only, hidden-input shape.

## Bundle cost

`react-ui` adds no date dependency, so its bundle-check has nothing new to measure beyond the
components themselves. The check asserts stylesheet markers and records the bundle's size without a
byte budget, and this decision invents none. Each date component adds its own stylesheet marker to
`bundle-check/run.mjs` in the change that ships it, and a bundle that requests one component must
not contain the others.

## Considered options

- **Native `<input type="date">`, on mobile only or everywhere.** Rejected for the reasons
  ADR-0020 rejected `type="number"`: it parses and displays against the page's locale rather than
  the user's, its picker cannot be styled from `--vpg-*` tokens, and its first day of the week is
  not controllable. It also behaves differently across engines, and iOS shows a wheel where
  desktop Chromium shows a grid. A native fallback on mobile would mean two behaviours to test and
  document, and a consumer's `onChange` contract that depends on the device. The cost of the
  decision is the segmented `DateField`, the largest single piece of the wave.
- **ISO strings as the component value.** Rejected: it gives every consumer a string to validate and
  re-parse in order to do anything with it, and leaves the typed model to a later, breaking change.
  The ISO string remains the form the hidden input submits.
- **A `Date` as the component value.** Rejected: a `Date` is an instant, and a birthday or a due
  date is not one. `new Date("2026-10-01")` parses as UTC and renders as 30 September in a zone
  west of it, so a type that carries a zone is wrong for a value that has none.
- **`Temporal`.** Rejected: it is not in the ES2022 library types this repository compiles
  against, it needs a polyfill in engines that lack it, and a polyfill is a dependency every
  consumer pays for.
- **A third-party date library (`date-fns`, `dayjs` and the like) in `react-ui`.** Rejected: it
  would put a date library inside the bundle this package polices, make the library's types part of
  the public contract, and duplicate the locale-aware parsing `@vipengele/ts` already provides for
  numbers. The package's dependency policy (`minimumReleaseAge`, `trustPolicy: no-downgrade`) also
  means a release without provenance can stop an install.
- **Calendar arithmetic in `react-ui`, with `@vipengele/ts` supplying only the types.** Rejected:
  `DateField`, `TimeField`, the range variants and `Calendar` all need the same arithmetic, and a
  type with no operations pushes every consumer to write its own.
- **A `timeZone` prop on the components.** Rejected for the reason ADR-0020 rejected a `locale`
  prop: it fixes the zone of one control while everything around it follows the runtime, and it
  makes a component hold an instant. A product that schedules in a venue's zone converts at the
  boundary with `ZoneId`.
- **A `locale` prop and nothing else, or a provider and nothing else.** A prop alone repeats the
  value on every component and invites a form whose fields disagree. A provider alone gives a
  component with a deliberate exception, such as a locale picker's preview, no way to say so
  without a nested provider.
- **A mutable global default locale in `@vipengele/ts`.** Rejected: changing it re-renders nothing,
  it tears under concurrent rendering, and in server rendering it leaks from one request to the
  next.
- **`firstDayOfWeek` and `hourCycle` props.** Rejected for now: week start and hour cycle are
  locale conventions, and an override per component is the inconsistency a shared `Locale` removes.
  A product that needs a Monday-first calendar in a Sunday-first locale passes a `Locale` that says
  so.
- **`LocaleProvider` in `@vipengele/react-telemetry`, in `react-ui`, or in a new package.**
  `react-telemetry` is named for telemetry (ADR-0022) and a locale is not telemetry. `react-ui`
  would make a consumer that wants only locale propagation install the component library. A new
  package adds a release surface and a peer dependency for one small context.

## Left to later decisions

- **A single wrapper provider**, `<Vipengele theme locale …>`, that mounts the individual providers
  for a consumer that wants one. It is not needed by any date component. It reopens the
  `VipengeleProvider` entry in `CONTEXT.md`'s avoid list and needs a home that can depend on both
  `react-tokens` and `react-telemetry`, so it is decided on its own. This decision requires only
  that `LocaleProvider` works standalone and composes.
- **Whether `TimeField` supports seconds and whether it overrides the 12/24-hour default**, which
  belong to the component issue for `TimeField`.
- **`min`, `max` and range validity, and the viewport width at which `DatePicker` swaps its
  `Popover` for a `Dialog`**, which belong to the component issues for `Calendar`, `DatePicker`
  and the range variants.
