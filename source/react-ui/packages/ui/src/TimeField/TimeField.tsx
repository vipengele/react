import type { Locale, LocalTime } from "@vipengele/ts";
import type { HTMLAttributes, ReactNode, Ref } from "react";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { timeFieldStylesheet } from "./TimeField.stylesheet.js";
import { TimeFieldSegment } from "./TimeFieldSegment.js";
import { displaySegments } from "./timeSegments.js";
import { useTimeField } from "./useTimeField.js";

export interface TimeFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "role" | "children"> {
  /** A ref to the `role="group"` element holding the segments. The hidden input that carries the
   * form value is not reachable through it. `HTMLAttributes` carries no `ref`, so the prop is
   * declared here. */
  ref?: Ref<HTMLDivElement>;
  /** The locale the segments are ordered, labelled and clocked in: it decides 12- or 24-hour and
   * where the AM/PM segment sits. Defaults to the nearest `LocaleProvider`'s, then the runtime's
   * own. */
  locale?: Locale;
  /** The controlled value. While focus is inside the field an update to it does not reach the
   * segments: the edit in progress wins until the user commits (ADR-0025). */
  value?: LocalTime;
  /** The initial value of an uncontrolled field. */
  defaultValue?: LocalTime;
  /** Called on **commit** only — focus leaving the field, Enter, or the last segment being filled —
   * and only with every segment filled, or every segment empty for `undefined`. A partly filled
   * field reports nothing and is flagged through `aria-invalid` once focus leaves it; a filled time
   * outside `min` and `max` reports nothing and is flagged at once. */
  onChange?: (value: LocalTime | undefined) => void;
  /** Shows a `second` segment. Without it a value with non-zero seconds shows its hour and minute,
   * keeps its seconds while the user leaves it alone, and commits with zero seconds once edited. */
  seconds?: boolean;
  /** The earliest time the field accepts, inclusive. An arrow step of a filled field that would
   * go before it does nothing, and a filled time before it is rejected on commit: the segments
   * keep it, the group is `aria-invalid`, and `onChange` is not called. A `value` or
   * `defaultValue` before it is shown as it is, `aria-invalid`, and never corrected. A `min` after
   * `max` is unsupported. Each segment's `aria-valuemin` and `aria-valuemax` stay that segment's
   * own range. */
  min?: LocalTime;
  /** The latest time the field accepts, inclusive, enforced as `min` is: an arrow step of a filled
   * field that would go past it does nothing, a filled time after it is rejected on commit with
   * the text kept, `aria-invalid` set and `onChange` not called, and a `value` or `defaultValue`
   * after it is shown as it is, `aria-invalid`, and never corrected. */
  max?: LocalTime;
  /** The form field name, carried by a hidden input holding the ISO 8601 value (`14:30`, or
   * `14:30:15` when the value has seconds). */
  name?: string;
  /** Takes every segment out of the tab order, ignores input, and leaves the field out of a
   * submitted form. */
  disabled?: boolean;
  /** An adornment rendered before the segments, inside the field's border. Passed straight to
   * `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the segments, inside the field's border. Passed straight to
   * `FieldShell`'s slot of the same name. */
  trailing?: ReactNode;
}

/**
 * A segmented time field: hour, minute, an optional second and, on a 12-hour locale, AM/PM, each a
 * `role="spinbutton"` inside one `role="group"`, inside the `FieldShell` that draws the field's
 * chrome. The group is the shell's marked control and the element `FormField` clones its `id`,
 * label, description and `aria-invalid` onto.
 *
 * Two values live here, as in `NumberInput`. The segments hold what the user is entering, possibly
 * half of it; the committed value is the `LocalTime | undefined` the caller owns. `onChange` fires
 * when the two are reconciled — focus leaving the field, Enter, or the last segment being filled —
 * and never for a field that is only partly filled. All of the segment arithmetic is the pure model
 * in `timeSegments.ts`; `useTimeField` wires it to keys (`timeFieldKeys.ts`), to the `beforeinput`
 * a virtual keyboard types through (`timeFieldInput.ts`) and to focus, and this component renders it
 * and carries the committed value into the form.
 *
 * Digits fill a segment and move focus on once it is full, the up and down arrows step it and wrap,
 * a typed letter picks AM or PM, and Backspace or Delete empties it. Left and right move between
 * segments in the direction they appear on screen, so in a right-to-left context the left arrow
 * moves to the segment logically after; the DOM, and so Tab, keeps the logical order. There is no
 * wheel handler.
 */
export function TimeField(props: TimeFieldProps) {
  const {
    locale,
    value,
    defaultValue,
    onChange,
    seconds = false,
    min,
    max,
    name,
    disabled,
    leading,
    trailing,
    className,
    ref,
    onFocus,
    onBlur,
    "aria-invalid": ariaInvalid,
    ...rest
  } = props;

  // A controlled field is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled field spells "empty".
  const field = useTimeField({
    controlled: "value" in props,
    value,
    defaultValue,
    onChange,
    locale,
    seconds,
    min,
    max,
    disabled,
    onFocus,
    onBlur,
  });
  const { committed } = field;

  const classes = ["vpg-time-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");
  // At most one literal sits between two editable segments, so the segment before it names it.
  let previous = "start";

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N time fields on a page inject one
        stylesheet.
      */}
      <style href="vpg-time-field" precedence="vpg-time-field">
        {timeFieldStylesheet}
      </style>
      {/*
        A touch or a pen pressing the field makes its segments editable, so the segment that takes
        focus raises a virtual keyboard. A press on the field's own area — the shell's padding, the
        group, a literal — focuses a segment, so tapping anywhere on the control does. The adornment
        slots are the caller's and are left alone.
      */}
      <FieldShell
        leading={leading}
        trailing={trailing}
        onPointerDown={field.onShellPointerDown}
        onMouseDown={field.onShellMouseDown}
        onClick={field.onShellClick}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> carries its own border, padding and min-content width inside the shell; a composite control is a plain role="group" */}
        <div
          {...rest}
          ref={ref}
          role="group"
          className={classes}
          aria-invalid={field.incomplete || field.rejected || field.committedRejected || ariaInvalid}
          aria-disabled={disabled}
          onFocus={field.onFocus}
          onBlur={field.onBlur}
        >
          {displaySegments(field.layout, field.fieldState).map((part) => {
            if (part.type === "literal") {
              return (
                <span key={`after-${previous}`} className="vpg-time-field-literal" aria-hidden="true">
                  {part.text}
                </span>
              );
            }
            previous = part.type;
            return (
              <TimeFieldSegment
                key={part.type}
                part={part}
                disabled={disabled}
                editable={field.editable}
                last={part.type === field.layout.editable.at(-1)}
                onKeyDown={field.segmentKeyDown(part.type)}
                onInput={field.segmentInput(part.type)}
                segmentRef={field.segmentRef(part.type)}
              />
            );
          })}
        </div>
        {/*
          The form value, as ISO 8601. The segments carry no `name`, because what they show is the
          locale's formatting, and no server should have to parse that. Mirroring `disabled` keeps
          a disabled field out of the submission, as a disabled native control is.
        */}
        <input type="hidden" name={name} disabled={disabled} value={committed === undefined ? "" : committed.toString()} />
      </FieldShell>
    </>
  );
}
