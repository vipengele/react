---
name: use-controllable-state-cannot-express-controlled-empty
kind: gotcha
description: useControllableState treats controlled === undefined as uncontrolled, so it cannot represent a controlled-but-empty value; NumberInput uses "value" in props and Tree selection uses null.
anchors:
  - path: source/react-ui/packages/ui/src/internal/useControllableState.ts
    blob: "617526263178"
  - path: source/react-ui/packages/ui/src/NumberInput/NumberInput.tsx
    blob: e59320800703
  - path: source/react-ui/packages/ui/src/Tree/Tree.tsx
    blob: b1dac9ae20e9
confidence: verified
---

`useControllableState.ts:15` is `controlled === undefined ? uncontrolled : controlled`, and `setValue` updates held
state only when `controlled === undefined`. Passing `value={undefined}` to mean "controlled, currently empty"
therefore silently falls back to internal state. NumberInput decides control with `"value" in props`
(`NumberInput.tsx:223`, comment `:220-222`) and does not use the hook. Tree's selection avoids the problem by
making `null` the empty value (`Tree.tsx:236`, `useControllableState<string | null, string>`). Any new component
whose empty value is `undefined` (ADR-0025's `value?: LocalDate`) needs the `in props` pattern or an explicit
controlled flag added to the hook; nothing extends the hook that way today.
