import { useState } from "react";

/**
 * A value the caller controls by passing it, or this hook holds when the caller passes
 * `undefined`. The setter updates the held value only while uncontrolled, and reports every
 * change to `onChange` either way. `S` narrows what the setter takes, for a value that can hold
 * something no change ever sets it to.
 */
export function useControllableState<V, S extends V = V>(
  controlled: V | undefined,
  initial: () => V,
  onChange: ((value: S) => void) | undefined,
): [V, (next: S) => void] {
  const [uncontrolled, setUncontrolled] = useState(initial);
  const value = controlled === undefined ? uncontrolled : controlled;

  function setValue(next: S) {
    if (controlled === undefined) setUncontrolled(() => next);
    onChange?.(next);
  }

  return [value, setValue];
}
