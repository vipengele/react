# Roving focus is a keyboard-only hook, and the caller owns the tab stop

`Toolbar` is a `role="toolbar"` container whose items share one tab stop and are reached with the
arrow keys. `0030-menu-moves-real-focus-and-roving-tabindex.md` left consolidating the package's
roving-focus code open, and `Tabs` is the next component to need what `Toolbar` needs. This ADR
settles where the arrow-key logic lives, what it leaves to its caller and which widgets it does not
serve.

## Decisions

- **One shared hook, keyboard only.** `internal/useRovingFocus.ts` handles keydown on a container:
  the orientation's arrow pair, `Home` and `End` move DOM focus between items found with a
  selector, with optional wrapping and a `disabledPolicy` of `skip` or `focusable`. It reports the
  item it moved to through `onNavigate`. It writes no `tabindex`.
- **The caller owns the tab stop.** What the hook cannot know is which item is the stop, and that
  differs by widget. `Tabs` derives its stop declaratively from the selected value, so each tab
  renders its own `tabIndex`. `Toolbar`'s items are arbitrary children it cannot clone, so it
  writes `tabindex` imperatively on the DOM items: after every render, on every focus within it,
  and from a `MutationObserver` for items added, removed, enabled or disabled below it. The hook
  fits both because it stops at moving focus.
- **Key yield.** When the key is `ArrowLeft`, `ArrowRight`, `Home` or `End` and the target is an
  editable element (`<input>`, `<textarea>`, content-editable) or has the role `slider`,
  `spinbutton`, `combobox`, `textbox` or `searchbox`, the hook does nothing, because that element
  uses those keys to move a caret or adjust a value. The yielded keys are those four whatever the
  orientation: in a vertical toolbar `ArrowUp` and `ArrowDown` still move between items, even from
  a text field, slider or spinbutton, and in a horizontal one they are left alone. `Tab` is the way
  out of such an item. A key pressed anywhere other than on an item itself is also left alone.
- **DOM-query based, so not for `Tree`.** The hook finds items by querying the container, which is
  correct only while every item is mounted. A virtualised `Tree` unmounts rows, so it navigates
  its flattened row model instead (see
  `0024-tree-is-data-driven-with-roving-tabindex-over-a-flattened-row-model.md` and
  `0025-tanstack-react-virtual-for-opt-in-tree-windowing.md`) and stays out of scope.
- **`Menu` stays out of scope.** `Menu`'s roving (`internal/menuPanel.tsx`) is floating-ui's
  `useListNavigation` with `useTypeahead`. It is a third implementation, and the deferral in ADR
  0030 of consolidating `Menu`, `Tree` and `Tabs` is unchanged by this one.
- **The hook has one consumer when it lands.** `Toolbar` is the first; `Tabs` migrates onto it in
  the next change, and the hook's options are shaped for both.
- **`ButtonGroup` is not a toolbar.** It stays a CSS-only `role="group"`. It may be nested in a
  `Toolbar`, whose items are found at any depth, so its buttons are items of the toolbar.

## Considered options

- **Roving logic local to `Toolbar`** — rejected: `Tabs` needs the same key handling, and two
  copies of the wrapping, direction and disabled-item rules drift apart.
- **floating-ui's `useListNavigation`** — rejected: it needs a registered list and an active
  index it owns, which suits `Menu`'s panel but not a toolbar of arbitrary children, and it has no
  yield for editable or value-adjusting items.
- **An item-registration API** (a `Toolbar.Item` wrapper) — rejected: the wrapper would have to be
  used for every control, so a consumer's own `Button`, `MenuButton` or input inside a
  `ButtonGroup` would silently stop taking part, and the hook would still need a way to place them.
- **The hook owning `tabindex`** — rejected: it would have to clone the items to render it, which
  `Toolbar` cannot do, or write it imperatively, which `Tabs` has no need for.

## Consequences

- `Toolbar` rewrites any `tabIndex` a caller gives one of its items.
- An item that is an editable field keeps `ArrowLeft`, `ArrowRight`, `Home` and `End`, so in a
  horizontal toolbar the arrows cannot leave a text input; `Tab` does. In a vertical toolbar
  `ArrowUp` and `ArrowDown` are not yielded and leave a text field, slider or spinbutton.
- The package holds three roving implementations (this hook, `Tree`'s and `Menu`'s) until the
  consolidation ADR 0030 defers is decided.
