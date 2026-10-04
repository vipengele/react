---
status: proposed
---

# Table density, its scroll region, and the sticky layer

`Table` makes three choices no earlier component made, and each would otherwise be re-derived the
next time a component needs the same thing.

## Decision

**Density.** `Table` takes `density`: `compact`, `regular` (default) or `relaxed`. It sets cell
padding from steps of the spacing scale (`--vpg-space-*`) and nothing else; text size stays on the
type scale and control height on the size scale. It is the first `density` prop in the package, so
the name and the three values are the convention a later dense component follows.

**Scroll wrapper.** The `<table>` always sits inside a `div` that scrolls (`overflow: auto`), so a
wide or tall table scrolls rather than overflowing the page. `className` and `style` apply to that
wrapper, because sizing the thing that scrolls is what a consumer means by sizing a table; `ref`
and the remaining props apply to the `<table>`. The wrapper is a focus region only when the table
has a `caption`: it then carries `role="region"`, `tabIndex={0}` and `aria-labelledby` pointing at
the caption, so a keyboard user can reach and scroll it and a screen reader announces a name. With
no caption it is a plain `div`, because a focusable region with no name is worse than none. The
condition is a prop check made at render; nothing measures whether the table overflows.

**Sticky layer.** `--vpg-layer-sticky` is `900`, the lowest step of the `--vpg-layer-*` scale. A
sticky header pins inside the page flow rather than floating over it, so it sits below every
floating surface, including the listbox from ADR-0024's scale. `stickyHeader` only has an effect
when the wrapper's block size is bounded.

## Considered options

- **Setting `tabIndex` from a `ResizeObserver` that detects overflow** — rejected: it adds a
  layout read, an observer and a post-mount re-render to avoid a focus stop on a table that fits,
  and a focusable region that appears and disappears with the viewport is harder to learn than one
  that depends on a prop the author controls.
- **Validating children** (requiring `Table.Head` and `Table.Body`) as ADR-0003 does for `Card` —
  rejected: a table's structure is already constrained by the native elements, and fragments and
  wrapper components that render rows must keep working.
- **A `maxBlockSize` prop** — rejected: ADR-0019 limits length props to token names, and a table's
  bounded height is an arbitrary length that belongs to the surrounding layout, set through
  `className` or `style`.
- **Column alignment through `<colgroup>`** — rejected: `text-align` on a `<col>` does not inherit
  into its cells, so alignment is a per-cell `align` prop.
