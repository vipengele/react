# Measure real layout in a `flushSync`-flushed `useLayoutEffect`, observed by `ResizeObserver`

Deciding what to render from the rendered content's own size — how many chips fit a row, how many
characters truncate — needs an actual layout pass; no combination of props and CSS answers it in
advance. A plain `useEffect` measurement runs after paint, so the user sees the unmeasured state
flash before the collapsed one. An observer callback that schedules a React update without
flushing it lands one frame later than the resize it responds to, for the same reason.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that sizes or hides part of what it renders based
  on the space its own DOM node has, rather than on a prop or a CSS rule alone.

## Example

```tsx
useLayoutEffect(() => {
  function measure() {
    setHiddenCount(measureOverflow(row));
  }
  measure();
  const observer = new ResizeObserver(() => {
    // Runs after layout, before paint — flush here so the update lands in the same frame.
    flushSync(measure);
  });
  observer.observe(row.parentElement);
  return () => observer.disconnect();
}, [/* whatever the DOM read depends on, not the values it produces */]);
```

Measure the container being resized, never the element the measurement itself resizes — observing
your own output feeds every collapse back in as a resize of its own. jsdom's `ResizeObserver` is a
stub whose callback never fires and every box reports zero width, so this pattern is unverifiable
under jsdom; see `browser-test-for-anything-jsdom-cannot-resolve.md`.
