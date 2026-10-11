---
status: accepted
---

# `Menu` accepts a link row: a real anchor inside the roving-focus menu

A menu of navigation targets, such as an account menu that holds "Profile", "Billing" and "Sign
out", mixes actions with destinations. A destination is a link: the browser, the router and the
user all treat it differently from a button. `Menu` therefore accepts a row that is a link, and
this ADR settles what that row is and how it activates.

## Decision

**`Menu.LinkItem` renders a real link.** It renders an `<a>`, or whatever `as` names (typically a
router's link component), with `role="menuitem"`. It joins the roving-focus index like every other
row, so arrow keys and typeahead stop on it, and `href` and every other prop are forwarded to the
rendered element untouched.

**Activation is the link's own.**

- `Enter` is left to the link's native activation, which dispatches a click.
- `Space`, which a link ignores, clicks the row. While a typeahead string is being typed it extends
  the string instead, as on every other row (`0030-menu-moves-real-focus-and-roving-tabindex.md`).
- A primary click without a modifier navigates and closes the menu.
- A click that opens the link elsewhere, with a modifier held or a button other than the primary
  (a middle click arrives as `auxclick`), is left to the browser and does not close the menu, so
  the user stays where they were.

**`disabled` follows the other rows.** The row stays a focus stop and carries `aria-disabled`.
Every activation is cancelled: nothing navigates, the row's own `onClick` never fires and the menu
stays open.

**`current` marks the page.** It sets `aria-current="page"`. The menu never reads the location; the
caller says which row is the current page.

**`ContextMenu` stays action-only.** The rows an owner accepts depend on the owner. A context menu
is a set of actions on a region of the page and does not navigate away, so it does not accept
`Menu.LinkItem`, and its accepted-rows error text is unchanged. `Menu`, and a `Menu.Group` inside a
`Menu`, accept it.

## What this amends

`0030-menu-moves-real-focus-and-roving-tabindex.md` states that "Enter always activates", and its
row model is a row that activates through the menu's own handler. For a link row, `Enter` is not
intercepted: the menu's key handler leaves it to the link's native activation, and the resulting
click closes the menu. The rest of 0030 holds for a link row unchanged: real focus, the roving
tabindex, disabled rows as stops, the `Space` and typeahead rule, and membership in the focus
index. `0026-menu-and-dropdown-are-separate-components.md` is untouched.

## Considered options

- **A `Menu.Item` whose `onSelect` navigates** (`router.push(href)`) — rejected: the row is not a
  link, so middle-click, open in a new tab, copy link address and the status-bar URL are lost, a
  router's own link component cannot be used through `as`, and there is no `aria-current` for the
  page the user is on. Every consumer would also rebuild the same navigation call.

## Consequences

- A link row's `Enter` and primary click close the menu through the click handler, so a router's
  own click interception still runs: the link's `onClick` fires first, and the menu closes after.
- A consumer's `as` component has to forward a ref and unknown props to the element it renders,
  because the row's ref, role and roving tab stop are applied to it.
