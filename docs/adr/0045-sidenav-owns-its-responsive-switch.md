---
status: accepted
---

# `SideNav` owns its responsive switch; mobile navigation is a mode, not a component

Navigation on a narrow viewport is the same navigation as on a wide one: the same sections, the
same items, the same current page. The question is whether it is a distinct component or a
responsive mode of `SideNav`. It is a mode. Below `mobileBelow` the `SideNav` children render
inside a modal left `Drawer`; the docked and rail layouts are the wide-viewport form.

## Decision

**One component, two presentations.** `SideNav` renders its children once. At or above
`mobileBelow` they are docked, with the collapse rail available. Below it they are the content of a
modal left `Drawer`, and the rail is ignored there: a drawer is always the expanded layout.
`collapsed` is ignored, `CollapseToggle` renders nothing, collapsible sections render docked, and
there are no flyouts or tooltips.

**The threshold is a prop, not a token.** `mobileBelow` is a CSS length, default `"48rem"`, and the
viewport is narrow when `matchMedia("(width < <mobileBelow>)")` matches. It is a per-nav choice, so
a consumer sets it where the nav is declared.

**Open state is the caller's to control.** The drawer is opened and closed by `mobileOpen` and
`onMobileOpenChange`, following the package's `open` + `onOpenChange` convention for overlays;
`defaultMobileOpen` seeds the uncontrolled form. `SideNav.MobileToggle` is the trigger part a
consumer places in their own header. It renders only below `mobileBelow` and reads and sets the
same open state.

**`SideNav.Provider` owns the mobile state.** The toggle sits in the header, outside the nav, so the
state it shares with the nav lives above both: `SideNav.Provider` holds the open state, the query
and the drawer id, and the toggle's `aria-controls` names the drawer through that id (`Drawer` takes
an `id` prop for this). A `SideNav` with no provider around it owns its own state. A `SideNav`
inside a provider that is given any mobile prop throws, because two owners of one open state would
disagree. `SideNav.MobileToggle` outside a provider throws, because it has no state to read.

**One registration of the current page.** Because the drawer and the docked layout share one set
of children, the consumer marks `current` once. `Section`, `Item` and the flyout logic are written
once and serve both presentations.

**The component decides which presentation it is in.** The switch is internal to `SideNav`. A
consumer does not branch on viewport size to choose between two components.

**The drawer form.** The `<nav>` renders inside the drawer's panel, and the drawer takes the nav's
`aria-label` as its own name. A dialog and a nav sharing a name is accepted. Activating an `Item`
closes the drawer. When the viewport widens past `mobileBelow` while the drawer is open, the open
state reports `onMobileOpenChange(false)` once, so a controlled `true` cannot reopen the drawer the
next time the viewport narrows.

## Considered options

- **A separate `MobileNav` component** — rejected: every application would author its navigation
  twice, as two item trees it must keep in sync, mark `current` in both, and choose between by
  measuring the viewport itself. `MobileNav` would also need its own `Section`, `Item` and nested
  disclosure behaviour, duplicating the logic `SideNav` already has or pushing it into
  `src/internal/` for two components that differ only in the container around the same items.
- **A breakpoint token** — rejected: a media query cannot read a custom property, so a token would
  have to be mirrored into JavaScript, and a threshold that belongs to one nav would become a
  property of the whole theme.

## Consequences

- `SideNav` takes on the first `matchMedia`-based hook in `packages/ui` (`useMediaQuery`);
  `packages/tokens/src/color-mode.ts` is the repo's first. Until the query resolves,
  `SideNav` renders docked, so server rendering and the first client paint are the docked layout. A
  narrow viewport therefore corrects to the drawer presentation after mount.
- The unresolved state is guarded in CSS for the default threshold only. While unresolved with the
  default `mobileBelow`, the nav and `MobileToggle` carry `data-vpg-side-nav-unresolved`, and
  `@media (width < 48rem)` and `(width >= 48rem)` rules show exactly one form in server HTML. With a
  custom `mobileBelow` those rules would be wrong, so nothing carries the marker: server HTML holds
  the docked nav and no toggle, and the first client paint corrects after mount.
- A client-only jsdom `render()` resolves the query immediately, so only `renderToString` can
  observe the unresolved state or the marker.
- The docked and drawer forms are different subtrees, so crossing `mobileBelow` remounts the nav's
  rows. An uncontrolled section restarts from its `defaultOpen` and whatever current item it holds.
- `SideNav` depends on the exported `Drawer` for the mobile presentation. Changes to `Drawer`'s
  modal behaviour, focus return and layering (ADR-0024) apply to mobile navigation.
- There is no `MobileNav` export. The mobile presentation is reached only through `SideNav`,
  `SideNav.Provider` and `SideNav.MobileToggle`.
