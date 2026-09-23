import { ChevronDown, ChevronUp } from "@vipengele/react-icons";
import { Numeric } from "@vipengele/ts-core-common/types/numeric";
import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { numberInputStylesheet } from "./NumberInput.stylesheet.js";

// The runtime's own locale, not the page's and not a prop's — a user reading a field formatted
// for someone else's locale is the failure this replaces (ADR-0020). It cannot change without a
// reload, so it is read once at module scope rather than on every render of every instance.
const locale = Intl.NumberFormat().resolvedOptions().locale;

export interface NumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> {
  /** A ref to the visible `<input>` — the element a caller focuses and selects text in. The
   * hidden input that carries the form value is not reachable through it.
   * `InputHTMLAttributes` carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLInputElement>;
  /** The controlled value. While the input has focus an update to it does not reach the box: the
   * edit under the caret wins until the user commits (ADR-0020). */
  value?: number;
  /** The initial value of an uncontrolled field. */
  defaultValue?: number;
  /** Called on **commit** only — blur, Enter, or a step — never per keystroke. A field left
   * empty, and one holding a string that does not spell a number, both report `undefined`. */
  onChange?: (value: number | undefined) => void;
  /** The lower bound. Reported as `aria-valuemin` and enforced on stepping; a value the user
   * types below it commits as typed and is flagged through `aria-invalid` instead. */
  min?: number;
  /** The upper bound, with the same two behaviours as `min`. */
  max?: number;
  /** The amount an arrow key moves the value by. Its own decimal precision is the precision a
   * step rounds to, so stepping by `0.1` yields `0.3` rather than `0.30000000000000004`. */
  step?: number;
  /** An adornment rendered before the input, inside the field's border — an icon, a prefix, a
   * currency symbol. Passed straight to `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the input, inside the field's border — a unit, a spinner, an
   * interactive button. Passed straight to `FieldShell`'s slot of the same name, and rendered
   * before the stepper buttons when `steppers` is set. */
  trailing?: ReactNode;
  /** Renders visible increment and decrement buttons in the trailing slot. Stepping by arrow key
   * needs none of them, so they are the caller's choice of affordance rather than the default. */
  steppers?: boolean;
}

/**
 * Decimal places `step` is written to, which is the precision a step rounds its result to.
 * `Number(v.toFixed(places))` is the rounding; `Math.round(v / step) * step` is not, because the
 * division reintroduces exactly the float error the rounding exists to remove.
 *
 * Exponent notation is part of a number's own `toString()` below `1e-6`, so `1e-7` has seven
 * decimal places rather than the zero its mantissa shows. The cap at 10 keeps a step that was
 * itself computed from float noise — `0.30000000000000004` — from demanding a precision
 * `toFixed` cannot honour.
 */
function decimalPlaces(step: number): number {
  const text = Math.abs(step).toString();
  const exponentAt = text.indexOf("e-");
  const mantissa = exponentAt === -1 ? text : text.slice(0, exponentAt);
  const shift = exponentAt === -1 ? 0 : Number(text.slice(exponentAt + 2));
  const pointAt = mantissa.indexOf(".");
  const fraction = pointAt === -1 ? 0 : mantissa.length - pointAt - 1;
  return Math.min(fraction + shift, 10);
}

/**
 * A locale-aware numeric field: `<input type="text" inputMode="decimal">` with `role="spinbutton"`
 * inside the `FieldShell` that draws the field's chrome. It is deliberately not a wrapper around
 * `<input type="number">` — see ADR-0020 for what that element does that this one must not.
 *
 * Two values live here, and they are not the same value. The string in the box is what the user is
 * writing, in their own locale, possibly mid-number (`1 234,`); the committed value is the
 * `number | undefined` the caller owns. `onChange` fires when the two are reconciled — on blur, on
 * Enter, or on an arrow-key step — never per keystroke, since a parse of a half-typed number is
 * not a value anyone asked for.
 *
 * There is no wheel handler. A gesture the user made to scroll the page never changes the value.
 *
 * Visible stepper buttons are opt-in through `steppers`, and step through the same `stepBy` the
 * arrow keys do, so a press and a key produce the same value.
 */
