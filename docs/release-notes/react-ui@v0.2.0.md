# react-ui v0.2.0

Every package in the project moves to 0.2.0 (ADR-0015). `@vipengele/react-ui` 0.2.0 needs
`@vipengele/react-tokens` 0.2.0 and the new `@vipengele/react-telemetry` 0.2.0, so upgrade the
three together. `react-ui` is `0.x`, so a `^0.1.x` range does not admit this release: raise it.

## Breaking

- **`Dropdown` runs `loadOptions` in the enclosing telemetry scope.** The loader now starts inside
  the scope `useScope()` returns at the latest render: the nearest `ScopeProvider`'s, or the default
  scope outside any. Code that relied on `loadOptions` starting with no ambient scope sees the
  enclosing one. Only the loader's synchronous start runs in the scope; past its first `await`
  the loader re-enters it itself.

## `@vipengele/react-telemetry` (new package)

Non-visual React primitives: `ScopeProvider` and `useScope`. `react-ui` depends on it for the
`Dropdown` change above.

## `@vipengele/react-tokens`

- **Chart series colours.** `createTheme` emits `--vpg-chart-1` to `--vpg-chart-6`, derived from the
  accent by rotating its hue (+30° to +330° in 60° steps) with a chroma floor and alternating
  lightness. They follow the colour mode through the accent and add no seed fields. Override one
  through `ThemeOverrides`; an override applies in both modes unless it is a `light-dark()` or
  `var()`-reading expression. See ADR-0030.
- **`--vpg-danger-wash`.** The danger counterpart of the accent wash.

## `@vipengele/react-ui`

New components:

- Form controls: `Checkbox`, `Textarea` (with opt-in CSS autogrow), `NumberInput`, `FileInput`,
  `SegmentedControl`.
- Layout: `Stack`, `Inline`, `Grid` and `GridItem`, `AspectRatio`, `Center` and a width scale.
  The layout primitives accept token values only.
- Display: `Badge`, `Tag`, `StatePanel`, `Link`, `Breadcrumbs`, `Table`, `Tree` (roving focus,
  opt-in virtualization).
- Overlays: `Dialog`, `ConfirmDialog`, `Menu` and `MenuButton`. Overlays route through one portal
  root and one floating tree (ADR-0024).
- `ErrorBoundary`.

Fixed: a control a field shell's composer names now grows to fill the shell.

## Not in this release

`@vipengele/react-charts` is a separate project with its own tag and is not published here.
