# Start a consumer's I/O callback inside the enclosing `ScopeProvider`'s scope

When a component hands control to consumer code whose job is to reach an external system — a
loader, an uploader, a submit handler — it starts that code with `Scope.propagate` in the scope
`useScope()` returned at render: the nearest enclosing `ScopeProvider`'s, or the default scope
outside any provider. The consumer's code then reads the provider's attributes (`user.id`, a
request or tenant identifier) with `Scope.current().get(...)`, and anything it logs or traces
carries them.

An event handler, a timer and a promise continuation run with no ambient scope of their own in a
browser: the carrier there is a synchronous stack, so `Scope.current()` is the default scope there
whatever the component tree looks like. Without the explicit re-entry the call loses its
attributes, with no error and no warning.

## The pattern

```tsx
// Correct — the scope is captured at render, read through a ref, and re-entered around the call
const scope = useScope();
const scopeRef = useRef(scope);
useEffect(() => {
  scopeRef.current = scope;
});

// ...in the event handler or timer that starts the work
Scope.propagate(scopeRef.current, () => upload(file, context));

// Wrong — the call starts in whatever ambient scope the handler or timer happens to have
upload(file, context);
```

- **Read the scope through a ref, updated in an effect.** Outside a provider `useScope()` returns
  `Scope.current()`, whose identity can change from one render to the next. A callback that closed
  over a render's scope would pin a stale one.
- **Only the callback's synchronous start is in the scope.** Past its first `await` a browser has
  no ambient scope again, and re-entering it is the consumer's job (capture with `useScope()`,
  re-enter with `Scope.propagate`). Do not document or test anything stronger.
- **A synchronous throw from the callback is still a failure of that one call.** Start it where a
  throw becomes a rejection, as `useFileUploads` does inside its promise executor.
- **The component creates no scope and takes no scope prop.** The consumer places a
  `ScopeProvider`; the component only joins it.
- **`@vipengele/react-telemetry` stays a peer dependency.** An app holds one `ScopeContext`, and a
  second bundled copy gives the component a context that none of the app's providers provide.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that calls a consumer-supplied function expected to
  perform I/O and return its promise: `Dropdown`'s `loadOptions` and `FileInput`'s `upload` follow
  it.
- It does not apply to callbacks that only report an event (`onChange`, `onReject`) or to code the
  component runs itself. They start in the ambient scope.

## Tests

Assert the attribute reaches the callback, both inside a `ScopeProvider` and outside any (the
default scope). The scope is behaviour, not CSS, so the jsdom test is the proof of the wiring; add
a `*.browser.test.tsx` case too, because only a real engine has an event handler or timer with no
ambient scope — see `browser-test-for-anything-jsdom-cannot-resolve.md`. A scope test that still
passes with the `Scope.propagate` call removed proves nothing, so remove it once and watch the test
fail.
