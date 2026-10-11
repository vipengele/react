# Disclosure is the primitive; Accordion composes it

`Disclosure` is a standalone component: a trigger button with `aria-expanded` that shows and
hides one panel, owning `open` / `defaultOpen` / `onOpenChange`. `Accordion` is a group with no
markup of its own beyond a wrapper. It provides a context, and a `Disclosure` rendered inside one
reads that context, takes its open state from the group (keyed by its `value`), and wraps its
trigger in a heading at the group's `headingLevel`. A `Disclosure` outside any `Accordion` sees a
null context and works on its own, so there is one trigger, one panel, one stylesheet and one set
of aria wiring, rather than two components that drift apart. An APG accordion is, by definition,
a set of disclosure widgets.

The panel is a hand-rolled `<div role="region">` with `hidden="until-found"`, not
`<details>`/`<summary>`. React owns `open` outright, so controlled mode needs no fight with the
native toggle. The accordion header can be a real heading wrapping a button, where a heading
inside `<summary>` is announced inconsistently by screen readers. Find-in-page still expands a
closed panel through `beforematch` in engines that support `until-found`. Elsewhere `until-found`
degrades to plain `hidden`, and find-in-page cannot reach collapsed content.

## Considered Options

- **Separate `Disclosure` and `Accordion` components**, as with SegmentedControl and Tabs
  (ADR 0029). Rejected: ADR 0029 separates components whose semantics differ, while these share
  theirs exactly.
- **`Accordion` only**, with a lone disclosure written as a one-item accordion. Rejected: a
  standalone "show more" would carry group and heading machinery it does not need.
- **Native `<details>`.** Rejected for the controlled-state and heading reasons above, despite
  the "prefer native" precedent of Dialog and RadioGroup.

## Consequences

- Inside an `Accordion`, a `Disclosure`'s own `open` and `defaultOpen` are ignored. The group's
  `value` decides, and `onOpenChange` still fires.
- The panel's height transition relies on `interpolate-size` and the `allow-discrete`
  `content-visibility` transition. Engines without them open and close instantly.
