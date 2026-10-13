import { type LocalDate, LocalDateTime, type LocalTime } from "@vipengele/ts";

/**
 * What a date-time field holds: the date its `DateField` has committed and the time its
 * `TimeField` has committed, each `undefined` while that half is empty. The two halves fill
 * independently, so either may be set without the other; only both together are a value.
 */
export interface DateTimeHalves {
  readonly date: LocalDate | undefined;
  readonly time: LocalTime | undefined;
}

/**
 * The inclusive range a field's date-time must fall in. Either end may be absent, and `min` is
 * never after `max`.
 */
export interface DateTimeBounds {
  readonly min?: LocalDateTime | undefined;
  readonly max?: LocalDateTime | undefined;
}

/** The inclusive range handed to the `DateField` half. */
export interface DateBounds {
  readonly min: LocalDate | undefined;
  readonly max: LocalDate | undefined;
}

/** The inclusive range handed to the `TimeField` half once a date is chosen. */
export interface TimeBounds {
  readonly min: LocalTime | undefined;
  readonly max: LocalTime | undefined;
}

/**
 * What a change to the halves asks the field to report. `none` means there is nothing to report:
 * the halves still spell the committed value, or a half-filled field follows no committed value.
 * `rejected` means both halves are filled with a date-time outside the bounds, which reports
 * nothing and leaves the committed value standing. A `value` is reported through `onChange`.
 */
export type DateTimeCommit =
  | { readonly kind: "none" }
  | { readonly kind: "rejected" }
  | { readonly kind: "value"; readonly value: LocalDateTime | undefined };

/** The halves with neither filled. */
export const EMPTY_HALVES: DateTimeHalves = { date: undefined, time: undefined };

/** The halves `value` fills: both from a date-time, neither from `undefined`. */
export function splitDateTime(value: LocalDateTime | undefined): DateTimeHalves {
  return value === undefined ? EMPTY_HALVES : { date: value.date, time: value.time };
}

/** The date-time both halves spell, or `undefined` while either is empty. No time is invented. */
export function joinHalves({ date, time }: DateTimeHalves): LocalDateTime | undefined {
  return date === undefined || time === undefined ? undefined : LocalDateTime.of(date, time);
}

/** Whether `a` and `b` name the same date-time, or are both `undefined`. */
export function sameDateTime(a: LocalDateTime | undefined, b: LocalDateTime | undefined): boolean {
  return a === undefined || b === undefined ? a === b : a.equals(b);
}

/** Whether exactly one half is filled — a field that spells no value and is not empty either. */
export function isHalfFilled({ date, time }: DateTimeHalves): boolean {
  return (date === undefined) !== (time === undefined);
}

/** Whether `value` lies before `bounds.min` or after `bounds.max`. */
export function isOutOfBounds(value: LocalDateTime, { min, max }: DateTimeBounds): boolean {
  return (min !== undefined && LocalDateTime.compare(value, min) < 0) || (max !== undefined && LocalDateTime.compare(value, max) > 0);
}

/** Whether both halves are filled with a date-time outside `bounds`. */
export function isRejected(halves: DateTimeHalves, bounds: DateTimeBounds): boolean {
  const joined = joinHalves(halves);
  return joined !== undefined && isOutOfBounds(joined, bounds);
}

/**
 * Whether the field is flagged invalid: both halves filled outside `bounds`, which flags at once,
 * or exactly one half filled once focus has left the whole group (`groupLeft`). A half-filled
 * field is not flagged while focus is still inside it, since the user may be moving on to the
 * other half.
 */
export function isInvalid(halves: DateTimeHalves, bounds: DateTimeBounds, groupLeft: boolean): boolean {
  return isRejected(halves, bounds) || (groupLeft && isHalfFilled(halves));
}

/** The bounds of the `DateField` half: the dates of `bounds.min` and `bounds.max`, always. */
export function dateBounds({ min, max }: DateTimeBounds): DateBounds {
  return { min: min?.date, max: max?.date };
}

/**
 * The bounds of the `TimeField` half once `date` is chosen. `min`'s time applies only on `min`'s
 * own date and `max`'s only on `max`'s, since every time of a date strictly between them is in
 * range. Without a date neither applies: no date decides which times are allowed.
 */
export function timeBounds(date: LocalDate | undefined, { min, max }: DateTimeBounds): TimeBounds {
  return {
    min: date !== undefined && min?.date.equals(date) ? min.time : undefined,
    max: date !== undefined && max?.date.equals(date) ? max.time : undefined,
  };
}

/**
 * What the field reports once an edit takes its halves from `previous` to `halves`, given the value
 * it last committed.
 *
 * Both halves filled in range report their date-time, unless it is the committed value already;
 * filled out of range they are `rejected`. With either half empty, the field reports `undefined`
 * only when `previous` spelled the committed value — emptying either half of a complete value
 * clears it. Otherwise it reports nothing: a field with no committed value has nothing to clear,
 * and halves that a rejected edit has moved off the committed value no longer show it, so emptying
 * one of them leaves that value standing rather than clearing a value the user cannot see.
 */
export function commitHalves(
  previous: DateTimeHalves,
  halves: DateTimeHalves,
  committed: LocalDateTime | undefined,
  bounds: DateTimeBounds,
): DateTimeCommit {
  const joined = joinHalves(halves);
  if (joined === undefined) {
    const spelledCommitted = committed !== undefined && sameDateTime(joinHalves(previous), committed);
    return spelledCommitted ? { kind: "value", value: undefined } : { kind: "none" };
  }
  if (isOutOfBounds(joined, bounds)) return { kind: "rejected" };
  return sameDateTime(joined, committed) ? { kind: "none" } : { kind: "value", value: joined };
}

/**
 * The halves to show once the committed value is `incoming`, given the value the halves were
 * last seeded from or last committed (`seeded`).
 *
 * An `incoming` that names a different date-time from `seeded` reseeds both halves from it, so a
 * parent that moves the value on, clears a complete value, or declines a commit by holding its
 * own is shown. An `incoming` the halves already account for leaves them alone and returns
 * `halves` itself: a controlled `value={undefined}` beside a half-filled field is the field's own
 * empty value, and wiping the filled half would lose what the user entered.
 */
export function reseedHalves(
  halves: DateTimeHalves,
  incoming: LocalDateTime | undefined,
  seeded: LocalDateTime | undefined,
): DateTimeHalves {
  return sameDateTime(incoming, seeded) ? halves : splitDateTime(incoming);
}

/**
 * The form value of a committed date-time: ISO 8601 `YYYY-MM-DDTHH:mm`, with `:ss` only when the
 * second is non-zero, as the `TimeField` half writes its own time. Empty while there is no value.
 */
export function serialiseDateTime(value: LocalDateTime | undefined): string {
  return value === undefined ? "" : value.toString();
}
