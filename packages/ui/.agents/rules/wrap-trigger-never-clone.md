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
<span ref={refs.setReference} className="tandiko-tooltip-trigger" {...getReferenceProps()}>
  {children}
</span>

// Wrong — breaks for a `children` that doesn't forward a ref or spread props
cloneElement(children, { ref: refs.setReference, ...getReferenceProps() })
```

A prop meant to configure the trigger's behaviour (e.g. `Tooltip`'s `disabled`) lives on the
component itself, not read off `children`'s props — the trigger is wrapped, never inspected.
