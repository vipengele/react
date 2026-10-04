---
status: proposed
---

# `Pagination` is one standalone component over `Dropdown`

`Pagination` pages through a collection and lets the reader choose how many items a page holds.
Its shape, its state ownership and its page-size field are choices a later paging component would
otherwise re-derive.

## Decision

**One component.** `Pagination` is a single standalone component, not a compound one. Page and
page size are each controllable or uncontrollable, through `useControllableState(controlled,
initial, onChange)`, which `Tree` also uses: a value is controlled when `controlled` is not
`undefined`, is held in state otherwise, and `onChange` is called on every change.

**Clamping.** The displayed page is clamped into range at render. `onPageChange` never fires from
an effect: a controlled parent that holds an out-of-range page owns the correction, and the
component only declines to display it.

**Page-size change.** Changing the page size keeps the first visible item in view. The new page
is `floor((page - 1) * oldSize / newSize) + 1`, and `onPageChange` fires only when that differs
from the current page.

**Page-size field.** The field is the package's `Dropdown`, non-searchable. `pageSizeOptions` are
numbers, mapped to string options for the `Dropdown` and back on change. `Pagination`'s own
stylesheet constrains the `Dropdown`'s width; `Dropdown` is unchanged.

**Range text.** The range ("21–40 of 135") is visible text inside a `role="status"` element, so
the same string is shown and announced.

**Strings.** Every string has an override prop with an English default. There is no locale prop,
for the reason in ADR-0020: the package does not own locale resolution.

**Shared state hook.** `useControllableState` lives in `src/internal/`, the first state hook
there, because a second component now needs it and components never import a sibling's internals.

## Considered options

- **A compound component** — rejected: `DataTable` consumes `Pagination` whole, and there is no
  part a consumer would recompose.
- **A native `<select>` in `FieldShell`** — rejected: it is the lighter bundle, but `Dropdown` is
  the package's select equivalent and keeps one look and one keyboard model.
- **A hidden `aria-live` region instead of a visible `role="status"`** — rejected: it needs a
  new visually-hidden utility, and the visible and the spoken text can drift apart.
- **Leaving `useControllableState` in `Tree/` and importing it across component directories** —
  rejected: it violates the rule that components never import a sibling's internals.
- **Clamping through an effect that calls `onPageChange`** — rejected: it loops with a controlled
  parent that ignores the callback.

## Consequences

- `Dropdown` brings `@floating-ui/react` and the telemetry import along with `Pagination`. This
  is accepted.
- The page-size field sets the bar's minimum width, and the bar scrolls horizontally below
  roughly 210px.
- The step buttons use the native `disabled` attribute, so focus leaves a button that becomes
  disabled.
