import { type DateSegment, type DateTimeSegment, type Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { readDateRun, startsWithLiteral } from "../DateField/dateFieldEditing.js";
import { enterTimeText, settleTimeText, type TimeEditableSegment, type TimeLayout, timeLayout } from "../TimeField/timeSegments.js";

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

/** The two halves of the field's text in the order `locale` writes them, with `gap` between them. */
function inLocaleOrder<T>(date: readonly T[], time: readonly T[], gap: T, locale: Locale): T[] {
  return timeComesFirst(locale) ? [...time, gap, ...date] : [...date, gap, ...time];
}

/**
 * The parts of the field's text for `value` under `locale`: the date's segments as
 * `LocalDate#segments` splits them and the time's as `LocalTime#segments` does, in the order
 * `LocalDateTime#segments` puts them, with a single-space literal between the two. The hour and
 * minute are written and the second never is.
 */
export function dateTimeSegments(value: LocalDateTime, locale: Locale): DateTimeSegment[] {
  return inLocaleOrder<DateTimeSegment>(value.date.segments(locale), value.time.segments(locale), HALF_SEPARATOR, locale);
}

/**
 * One step of the field's text as typing reads it: a literal, the whole run of the date's
 * segments, which the date field's rule reads in one go, or one of the time's segments.
 */
type TypingStep =
  | { readonly type: "literal"; readonly text: string }
  | { readonly type: "date"; readonly segments: readonly DateSegment[] }
  | { readonly type: TimeEditableSegment };

/** Where the end of a text lies among the steps of the field's text. */
type TypingSlot =
  | { readonly kind: "none" }
  | { readonly kind: "date"; readonly index: number; readonly prefix: string }
  | {
      readonly kind: "time";
      readonly index: number;
      readonly segment: TimeEditableSegment;
      readonly prefix: string;
      readonly pending: string;
    };

const NO_SLOT: TypingSlot = { kind: "none" };

const DIGIT = /^\d$/;
const LETTER = /^\p{L}$/u;

/** The steps of the field's text under `locale`, in the order `dateTimeSegments` writes them. */
function typingSteps(locale: Locale, layout: TimeLayout): TypingStep[] {
  const date: TypingStep = { type: "date", segments: REFERENCE_DATE_TIME.date.segments(locale) };
  return inLocaleOrder<TypingStep>([date], layout.parts, { type: "literal", text: HALF_SEPARATOR.value }, locale);
}

/**
 * The literals that follow step `index` up to the next editable step, joined: what the field
 * appends once that step is complete. Empty when no editable step follows, so nothing is ever
 * appended after the last segment of the whole text.
 */
function literalsAfter(steps: readonly TypingStep[], index: number): string {
  let text = "";
  for (const step of steps.slice(index + 1)) {
    if (step.type !== "literal") return text;
    text += step.text;
  }
  return "";
}

/** Whether an editable step follows step `index`. */
function isFollowed(steps: readonly TypingStep[], index: number): boolean {
  return steps.slice(index + 1).some((step) => step.type !== "literal");
}

/**
 * The step the end of `text` lies in, and what that step holds of it. Literals match with
 * `startsWithLiteral`. The date run reads with `readDateRun`; a numeric time segment takes the run
 * of ASCII digits at its position, and the day period either label, or else the rest of the text.
 * `none` when the text leaves the pattern, ends partway through a literal, or runs past the last
 * segment.
 */
function locateSlot(text: string, steps: readonly TypingStep[], layout: TimeLayout): TypingSlot {
  let rest = text;
  const prefix = (): string => text.slice(0, text.length - rest.length);
  for (const [index, step] of steps.entries()) {
    if (step.type === "literal") {
      if (!startsWithLiteral(rest, step.text)) return NO_SLOT;
      rest = rest.slice(step.text.length);
    } else if (step.type === "date") {
      const reading = readDateRun(rest, step.segments, isFollowed(steps, index));
      if (reading.status === "inside") return { kind: "date", index, prefix: prefix() };
      if (reading.status === "unmatched") return NO_SLOT;
      rest = reading.rest;
    } else {
      const { am, pm } = layout.dayPeriods;
      const held = step.type === "dayPeriod" ? ([am, pm].find((label) => rest.startsWith(label)) ?? rest) : (/^\d*/.exec(rest)?.[0] ?? "");
      if (held === rest) return { kind: "time", index, segment: step.type, prefix: prefix(), pending: held };
      rest = rest.slice(held.length);
    }
  }
  return NO_SLOT;
}

/**
 * The text the box should hold after the user typed one character onto the end of `previous`,
 * which produced `next`. The date half types as `DateField` does (`readDateRun`) and the time half
 * as `TimeField` does (`enterTimeText`, `settleTimeText`):
 *
 * - A digit that completes a segment is followed by every literal up to the next segment, so
 *   `10152026` reads `10/15/2026 ` in `en-US` and `20261015` reads `2026. 10. 15. ` in `ko-KR`.
 *   Nothing is appended after the last segment of the whole text.
 * - A completed time segment is zero-padded (`3` in a 24-hour hour reads `03:`), a digit that may
 *   still take another shows as typed, and a key that spells no in-range value with it starts the
 *   segment again. A key the time field swallows — a letter in a numeric segment, a second `0` in a
 *   12-hour hour, a key naming neither day period — is dropped.
 * - At the day period, the key that picks out a label gives it, replacing the label already there,
 *   so `p` gives `PM` and `PM` then `a` gives `AM`.
 * - A separator typed onto a time digit that holds a value pads it (`1` then `:` reads `01:`). A
 *   separator that repeats the character before it is dropped, a typed space matching an appended
 *   U+00A0 or U+202F, so typing a separator the field appended never doubles it.
 * - Anything typed past the last segment comes back as typed, and fails when the text commits.
 *
 * Only a single character appended at the end is rewritten, and the rewrite only ever touches the
 * end of the text. A deletion, a paste, an edit in the middle and a replaced selection come back as
 * `next`, untouched, as does a key the rules do not decide, such as one typed onto a segment holding
 * more digits than an entry in progress holds.
 */
export function typeDateTimeText(previous: string, next: string, locale: Locale): string {
  if (next.length !== previous.length + 1 || !next.startsWith(previous)) return next;
  const typed = next.slice(-1);
  const digit = DIGIT.test(typed);
  if (!digit && startsWithLiteral(previous.slice(-1), typed)) return previous;

  const layout = timeLayout(locale, false);
  const steps = typingSteps(locale, layout);
  const slot = locateSlot(previous, steps, layout);
  if (slot.kind === "none") return next;

  if (slot.kind === "date") {
    const step = steps[slot.index] as Extract<TypingStep, { type: "date" }>;
    const followed = isFollowed(steps, slot.index);
    const reading = readDateRun(next.slice(slot.prefix.length), step.segments, followed);
    if (!digit || reading.status !== "inside" || !reading.complete) return next;
    return next + reading.separator + (reading.last && followed ? literalsAfter(steps, slot.index) : "");
  }

  const { segment, prefix, pending } = slot;
  if (segment === "dayPeriod" && pending !== "" && !LETTER.test(typed)) return next;
  if (segment !== "dayPeriod" && !digit && !LETTER.test(typed)) {
    const settled = settleTimeText(layout, segment, pending);
    return settled.kind === "entered" ? prefix + settled.text + typed : next;
  }
  const entry = enterTimeText(layout, segment, pending, typed);
  if (entry.kind === "dropped") return previous;
  if (entry.kind === "unhandled") return next;
  return prefix + entry.text + (entry.complete ? literalsAfter(steps, slot.index) : "");
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
 * not show keeps them, whatever whitespace surrounds it. Whitespace-only text clears the field.
 * Otherwise the text is read with
 * `parseDateTimeText`: a date-time inside `bounds` commits, one equal to the committed value is
 * `unchanged`, and anything else is `rejected`.
 */
export function commitText(
  text: string,
  committed: LocalDateTime | undefined,
  locale: Locale,
  bounds: DateTimeBounds = {},
): DateTimeCommit {
  if (committed !== undefined && text.trim() === formatDateTimeText(committed, locale)) return UNCHANGED;
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
