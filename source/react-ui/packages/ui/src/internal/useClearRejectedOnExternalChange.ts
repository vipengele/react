import { useState } from "react";

/**
 * Clears the rejected flag when a controlled `value` moves on without the user touching the box.
 * A parent moving `value` on is not visible to `commit()`, so it is caught by comparing against the
 * `value` last acted on, on every unfocused render — deliberately *not* updated while focused, so a
 * `value` that changes mid-edit is still caught once the field blurs rather than being consumed
 * here and missed there. Dates compare by their ISO string, so a parent that rebuilds the same
 * date on every render is not a change.
 */
export function useClearRejectedOnExternalChange(
  isControlled: boolean,
  focused: boolean,
  iso: string | undefined,
  rejected: boolean,
  setRejected: (next: boolean) => void,
) {
  const [previousControlledIso, setPreviousControlledIso] = useState(iso);
  if (isControlled && !focused && iso !== previousControlledIso) {
    setPreviousControlledIso(iso);
    if (rejected) {
      setRejected(false);
    }
  }
}
