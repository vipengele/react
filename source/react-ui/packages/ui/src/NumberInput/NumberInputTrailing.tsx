import { ChevronDown, ChevronUp } from "@vipengele/react-icons";
import type { ReactNode } from "react";
import { ClearButton } from "../internal/ClearButton.js";

interface StepperButtonProps {
  direction: 1 | -1;
  disabled?: boolean;
  onPress: (direction: 1 | -1) => void;
}

/**
 * One stepper button. `onMouseDown` is where the press is neutralised and `onClick` is where it
 * acts: preventing the default of the mousedown stops the browser moving focus to the button, so
 * the input keeps it and its in-progress edit is never blurred into a commit that the step would
 * then follow with a second `onChange`.
 *
 * `tabIndex={-1}` keeps both buttons out of the tab order: Up and Down already reach the same
 * step from the input itself, so a keyboard user gains nothing from two more stops and a tab
 * through a form of number fields would otherwise take three each.
 */
function StepperButton({ direction, disabled, onPress }: StepperButtonProps) {
  const Chevron = direction === 1 ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      className="vpg-number-input-stepper"
      tabIndex={-1}
      disabled={disabled}
      aria-label={direction === 1 ? "Increase value" : "Decrease value"}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => onPress(direction)}
    >
      <Chevron className="vpg-number-input-stepper-icon" aria-hidden="true" />
    </button>
  );
}

export interface ClearVisibility {
  clearable: boolean | undefined;
  /** The string in the box, not the committed value, so unreadable text left there can still be
   * cleared. */
  display: string;
  disabled: boolean | undefined;
  readOnly: boolean | undefined;
}

/** Whether the clear button renders: a clearable field with something in the box that accepts an
 * edit. A disabled or read-only field takes none, so it shows no button offering one. */
export function showsClearButton({ clearable, display, disabled, readOnly }: ClearVisibility): boolean {
  return Boolean(clearable) && display !== "" && !disabled && !readOnly;
}

export interface NumberInputTrailingOptions extends ClearVisibility {
  /** The caller's own adornment. */
  trailing: ReactNode;
  steppers: boolean | undefined;
  clearLabel: string;
  onStep: (direction: 1 | -1) => void;
  onClear: () => void;
}

/**
 * What `NumberInput` puts in `FieldShell`'s trailing slot: the caller's adornment, then the
 * steppers, then the clear button. The field's own affordances go after the caller's so they stay
 * against the field's trailing edge whatever the caller put beside them, and the clear button goes
 * last of all, where every clearable field in the package puts it.
 *
 * With neither steppers nor a clear button it is `trailing` itself, unwrapped: `FieldShell` renders
 * no slot for an empty adornment, and a fragment would never read as empty.
 */
export function numberInputTrailing({
  trailing,
  steppers,
  clearLabel,
  onStep,
  onClear,
  ...visibility
}: NumberInputTrailingOptions): ReactNode {
  const showClear = showsClearButton(visibility);
  if (!steppers && !showClear) {
    return trailing;
  }
  return (
    <>
      {trailing}
      {steppers ? (
        <span className="vpg-number-input-steppers">
          <StepperButton direction={1} disabled={visibility.disabled} onPress={onStep} />
          <StepperButton direction={-1} disabled={visibility.disabled} onPress={onStep} />
        </span>
      ) : null}
      {showClear ? <ClearButton label={clearLabel} onClear={onClear} /> : null}
    </>
  );
}
