# Never change a numeric control's value from a `wheel` event

A wheel gesture is how a user scrolls the page, not how they edit a field. Wiring it to change a
value has no discoverable affordance, fires from a gesture aimed at the page rather than the
control, and silently rewrites a field the user had already filled in — the failure
`NumberInput` exists to remove from `<input type="number">`.

## Applies to

- Any component under `packages/ui/src/*/*.tsx` that holds or steps a numeric value —
  `NumberInput` today, and any future stepper, range, or numeric-entry control.
- No opt-in prop reintroduces this either: an opt-in defect is still the defect, and the prop's
  existence invites a caller to turn it on for the one screen where it seems convenient.

## Example

```tsx
// Wrong — an ambient scroll gesture rewrites a value the user never touched
<input onWheel={(e) => stepBy(e.deltaY < 0 ? 1 : -1)} />

// Correct — the value only moves from an arrow key, a stepper button, or typed input
<input onKeyDown={handleKeyDown} />
```
