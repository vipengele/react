# `ContextMenu` is a second shell over `Menu`'s panel

`0026-menu-and-dropdown-are-separate-components.md` ("`Menu` and `Dropdown` are separate
components") separates an action list from a value picker, and
`0030-menu-moves-real-focus-and-roving-tabindex.md` ("`Menu` moves real focus onto its rows, with
a roving tabindex") fixes how a `Menu` moves focus and dismisses. A `ContextMenu` is the same
action list opened from a region by a secondary click, a touch long-press or the keyboard, not
from a trigger button. This ADR settles how it relates to `Menu`, what it anchors to and what
gestures open it.

## Decisions

- **One panel, one stylesheet.** `ContextMenu` and `Menu` are thin shells over
  `internal/menuPanel.tsx` (the panel, the rows, row validation and focus handling) and
  `internal/menuStylesheet.ts`, injected under the same `href="vpg-menu"`. Rows, ARIA, keyboard
  model and look cannot drift between them. `ContextMenu`'s focus and dismissal follow ADR 0030,
  which also pins `Menu`'s focus path.
- **Opened from a region.** `target` is a prop and the rows are `children`. The target is wrapped
  in a `<div style="display: contents">` that carries the gesture handlers. The wrapper is never
  the anchor and nothing is cloned onto the target, so it can be any node and lays out as if
  unwrapped. The anchor is a virtual reference: the pointer point, or the focused element for a
  keyboard invocation.
- **The portal rule has one departure.** `useOverlayRoot` resolves its target from the trigger
  (`0024-overlay-layering-and-portal-ownership.md`, "Overlay layering and portal ownership"). A
  virtual reference has no DOM element, so the hook would render the panel inline and escape a
  `Dialog`'s `data-vpg-overlay-root`. The target wrapper is passed as the context element instead,
  as the menu's only DOM element outside the panel.
- **Focus return is explicit.** A virtual reference gives `FloatingFocusManager` no element to
  return to. The element focused when the menu opened is passed as its return target; when focus
  was on `body`, there is none.
- **Gestures.** A secondary click, and a touch long-press: touch pointers only, `longPressDelay`
  defaulting to 500 ms, a 10 px movement tolerance, cancelled by `pointerup`, `pointercancel`,
  movement, any scroll or `disabled`. `Shift+F10` and the `ContextMenu` key have an explicit
  handler, because macOS raises no `contextmenu` for them; where the browser does raise one, it is
  deduped against the key's own invocation. Android's follow-up `contextmenu` and the trailing
  click of a long press are swallowed. A `contextmenu` with `clientX` and `clientY` both 0 reads
  as keyboard-raised and anchors to the focused element.
- **Nesting and repeat invocations.** The innermost target wins through `defaultPrevented`, never
  `stopPropagation`, so outer listeners still see the event. Invoking again while open
  repositions the menu. A secondary click outside an open menu closes it and reopens at the new
  point. Editable fields get no automatic exemption: a consumer who wants the native menu there
  puts it outside the target. `disabled` lets the native menu through.
- **No `tabIndex` on the wrapper.** A target with no focusable content is not reachable by
  keyboard, and the component documents it. A tab stop the component invented would sit on every
  region a consumer wraps.
- **No new bundle-check marker.** `ContextMenu` injects `Menu`'s `.vpg-menu` stylesheet, so a
  marker would duplicate `Menu`'s.

## Considered options

- **A separate `ContextMenu` panel and stylesheet** — rejected: two copies of the rows, the
  validation and the look to keep in step.
- **A `Menu` mode** (`<Menu contextual>`) — rejected for the reasoning of ADR 0026 against
  modes: a trigger-less region and a trigger button differ in the anchor, the gestures, the
  portal root and the focus return, and every `Menu` consumer would carry the props of a mode
  they never use.
- **Anchoring to the wrapper, or cloning handlers onto the target** — rejected: a
  `display: contents` wrapper has no box to position against, and cloning loses its handlers on
  any target that does not forward a ref or spread unknown props, as ADR 0030 records for `Menu`'s
  trigger.
- **A `tabIndex` on the wrapper** — rejected: it adds a tab stop to every wrapped region, and a
  focusable target of the consumer's choosing already gets the key invocation.
- **Resolving the overlay root from the virtual reference** — rejected: it has no DOM element, and
  the panel would render inline outside a modal surface.

## Consequences

- A change to a row or to the panel's focus handling reaches `Menu` and `ContextMenu` together.
- A target with no focusable content has no keyboard path to its menu.
- A real pointer at the viewport's top-left corner is read as a keyboard invocation; the menu
  opens against the element under it.
