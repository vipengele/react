import { type DateTimeSegment, type Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";

/**
 * The pure model behind `DateTimeField`: the text its one input shows, what typed text commits,
 * what a day or a time picked in the popover commits, and when a picked day still waiting for its
 * time flags the field invalid. Nothing here touches React or the DOM.
 *
 * The text is the date as `LocalDate#format` writes it and the time as `LocalTime#format` writes
 * it, in the order the locale puts them in when it writes both, joined by a single space:
 * `10/15/2026 09:05 PM` in `en-US`, `15.10.2026 21:05` in `de-DE`, `2026. 10. 15. 오후 09:05` in
 * `ko-KR`, `21:05 15/10/2026` in `vi`. The text `Intl` writes around and between the two halves
 * (`, ` in `en-US`, the parentheses of `eu`) is not part of it, so a value reads the same way
 * whatever punctuation the locale's combined layout carries.
 */

/**
 * The inclusive range a field's date-time must fall in. Either end may be absent, and `min` is
 * never after `max`.
 */
export interface DateTimeBounds {
  readonly min?: LocalDateTime | undefined;
  readonly max?: LocalDateTime | undefined;
}

/** The inclusive range handed to the calendar: the dates of the field's bounds. */
export interface DateBounds {
  readonly min: LocalDate | undefined;
  readonly max: LocalDate | undefined;
}

/** The inclusive range of times allowed on one date. */
export interface TimeBounds {
  readonly min: LocalTime | undefined;
  readonly max: LocalTime | undefined;
}

/** Any date-time will do: the order a locale writes a date and a time in does not depend on which. */
const REFERENCE_DATE_TIME = LocalDateTime.ofFields(2000, 1, 1, 13, 30);

/** The segment types of a date's fields; every other non-literal segment is one of the time's. */
const DATE_FIELDS: ReadonlySet<DateTimeSegment["type"]> = new Set(["year", "month", "day"]);

/** The literal the field writes between the date and the time, in either order. */
const HALF_SEPARATOR: DateTimeSegment = { type: "literal", value: " " };

/** Whether `locale` writes the time before the date when it writes both. */
function timeComesFirst(locale: Locale): boolean {
  const first = REFERENCE_DATE_TIME.segments(locale).find((segment) => segment.type !== "literal");
  return first !== undefined && !DATE_FIELDS.has(first.type);
}

/**
 * The parts of the field's text for `value` under `locale`: the date's segments as
 * `LocalDate#segments` splits them and the time's as `LocalTime#segments` does, in the order
 * `LocalDateTime#segments` puts them, with a single-space literal between the two. The hour and
 * minute are written and the second never is.
 */
export function dateTimeSegments(value: LocalDateTime, locale: Locale): DateTimeSegment[] {
  const date = value.date.segments(locale);
  const time = value.time.segments(locale);
  return timeComesFirst(locale) ? [...time, HALF_SEPARATOR, ...date] : [...date, HALF_SEPARATOR, ...time];
}

/** The field's text for `value` under `locale`: `dateTimeSegments` joined. */
export function formatDateTimeText(value: LocalDateTime, locale: Locale): string {
  return dateTimeSegments(value, locale)
    .map((segment) => segment.value)
    .join("");
}

/**
 * The date-time `text` writes as the field writes it: a date and a time in `locale`'s own
 * patterns, in the locale's order, with whitespace between them. Each run of whitespace in the
 * text is tried as the gap between the halves, since either half may hold whitespace of its own
 * (`2026. 10. 15.` and `오후 09:05` in `ko-KR`).
 */
function parseSpacedHalves(text: string, locale: Locale): LocalDateTime | undefined {
  const trimmed = text.trim();
  const timeFirst = timeComesFirst(locale);
  for (const gap of trimmed.matchAll(/\s+/g)) {
    const head = trimmed.slice(0, gap.index);
    const tail = trimmed.slice(gap.index + gap[0].length);
    const date = LocalDate.tryParseLocalized(timeFirst ? tail : head, locale).value;
    if (date === undefined) continue;
    const time = LocalTime.tryParseLocalized(timeFirst ? head : tail, locale).value;
    if (time !== undefined) return LocalDateTime.of(date, time);
  }
  return undefined;
}

/**
 * The date-time `text` writes: as the field writes it, else in the locale's combined layout as
 * `LocalDateTime#format` writes it (`10/15/2026, 09:05 PM` in `en-US`), else in ISO 8601
 * (`2026-10-15T21:05`), so a pasted value reads in every locale. Unpadded fields and a day period
 * in either letter case read as the locale's parsers read them. The minute is kept as written,
 * whatever step a time picker offers.
 */
export function parseDateTimeText(text: string, locale: Locale): LocalDateTime | undefined {
  return (
    parseSpacedHalves(text, locale) ?? LocalDateTime.tryParseLocalized(text, locale).value ?? LocalDateTime.tryParse(text.trim()).value
  );
}

/** Whether `a` and `b` name the same date-time, or are both `undefined`. */
export function sameDateTime(a: LocalDateTime | undefined, b: LocalDateTime | undefined): boolean {
  return a === undefined || b === undefined ? a === b : a.equals(b);
}

/** Whether `value` lies before `bounds.min` or after `bounds.max`. */
export function isOutOfBounds(value: LocalDateTime, { min, max }: DateTimeBounds): boolean {
  return (min !== undefined && LocalDateTime.compare(value, min) < 0) || (max !== undefined && LocalDateTime.compare(value, max) > 0);
}

/**
 * What an edit asks the field to report. `unchanged` reports nothing: the edit names the value
 * already committed. `rejected` reports nothing either and leaves the committed value standing:
 * the edit names no date-time, or one outside the bounds. A `value` is reported through
 * `onChange`, `undefined` clearing the field.
 */
export type DateTimeCommit =
  | { readonly kind: "unchanged" }
  | { readonly kind: "rejected" }
  | { readonly kind: "value"; readonly value: LocalDateTime | undefined };

const UNCHANGED: DateTimeCommit = { kind: "unchanged" };
const REJECTED: DateTimeCommit = { kind: "rejected" };

/** `candidate` as a commit against `committed`: unchanged, rejected by `bounds`, or a new value. */
function commitCandidate(candidate: LocalDateTime, committed: LocalDateTime | undefined, bounds: DateTimeBounds): DateTimeCommit {
  if (sameDateTime(candidate, committed)) return UNCHANGED;
  return isOutOfBounds(candidate, bounds) ? REJECTED : { kind: "value", value: candidate };
}

/**
 * What the input's `text` commits on blur or Enter, given the value last committed. Text that is
 * still the committed value's own text is `unchanged`, so a value carrying seconds the text does
 * not show keeps them. Whitespace-only text clears the field. Otherwise the text is read with
 * `parseDateTimeText`: a date-time inside `bounds` commits, one equal to the committed value is
 * `unchanged`, and anything else is `rejected`.
 */
export function commitText(
  text: string,
  committed: LocalDateTime | undefined,
  locale: Locale,
  bounds: DateTimeBounds = {},
): DateTimeCommit {
  if (committed !== undefined && text === formatDateTimeText(committed, locale)) return UNCHANGED;
  if (text.trim() === "") return committed === undefined ? UNCHANGED : { kind: "value", value: undefined };
  const value = parseDateTimeText(text, locale);
  return value === undefined ? REJECTED : commitCandidate(value, committed, bounds);
}

/**
 * What picking a day in the calendar does. A day with a time to go with it commits like any edit.
 * A day with no time is `pending`: it commits nothing and waits for a time, the committed value
 * standing meanwhile.
 */
export type DatePick = DateTimeCommit | { readonly kind: "pending"; readonly date: LocalDate };

/**
 * What picking `date` does, given the committed value. With a committed value the day takes its
 * time and commits when that lands inside `bounds`. With none, or when the committed time on
 * `date` falls outside `bounds`, the day is `pending` until a time is picked for it.
 */
export function pickDate(date: LocalDate, committed: LocalDateTime | undefined, bounds: DateTimeBounds = {}): DatePick {
  if (committed === undefined) return { kind: "pending", date };
  const commit = commitCandidate(LocalDateTime.of(date, committed.time), committed, bounds);
  return commit.kind === "rejected" ? { kind: "pending", date } : commit;
}

/**
 * What picking `time` in the time panel commits: on the `pending` day when there is one, else on
 * the committed value's day. With neither there is no day to put the time on, and the pick is
 * `unchanged`. A date-time outside `bounds` is `rejected`.
 */
export function pickTime(
  time: LocalTime,
  pending: LocalDate | undefined,
  committed: LocalDateTime | undefined,
  bounds: DateTimeBounds = {},
): DateTimeCommit {
  const date = pending ?? committed?.date;
  return date === undefined ? UNCHANGED : commitCandidate(LocalDateTime.of(date, time), committed, bounds);
}

/**
 * Whether a pending day flags the field invalid. It does only once focus has left the whole
 * field (`focusLeft`): while focus is anywhere inside it — the input, the calendar button or the
 * popover — the user may be on the way to picking the time.
 */
export function isPendingFlagged(pending: LocalDate | undefined, focusLeft: boolean): boolean {
  return pending !== undefined && focusLeft;
}

/** The calendar's bounds: the dates of `bounds.min` and `bounds.max`, always. */
export function dateBounds({ min, max }: DateTimeBounds): DateBounds {
  return { min: min?.date, max: max?.date };
}

/**
 * The times allowed on `date`. `min`'s time applies only on `min`'s own date and `max`'s only on
 * `max`'s, since every time of a date strictly between them is in range. Without a date neither
 * applies: no date decides which times are allowed.
 */
export function timeBounds(date: LocalDate | undefined, { min, max }: DateTimeBounds): TimeBounds {
  return {
    min: date !== undefined && min?.date.equals(date) ? min.time : undefined,
    max: date !== undefined && max?.date.equals(date) ? max.time : undefined,
  };
}

/**
 * The form value of a committed date-time: ISO 8601 `YYYY-MM-DDTHH:mm`, with `:ss` only when the
 * second is non-zero. Empty while there is no value.
 */
export function serialiseDateTime(value: LocalDateTime | undefined): string {
  return value === undefined ? "" : value.toString();
}

/**
 * A date-time field held as two halves, each `undefined` while empty: the shape a field that edits
 * the date and the time in separate controls keeps. The halves fill independently, so either may
 * be set without the other; only both together are a value.
 */
export interface DateTimeHalves {
  readonly date: LocalDate | undefined;
  readonly time: LocalTime | undefined;
}

/**
 * What a change to the halves asks the field to report. `none` means there is nothing to report:
 * the halves still spell the committed value, or a half-filled field follows no committed value.
 * `rejected` means both halves are filled with a date-time outside the bounds, which reports
 * nothing and leaves the committed value standing. A `value` is reported through `onChange`.
 */
export type HalvesCommit =
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

/** Whether exactly one half is filled — a field that spells no value and is not empty either. */
export function isHalfFilled({ date, time }: DateTimeHalves): boolean {
  return (date === undefined) !== (time === undefined);
}

/** Whether both halves are filled with a date-time outside `bounds`. */
export function isRejected(halves: DateTimeHalves, bounds: DateTimeBounds): boolean {
  const joined = joinHalves(halves);
  return joined !== undefined && isOutOfBounds(joined, bounds);
}

/**
 * Whether a field held as halves is flagged invalid: both halves filled outside `bounds`, which
 * flags at once, or exactly one half filled once focus has left the whole group (`groupLeft`).
 */
export function isInvalid(halves: DateTimeHalves, bounds: DateTimeBounds, groupLeft: boolean): boolean {
  return isRejected(halves, bounds) || (groupLeft && isHalfFilled(halves));
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
): HalvesCommit {
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
 * last seeded from or last committed (`seeded`). An `incoming` that names a different date-time
 * from `seeded` reseeds both halves from it; one the halves already account for returns `halves`
 * itself, so a half the user filled survives a controlled `value={undefined}`.
 */
export function reseedHalves(
  halves: DateTimeHalves,
  incoming: LocalDateTime | undefined,
  seeded: LocalDateTime | undefined,
): DateTimeHalves {
  return sameDateTime(incoming, seeded) ? halves : splitDateTime(incoming);
}
