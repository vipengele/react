# A component usable standalone outside its provider must treat missing context as valid, never throw

When a component (`RadioButton`) is documented as usable on its own — outside any grouping
provider (`RadioGroup`) — its `useContext` consumer must accept `null` as a normal, supported
value and fall back to its own props. Throwing on missing context, the way `Tabs`' subcomponents
do, is only correct when the component has no meaningful standalone behavior at all.

## Applies to

- Any component that reads a sibling provider's context (the `RadioGroup`/`RadioButton` shape)
  where the leaf component's props docs promise it also works without the provider.
- Does not apply to compound components whose subcomponents are meaningless outside their parent
  (`Tabs.Tab` outside `Tabs`, `Card.Header` outside `Card`) — those correctly throw when the
  context is absent.

## Example

```tsx
// Correct — RadioButton works standalone; context is an optional enhancement. The explicit
// `value !== undefined` guard matters: `context.value` and `value` can each independently be
// `undefined`, and comparing them with `===` alone treats "neither side has a value" as a match,
// checking every valueless button in an unselected group.
const context = useRadioGroupContext(); // returns null outside a RadioGroup
const resolvedChecked = manualChecked
  ? checked
  : context
    ? value !== undefined && context.value === value
    : undefined;

// Wrong — breaks every standalone usage the props doc promises
const context = useRadioGroupContext();
if (context === null) {
  throw new Error("RadioButton must be used inside a RadioGroup");
}
```

An explicit prop (`checked`, `name`) passed directly to the component always wins over a value
read from context, so a component nested in a provider can still be driven manually when needed.
