# react-ui v0.2.0

Every package in the project moves to `0.2.0` (ADR-0015). One breaking change, one new package,
and a large batch of new components.

## Breaking: `@vipengele/react-ui` peer-depends on `@vipengele/react-telemetry`

`Dropdown` runs `loadOptions` inside the scope of the nearest enclosing `ScopeProvider` (or the
default scope outside any), so attributes set on that scope reach whatever the loader logs or
reports. To read that scope, `@vipengele/react-ui` now declares `@vipengele/react-telemetry` as a
required peer dependency alongside `@vipengele/react-tokens`.

What to do: install it next to `react-ui`.

```sh
pnpm add @vipengele/react-telemetry
```

No code change is needed; a `Dropdown` outside any `ScopeProvider` behaves as before.

## `@vipengele/react-telemetry` (new)

Non-visual React primitives for the framework's `Scope`: `ScopeProvider` opens a scope for a
subtree and `useScope` reads the nearest one. First release of the package at `0.2.0`.

## `@vipengele/react-ui`

New components: `Stack`, `Inline`, `Grid` and `GridItem`, `Center`, `AspectRatio`, `Badge`, `Tag`,
`Link`, `Checkbox`, `Textarea` (with opt-in CSS autogrow), `NumberInput`, `FileInput`,
`SegmentedControl`, `StatePanel`, `ErrorBoundary`, `Breadcrumbs`, `Tree` (roving focus,
virtualization), `Table`, `Dialog`, `ConfirmDialog`, `Menu` and `MenuButton`.

Overlays (`Dialog`, `Menu`, `Popover` and the rest) share one portal root and floating tree.

Fixed: a field shell now grows the control its composer names.

## `@vipengele/react-tokens`

Adds `--vpg-danger-wash` and the chart series colour roles derived from the accent.

## `@vipengele/react-icons`

No change. The version moves because a tag sets one version across the project.