export function NumberInput(props: NumberInputProps) {
  const {
    value,
    defaultValue,
    onChange,
    min,
    max,
    step = 1,
    leading,
    trailing,
    steppers,
    className,
    name,
    disabled,
    ref,
    onFocus,
    onBlur,
    onKeyDown,
    "aria-invalid": ariaInvalid,
    ...rest
  } = props;

  // A controlled field is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled field spells "empty".
  const isControlled = "value" in props;

  const formatValue = (numeric: number | undefined) => (numeric === undefined ? "" : Numeric.format(numeric, locale));

  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState<number | undefined>(defaultValue);
  const [draft, setDraft] = useState(() => formatValue(isControlled ? value : defaultValue));
  const [focused, setFocused] = useState(false);
  // Set when the last commit could not read a number out of the box. The string stays on screen —
  // erasing what the user typed is how they lose the evidence of their own mistake.
  const [unparseable, setUnparseable] = useState(false);
  // The string as it stood at the last commit. Re-parsing and reformatting an untouched string is
  // a no-op, so a blur that follows no edit skips both.
  const committedDraft = useRef(draft);

  // The controlled `value` this component has acted on so far. A parent moving `value` on
  // without the user touching the box is not visible to `commit()`, so it is caught by comparing
  // against this on every unfocused render instead — deliberately *not* updated while focused, so
  // a `value` that changes mid-edit is still caught once the field blurs rather than being
  // consumed here and missed there. Only an unfocused mismatch means anything: `commit()` already
  // reconciles `unparseable` with whatever it just committed, so this exists purely to catch a
  // change this component did not make itself (ADR-0020's "the display always derives from
  // `value`" once the input is unfocused).
  const [previousControlledValue, setPreviousControlledValue] = useState(value);
  if (isControlled && !focused && value !== previousControlledValue) {
    setPreviousControlledValue(value);
    if (unparseable) {
      setUnparseable(false);
    }
  }

  const committed = isControlled ? value : uncontrolledValue;
  const display = focused || unparseable ? draft : formatValue(committed);
  const outOfRange = committed !== undefined && ((min !== undefined && committed < min) || (max !== undefined && committed > max));

  const commit = (next: number | undefined, text: string) => {
    setUncontrolledValue(next);
    setDraft(text);
    setUnparseable(next === undefined && text.trim() !== "");
    committedDraft.current = text;
    onChange?.(next);
  };

  const commitDraft = () => {
    if (draft === committedDraft.current) {
      return;
    }
    // `tryParse`, never `parse`: a string the user is free to type is not a programmer error, so
    // it must not throw. `value` is present exactly when the parse succeeded.
    const next = Numeric.tryParse(draft, locale).value;
    // An out-of-range number commits as the number it is. Only an unreadable string commits as
    // `undefined`, and then the text the user wrote stays in the box.
    commit(next, next === undefined ? draft : formatValue(next));
  };

  const stepBy = (direction: 1 | -1) => {
    // Stepping starts from what is on screen, so an arrow key after typing moves the typed number
    // rather than the one committed before it.
    const base = Numeric.tryParse(display, locale).value ?? 0;
    let next = Number((base + direction * step).toFixed(decimalPlaces(step)));
    // Rounding first and clamping second: a bound is an exact number, so landing on it can carry
    // no float error, while rounding a clamped result could push it back past the bound.
    if (min !== undefined && next < min) {
      next = min;
    }
    if (max !== undefined && next > max) {
      next = max;
    }
    commit(next, formatValue(next));
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    // The box may be showing a string the draft state does not hold — a controlled parent that
    // declined the last commit, for one. Adopting it here is what stops the text jumping as focus
    // lands.
    setDraft(display);
    committedDraft.current = display;
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    commitDraft();
    setFocused(false);
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      stepBy(1);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      stepBy(-1);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      // No `preventDefault()` and no `requestSubmit()`: the browser's implicit-submission rules
      // decide whether this Enter submits, exactly as they do for any other text input. That
      // native submit reads the hidden input in this same tick, before React would flush, so the
      // commit's state updates are forced through first.
      flushSync(commitDraft);
    }
    onKeyDown?.(event);
  };

  const classes = ["vpg-number-input", "vpg-field-shell-control", className].filter(Boolean).join(" ");

  /**
   * One stepper button. `onMouseDown` is where the press is neutralised and `onClick` is where it
   * acts: preventing the default of the mousedown stops the browser moving focus to the button, so
   * the input keeps it and its in-progress edit is never blurred into a commit that the step would
   * then follow with a second `onChange`. The explicit `focus()` covers the other direction — a
   * press that arrives while focus is elsewhere puts it on the input, so the arrow keys carry on
   * from where the button left off. It runs before the step, since focusing adopts what is on
   * screen as the draft and doing that after the step would adopt the pre-step string.
   *
   * `tabIndex={-1}` keeps both buttons out of the tab order: Up and Down already reach the same
   * `stepBy` from the input itself, so a keyboard user gains nothing from two more stops and a tab
   * through a form of number fields would otherwise take three each.
   */
  const stepper = (direction: 1 | -1) => {
    const Chevron = direction === 1 ? ChevronUp : ChevronDown;
    return (
      <button
        type="button"
        className="vpg-number-input-stepper"
        tabIndex={-1}
        disabled={disabled}
        aria-label={direction === 1 ? "Increase value" : "Decrease value"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          inputRef.current?.focus();
          stepBy(direction);
        }}
      >
        <Chevron className="vpg-number-input-stepper-icon" aria-hidden="true" />
      </button>
    );
  };

  // A caller's own adornment and the steppers share the slot, the steppers last so they stay
  // against the field's trailing edge whatever the caller put beside them.
  const trailingContent = steppers ? (
    <>
      {trailing}
      <span className="vpg-number-input-steppers">
        {stepper(1)}
        {stepper(-1)}
      </span>
    </>
  ) : (
    trailing
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N number inputs on a page inject one
        stylesheet.
      */}
      <style href="vpg-number-input" precedence="vpg-number-input">
        {numberInputStylesheet}
      </style>
      <FieldShell leading={leading} trailing={trailingContent}>
        <input
          {...rest}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          className={classes}
          disabled={disabled}
          value={display}
          role="spinbutton"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={committed}
          aria-valuetext={committed === undefined ? undefined : formatValue(committed)}
          aria-invalid={unparseable || outOfRange || ariaInvalid}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={(node) => {
            inputRef.current = node;
            // A caller's ref is a function, an object, or absent; forwarding it by hand is what
            // lets this component keep a ref of its own to the same element.
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
        />
        {/*
          The form value, unformatted. The visible input carries no `name`, because naming it would
          submit the locale-formatted string — `1 234,5` — and no server should have to parse that.
          Mirroring `disabled` keeps a disabled field out of the submission, as a disabled native
          control is.
        */}
        <input type="hidden" name={name} disabled={disabled} value={committed === undefined ? "" : String(committed)} />
      </FieldShell>
    </>
  );
}
