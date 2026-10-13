import type { Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { type AriaAttributes, type CSSProperties, type FocusEvent, type Ref, useState } from "react";
import { DateField } from "../DateField/DateField.js";
import { useControllableState } from "../internal/useControllableState.js";
import { TimeField } from "../TimeField/TimeField.js";
import { dateTimeFieldStylesheet } from "./DateTimeField.stylesheet.js";
import {
  commitHalves,
  type DateTimeBounds,
  type DateTimeHalves,
  dateBounds,
  isInvalid,
  reseedHalves,
  serialiseDateTime,
  splitDateTime,
  timeBounds,
} from "./dateTimeFieldModel.js";

export interface DateTimeFieldProps {
  /** A ref to the `role="group"` element holding both halves. */
  ref?: Ref<HTMLDivElement>;
  /** The controlled value. Passing the prop at all makes the field controlled, so
   * `value={undefined}` is a controlled, empty field — one that still keeps a half the user has
   * filled on its own. A different date-time reseeds both halves. */
  value?: LocalDateTime;
  /** The initial value of an uncontrolled field. */
  defaultValue?: LocalDateTime;
  /** Called with the date-time once both halves are committed, and with `undefined` once either
   * half of a complete value is emptied. A field with only one half filled reports nothing: no
   * time of day is invented for a date on its own. */
  onChange?: (value: LocalDateTime | undefined) => void;
  /** The earliest date-time the field reports, inclusive. Its date bounds the date half always;
   * its time bounds the time half only while the chosen date is its date. */
  min?: LocalDateTime;
  /** The latest date-time the field reports, inclusive, applied to the halves as `min` is. */
  max?: LocalDateTime;
  /** Shows a `second` segment in the time half. */
  seconds?: boolean;
  /** The locale both halves are written, read and clocked in. Defaults to the nearest
   * `LocaleProvider`'s, then the runtime's own. */
  locale?: Locale;
  /** Disables both halves and leaves the field out of a submitted form. */
  disabled?: boolean;
  /** The form field name, carried by one hidden input holding the ISO 8601 date-time
   * (`2026-10-01T14:30`, with `:ss` when the second is non-zero). The halves carry no name. */
  name?: string;
  /** Lands on the date half's input, so a `<label htmlFor>` — `FormField`'s — reaches the field. */
  id?: string;
  /** Lands on the group, beside its own class. */
  className?: string;
  /** Lands on the group. */
  style?: CSSProperties;
  /** Names the group. */
  "aria-label"?: string;
  /** Names the group. */
  "aria-labelledby"?: string;
  /** Describes the group. */
  "aria-describedby"?: string;
  /** Flags both halves invalid, on top of what the field flags itself. */
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  /** The date half's accessible name. Defaults to `"Date"`. */
  dateLabel?: string;
  /** The time half's accessible name. Defaults to `"Time"`. */
  timeLabel?: string;
}

/**
 * The committed value, controlled or not. `undefined` is how a controlled field spells "empty", so
 * `null` stands for that empty value inside `useControllableState`, whose own `undefined` means
 * "uncontrolled".
 */
function useCommittedDateTime(props: DateTimeFieldProps) {
  const { value, defaultValue, onChange } = props;
  const [current, setCurrent] = useControllableState<LocalDateTime | null>(
    "value" in props ? (value ?? null) : undefined,
    () => defaultValue ?? null,
    (next) => onChange?.(next ?? undefined),
  );
  return { committed: current ?? undefined, setCurrent };
}

/**
 * A `DateField` and a `TimeField` side by side, editing one `LocalDateTime`. The two sit in one
 * `role="group"` that takes the field's name and description, and wrap onto two lines when the
 * row cannot hold both.
 *
 * The field owns its two halves, each `undefined` until the user commits it, and the committed
 * value the caller owns. A change to either half reports the date-time once both are filled,
 * `undefined` once either half of a complete value is emptied, and nothing while only one half is
 * filled — no time is invented for a date on its own. The halves follow the committed value: one
 * the halves do not already spell reseeds both, so a parent that moves the value on or holds its
 * own over a reported one is shown, while a controlled `value={undefined}` beside a half-filled
 * field leaves what the user entered in place.
 *
 * `min` and `max` bound the date-time as a whole. The date half takes their dates; the time half
 * takes a bound's time only while the chosen date is that bound's date. Both halves filled with a
 * date-time outside the bounds report nothing and are both flagged `aria-invalid` at once. A field
 * with only one half filled is flagged once focus leaves the whole group, and not while focus moves
 * between the halves.
 *
 * Neither half carries a `name`: one hidden input submits the committed date-time as ISO 8601.
 */
export function DateTimeField(props: DateTimeFieldProps) {
  const {
    min,
    max,
    seconds,
    locale,
    disabled,
    name,
    id,
    className,
    style,
    ref,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    dateLabel = "Date",
    timeLabel = "Time",
  } = props;
  const bounds: DateTimeBounds = { min, max };
  const { committed, setCurrent } = useCommittedDateTime(props);

  const [halves, setHalves] = useState<DateTimeHalves>(() => splitDateTime(committed));
  // The value the halves were last seeded from or last reported. A committed value that differs
  // from it is one the halves do not account for.
  const [seeded, setSeeded] = useState(committed);
  // Set once focus leaves the whole group, and cleared when it comes back in.
  const [groupLeft, setGroupLeft] = useState(false);

  const reseeded = reseedHalves(halves, committed, seeded);
  if (reseeded !== halves) {
    setHalves(reseeded);
    setSeeded(committed);
  }

  const change = (next: DateTimeHalves) => {
    setHalves(next);
    const result = commitHalves(halves, next, committed, bounds);
    if (result.kind === "value") {
      setSeeded(result.value);
      setCurrent(result.value ?? null);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setGroupLeft(true);
    }
  };

  const invalid = isInvalid(halves, bounds, groupLeft) || ariaInvalid;
  const dates = dateBounds(bounds);
  const times = timeBounds(halves.date, bounds);
  const classes = ["vpg-date-time-field", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N date-time fields on a page inject
        one stylesheet.
      */}
      <style href="vpg-date-time-field" precedence="vpg-date-time-field">
        {dateTimeFieldStylesheet}
      </style>
      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> carries its own border, padding and min-content width; the two fields are a plain role="group" */}
      <div
        ref={ref}
        role="group"
        className={classes}
        style={style}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        onFocus={() => setGroupLeft(false)}
        onBlur={handleBlur}
      >
        <DateField
          id={id}
          aria-label={dateLabel}
          value={halves.date}
          onChange={(date: LocalDate | undefined) => change({ ...halves, date })}
          min={dates.min}
          max={dates.max}
          locale={locale}
          disabled={disabled}
          aria-invalid={invalid}
        />
        <TimeField
          aria-label={timeLabel}
          value={halves.time}
          onChange={(time: LocalTime | undefined) => change({ ...halves, time })}
          min={times.min}
          max={times.max}
          seconds={seconds}
          locale={locale}
          disabled={disabled}
          aria-invalid={invalid}
        />
        {/*
          The form value as an ISO 8601 date-time. Neither half carries a `name`, so the form holds
          this one value rather than a date and a time a server would have to join. Mirroring
          `disabled` keeps a disabled field out of the submission, as a disabled native control is.
        */}
        <input type="hidden" name={name} disabled={disabled} value={serialiseDateTime(committed)} />
      </div>
    </>
  );
}
