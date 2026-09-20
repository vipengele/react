# Wrap a component's trigger element in a `<span>`, never `cloneElement` it

`cloneElement` requires the trigger to accept and forward a ref and to spread unknown props —
neither is guaranteed for an arbitrary consumer-supplied node, including a component that doesn't
forward refs. Wrapping the trigger in a plain `<span>` that carries the ref and the interaction
handlers instead works for any `children`, at the cost of one extra DOM node around it.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that attaches positioning refs or interaction
  handlers (hover, focus, click) to a caller-supplied `children` trigger — `Tooltip` and `Popover`
  today, and any future trigger-based overlay component.

## Example

```tsx
// Correct — works for any children, including refless components
<span ref={refs.setReference} className="vpg-tooltip-trigger" {...getReferenceProps()}>
  {children}
</span>

// Wrong — breaks for a `children` that doesn't forward a ref or spread props
cloneElement(children, { ref: refs.setReference, ...getReferenceProps() })
```

A prop meant to configure the trigger's behaviour (e.g. `Tooltip`'s `disabled`) lives on the
component itself, not read off `children`'s props — the trigger is wrapped, never inspected.

## The one carve-out: labelling attributes that must reach the focusable element

`aria-describedby`, `aria-haspopup`, `aria-expanded` and `aria-controls` are plain string/boolean
props, not refs or event handlers — `cloneElement` can merge them onto `children` even when it
doesn't forward a ref, because they end up in the `...rest` every component in this package
spreads onto its own root element. Putting them on the wrapper `<span>` instead is a real
accessibility bug: a screen reader announces or exposes an element's own ARIA attributes, not an
ancestor's, and the wrapper is never what receives focus.

So `Tooltip` and `Popover` clone `children` with **only** these labelling attributes when it is a
single element (`isValidElement(children) && children.type !== Fragment` — a `Fragment` also
passes `isValidElement` but names no single DOM node to clone onto). The ref and every
interaction handler (hover, focus, click, dismiss) still go on the wrapper, exactly as above.
Falling back to the wrapper's own attribute is only for `children` that isn't a single element
(plain text, a `Fragment`, multiple nodes) — there is no single focusable target to clone onto,
so the wrapper is the least-wrong place left.

```tsx
// Correct — ref and handlers on the wrapper; the labelling attribute cloned onto a single child
const { "aria-describedby": describedBy, ...referenceProps } = getReferenceProps();
const hasSingleElementChild = isValidElement(children) && children.type !== Fragment;
const trigger = hasSingleElementChild
  ? cloneElement(children, { "aria-describedby": describedBy })
  : children;
<span ref={refs.setReference} {...referenceProps}>{trigger}</span>

// Wrong — the description sits on an element a screen reader never focuses
<span ref={refs.setReference} {...getReferenceProps()}>{children}</span>
```
