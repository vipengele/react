---
status: accepted
---

# `SideNav` owns its responsive switch; mobile navigation is a mode, not a component

Navigation on a narrow viewport is the same navigation as on a wide one: the same sections, the
same items, the same current page. The question is whether it is a distinct component or a
responsive mode of `SideNav`. It is a mode. Below a breakpoint the `SideNav` children render
inside a modal left `Drawer`; the docked and rail layouts are the wide-viewport form.

## Decision

**One component, two presentations.** `SideNav` renders its children once. At or above the
breakpoint they are docked, with the collapse rail available. Below it they are the content of a
modal left `Drawer`, and the rail is ignored there: a drawer is always the expanded layout.

**Open state is the caller's to control.** The drawer is opened and closed by `mobileOpen` and
`onMobileOpenChange`, following the package's `open` + `onOpenChange` convention for overlays.
`SideNav.MobileToggle` is the trigger part a consumer places in their own header. It renders only
below the breakpoint and reads and sets the same open state.

**One registration of the current page.** Because the drawer and the docked layout share one set
of children, the consumer marks `current` once. `Section`, `Item` and the flyout logic are written
once and serve both presentations.

**The component decides which presentation it is in.** The switch is internal to `SideNav`. A
consumer does not branch on viewport size to choose between two components.

## Considered options

- **A separate `MobileNav` component** — rejected: every application would author its navigation
  twice, as two item trees it must keep in sync, mark `current` in both, and choose between by
  measuring the viewport itself. `MobileNav` would also need its own `Section`, `Item` and nested
  disclosure behaviour, duplicating the logic `SideNav` already has or pushing it into
  `src/internal/` for two components that differ only in the container around the same items.

## Consequences

- `SideNav` takes on the repo's first `matchMedia`-based hook. Until it resolves, `SideNav` renders
  docked, so server rendering and the first client paint are the docked layout. A narrow viewport
  therefore corrects to the drawer presentation after mount.
- The breakpoint is a token, so it needs a new entry in `packages/tokens`. The decision spans two
  packages, and `@vipengele/react-ui` depends on the token being published by
  `@vipengele/react-tokens`.
- `SideNav` depends on the exported `Drawer` for the mobile presentation. Changes to `Drawer`'s
  modal behaviour, focus return and layering (ADR-0024) apply to mobile navigation.
- The docked and rail layout is implemented against this decision. The implementation is committed
  to rendering the same children in both presentations, to the `mobileOpen` / `onMobileOpenChange`
  / `SideNav.MobileToggle` surface, and to ignoring the rail inside the drawer.
