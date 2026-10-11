---
name: numberinput-controlled-reset-tracker-must-defer-while-focused
kind: gotcha
description: NumberInput's controlled-value tracker must not advance while the field is focused, or a mid-edit value change is consumed and the stale invalid text never clears.
anchors:
  - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
    blob: 55b1b6e921cc
confidence: verified
---

The hook documented at `NumberInput.tsx:125-132` clears `unparseable` when a controlled `value`
moves on without the user committing. It compares `value` with the value last acted on and
only runs when unfocused (`NumberInput.tsx:142`: `isControlled && !focused && value !== previousControlledValue`).

The tracker itself is deliberately left stale while focused. An earlier version updated the tracker on
every render and gated only the clearing logic on focus: a `value` change mid-edit was recorded as
"handled" before the clear could run, so after blur nothing differed and the invalid text stayed on
screen indefinitely. General rule: when a reaction to a prop change is deferred by a condition, the
bookkeeping that detects "did it change" must be deferred by the same condition.
