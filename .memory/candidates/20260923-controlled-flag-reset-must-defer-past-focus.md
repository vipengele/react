---
about: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
saw: fixing a panel-code-review finding on NumberInput's stuck invalid-flag reset
---

`NumberInput.tsx` resets its `unparseable` flag when a controlled `value` prop moves on without
the user adopting a failed commit themselves — the parent updating `value` is the one change the
component cannot see through its own `commit()` function. The first implementation tracked "the
last `value` this component has handled" in a state variable and updated that tracker on every
render where `value` differed from it, gated only by `isControlled`.

That version had a real bug a review caught: if `value` changes while the field is still
**focused**, the tracker update runs on that render (since it isn't gated by focus) and consumes
the transition — recording the new `value` as "already handled" — before the flag-clearing logic
ever gets to run (which is itself gated by `!focused`, per the component's decision that a
focused edit wins over an external update). By the time the field blurs, `value` no longer
differs from the tracker, so the clearing check never fires again, and the stale invalid text
stays on screen indefinitely.

The fix: gate the *tracker update itself* on `!focused`, not just the clearing logic. While
focused, the tracker is left stale on purpose, so the mismatch survives until the field
blurs and the reset can actually run then. Anywhere a component reacts to a controlled prop
change but defers acting on it until some other condition (focus, in this case) is true, the
bookkeeping that detects "did this change" must be deferred by that same condition — not just the
action taken in response to it.
