# react-ui v0.3.0

Every package in the project moves to 0.3.0 (ADR-0015). `@vipengele/react-ui` 0.3.0 needs
`@vipengele/react-tokens` 0.3.0 and `@vipengele/react-telemetry` 0.3.0, so upgrade the four
packages together. `react-ui` is `0.x`, so a `^0.2.x` range does not admit this release: raise it.

`react-ui` and `react-tokens` depend on `@vipengele/ts` `^0.2`. The date and time components take
its `LocalDate`, `LocalTime`, `LocalDateTime` and `Locale` values and check them with
`instanceof`, so an app that constructs those values needs its own `@vipengele/ts` on a `^0.2`
range that resolves to the same copy.

## Breaking

- **`--vpg-success`, `--vpg-warning` and `--vpg-info` are stylesheet-owned.** They join
  `--vpg-danger` as status colours the base stylesheet assigns, so naming one in `ThemeOverrides`
  is a type error and, from untyped code, a `TypeError` from `createTheme`. Set the `success`,
  `warning` or `info` seed on `ThemeSeed` instead, or override the `-light`/`-dark` variant.
- **`FileInput` runs `upload` in the enclosing telemetry scope.** The upload starts inside the
  scope of the nearest `ScopeProvider`, or the default scope outside any. Code that relied on
  `upload` starting with no ambient scope sees the enclosing one. Only its synchronous start runs
  in the scope; past its first `await`, capture it with `useScope()` and re-enter it with
  `Scope.propagate`.
- **`Button` with `aria-disabled` swallows activation.** `onClick` does not run and the click's
  default action is prevented, so a `type="submit"` button does not submit its form. The button
  stays focusable and the click still propagates to ancestors. Code that passed `aria-disabled`
  and handled the click itself moves that handling to an ancestor or drops `aria-disabled`.

## `@vipengele/react-tokens`

- **Status colours.** `ThemeSeed` takes `success`, `warning` and `info` beside `danger`, each an
  `oklch()` colour with a default. Each seeds `--vpg-<status>` and the ramp the accent and danger
  have: `-hover`, `-press`, `-wash`, `-ring`, `-contrast` and `-visited`, plus `-light`/`-dark`.
  The default warning is a light amber whose `-contrast` is black: draw it as a fill, not as text
  or a border on the surface. See ADR-0033.
- **Colour-mode preference.** `ThemeProvider` owns a `ColorModePreference` (`"light"`, `"dark"`
  or `"system"`): uncontrolled from `defaultColorMode` (default `"system"`), or controlled through
  `colorMode`, with `onColorModeChange` reporting every change. `useColorMode()` returns
  `colorMode`, `setColorMode` and `resolvedColorMode`, and throws outside a provider. The provider
  stores nothing: to remember a choice, seed `defaultColorMode` and save from `onColorModeChange`.
  `colorMode="light" | "dark"` forces the mode exactly as before.
- **Locale.** `LocaleProvider` carries a `@vipengele/ts` `Locale` to the components below it, and
  `useLocale(locale?)` resolves the argument, else the nearest provider, else `Locale.default()`.
  The date and time components and `NumberInput` read it.

## `@vipengele/react-ui`

New components:

- Display: `StatTile` (a label, a monospace value, a supporting line, a `tone` that requires a
  `toneLabel`, and a `visual` slot) and `Sparkline` (an axis-less line of `values` named by a
  generated trend summary, in `StatTile`'s tones).
- Forms and pickers, over `@vipengele/ts` values, all following `LocaleProvider` and committing
  on blur, `Enter` or a pick rather than per keystroke:
  - `Calendar` and `RangeCalendar`, inline month grids for a day or a span of days.
  - `DateField`, one locale-formatted text input with a `Calendar` pop-up and a clear button.
  - `TimeField`, a segmented time field with `min`, `max` and `seconds`.
  - `TimePanel`, hour, minute and AM/PM option strips with `minuteStep` and `isTimeDisabled`.
  - `DateTimeField`, one text input for a `LocalDateTime` with a `Calendar` and `TimePanel`
    pop-up. A picked day without a time is pending until a time is picked.
  - `DateRangeField`, `TimeRangeField` and `DateTimeRangeField`, two editors in one field over
    the exported `DateRange`, `TimeRange` and `DateTimeRange` types. A range commits only when
    both ends are filled and ordered; `startName` and `endName` submit each end.
- Navigation and app chrome:
  - `SideNav` with `SideNav.Item`, `SideNav.Section`, `SideNav.CollapseToggle`,
    `SideNav.Provider` and `SideNav.MobileToggle`: docked, an icon-only rail, or a modal drawer
    below `mobileBelow` (default `48rem`).
  - `TopNav` with `TopNav.Item`, between `start` and `end` slots; items the row has no room for
    collapse into an overflow menu.
  - `Toolbar`, one tab stop over its buttons, links and controls with arrow-key movement.
  - `Pagination`, a `full` or `simple` bar for a list the caller slices.
  - `ThemeToggle`, a Light / Dark / System `SegmentedControl` over `useColorMode()`.
  - `Menu.LinkItem` (`MenuLinkItemProps`), a menu row that is a real link, with `as` for a
    router's link component.
- Overlays and feedback:
  - `Drawer`, anchored to any viewport `side`: modal by default, or `modal={false}` for a
    page-layer panel, optionally closed on an outside press.
  - `toast`, the one imperative API (ADR-0032): mount one `ToastRegion` under the
    `ThemeProvider` and call `toast("Saved")`, `toast.success(...)`, `toast.promise(...)` or
    `toast.dismiss(...)` from anywhere. `createToaster()` gives a second, independently themed
    root its own toaster.
- `DataTable`, columns and rows as data on `@tanstack/react-table`: multi-column sorting
  (`sort`, `onSortChange`), row selection (`selectionMode`, `selectedRowIds`), pagination
  (`paginated`, with a `Pagination` bar), column resize (`resizableColumns`, `columnSizes`),
  virtualization (`virtualized` with `rowHeight`, and a `caption` or `aria-label`), and infinite
  scroll (`onLoadMore`, `hasMore`, `loadingMore`). `manual` hands sorting and paging to the
  caller. A failed load sets `loadMoreError`, which draws an error row with a Retry button.
  `onLoadMore` starts in the enclosing telemetry scope.

Changed components:

- `Popover` takes `anchor` (position against another element), `returnFocus`, `modal={false}`,
  and the `top-start` and `bottom-start` placements.
- `Table` takes `aria-label`, which also names its scroll region, and `scrollRef`.
- `NumberInput` takes `locale`, and otherwise follows the nearest `LocaleProvider` before the
  runtime's own locale.

## `@vipengele/react-icons`

New re-exports: `Calendar`, `ChevronsLeft`, `ChevronsRight`, `Ellipsis`, `Menu`, `Monitor`,
`Moon`, `PanelLeftClose`, `PanelLeftOpen` and `Sun`. `lucide-react` moves to `^1.52.0`.

## `@vipengele/react-telemetry`

No API change. Its `@vipengele/ts` dependency moves to `^0.2.0`.

## Not in this release

`@vipengele/react-charts` is a separate project with its own tag and is not published here.
