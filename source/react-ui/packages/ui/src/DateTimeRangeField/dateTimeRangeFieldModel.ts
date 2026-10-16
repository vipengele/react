import { type DateTimeSegment, type Locale, type LocalDate, LocalDateTime, type LocalTime } from "@vipengele/ts";
import {
  type DateTimeBounds,
  dateTimeSegments,
  formatDateTimeText,
  isOutOfBounds,
  parseDateTimeText,
} from "../DateTimeField/dateTimeFieldModel.js";
import { type DateRange, type DateTimeRange, isOrdered } from "../internal/localRange.js";

/**
 * The pure model behind `DateTimeRangeField`: what the two editors' texts commit as a pair, which
 * end each problem belongs to, what a day or a time picked in the pop-up writes into an editor, and
 * the day range the calendar shows. Each editor's text is a date-time as `DateTimeField` writes and
 * reads it (`formatDateTimeText`, `parseDateTimeText`); this module decides what the two readings
 * make together. Nothing here touches React or the DOM.
 */

/** One of the two editors. */
export type RangeEnd = "start" | "end";

/** The text in each editor. */
export interface RangeDrafts {
  readonly start: string;
  readonly end: string;
}

/**
 * The days picked in the calendar that wait for a time, per editor. An editor holding one shows the
 * day alone, and reads as pending only while its text is still that day's own text.
 */
export type PendingDays = Readonly<Partial<Record<RangeEnd, LocalDate>>>;

/**
 * What either end must satisfy: the inclusive `min`..`max` of `DateTimeField`, and days
 * `isDateDisabled` reports, which cannot be an end of the range.
 */
export interface DateTimeConstraints extends DateTimeBounds {
  readonly isDateDisabled?: ((date: LocalDate) => boolean) | undefined;
}

/**
 * What one editor holds, as the pair reads it: a date-time, `undefined` for an empty editor,
 * `"pending"` for a picked day still waiting for its time, or `"invalid"` for text that reads as no
 * date-time the field accepts.
 */
export type EndReading = LocalDateTime | undefined | "pending" | "invalid";

/**
 * What the two texts commit. `committed` and `cleared` are commits — the ordered range, or no
 * range. `incomplete` has an end that is empty or waits for its time, named in `missing`.
 * `rejected` has text that reads as no accepted date-time (`value`), or two date-times whose end is
 * before the start (`order`); `ends` names the editors at fault, both of them for `order`.
 */
export type RangeDecision =
  | { readonly status: "committed"; readonly range: DateTimeRange }
  | { readonly status: "cleared" }
  | { readonly status: "incomplete"; readonly missing: readonly RangeEnd[] }
  | { readonly status: "rejected"; readonly reason: "value" | "order"; readonly ends: readonly RangeEnd[] };

/** A decision that commits nothing. */
export type RangeIssue = Extract<RangeDecision, { readonly status: "incomplete" | "rejected" }>;

/** Which editor is flagged invalid. */
export type RangeInvalid = Readonly<Record<RangeEnd, boolean>>;

/** The parts of one end the pop-up shows: its day in the calendar and its time in its panel. */
export interface EndParts {
  readonly day?: LocalDate;
  readonly time?: LocalTime;
}

const ENDS: readonly RangeEnd[] = ["start", "end"];

/** Whether `value` cannot be an end of the range: outside the bounds, or on a disabled day. */
export function isRejected(value: LocalDateTime, constraints: DateTimeConstraints): boolean {
  return isOutOfBounds(value, constraints) || constraints.isDateDisabled?.(value.date) === true;
}

/** Whether `text` is still the editor text of the picked day `pending`. */
function isPendingText(text: string, pending: LocalDate | undefined, locale: Locale): pending is LocalDate {
  return pending !== undefined && text === pending.format(locale);
}

/**
 * Reads one editor's `text` as the pair decides it. The text of a picked day waiting for its time is
 * `"pending"`. Whitespace-only text is empty. Text that is still the committed end's own text reads
 * as that end, so a second the text does not show survives an edit of the other end. Anything else
 * is read with `parseDateTimeText`. Either is `"invalid"` when it reads as nothing or as a date-time
 * the constraints rule out.
 */
export function readEnd(
  text: string,
  committed: LocalDateTime | undefined,
  pending: LocalDate | undefined,
  locale: Locale,
  constraints: DateTimeConstraints = {},
): EndReading {
  if (isPendingText(text, pending, locale)) return "pending";
  if (text.trim() === "") return undefined;
  const value = committed !== undefined && text === formatDateTimeText(committed, locale) ? committed : parseDateTimeText(text, locale);
  return value === undefined || isRejected(value, constraints) ? "invalid" : value;
}

/**
 * Reads the two texts as the field commits them. Text that reads as no accepted date-time in either
 * editor rejects the pair, whatever the other holds. Two empty editors clear the range; an empty
 * editor beside a filled one, or a picked day without its time, leaves it incomplete; and two
 * date-times commit only when the start is not after the end, so a same-day end time before the
 * start time is rejected. Equal ends are a range of one instant. The ends are never swapped.
 */
export function decideRange(
  drafts: RangeDrafts,
  committed: DateTimeRange | undefined,
  pending: PendingDays,
  locale: Locale,
  constraints: DateTimeConstraints = {},
): RangeDecision {
  const readings: Record<RangeEnd, EndReading> = {
    start: readEnd(drafts.start, committed?.start, pending.start, locale, constraints),
    end: readEnd(drafts.end, committed?.end, pending.end, locale, constraints),
  };
  const unreadable = ENDS.filter((which) => readings[which] === "invalid");
  if (unreadable.length > 0) return { status: "rejected", reason: "value", ends: unreadable };
  const { start, end } = readings;
  if (start === undefined && end === undefined) return { status: "cleared" };
  if (!(start instanceof LocalDateTime) || !(end instanceof LocalDateTime)) {
    return { status: "incomplete", missing: ENDS.filter((which) => !(readings[which] instanceof LocalDateTime)) };
  }
  const range = { start, end };
  return isOrdered(range) ? { status: "committed", range } : { status: "rejected", reason: "order", ends: ENDS };
}

/**
 * The editors an issue flags. A rejection flags its ends at once. An incomplete range flags its
 * missing ends only once `flagIncomplete` says the user has stopped working on the pair — while
 * focus is still in the field or its pop-up, the missing part is the one about to be filled.
 */
export function invalidEnds(issue: RangeIssue | undefined, flagIncomplete: boolean): RangeInvalid {
  if (issue === undefined) return { start: false, end: false };
  const flagged = issue.status === "incomplete" ? (flagIncomplete ? issue.missing : []) : issue.ends;
  return { start: flagged.includes("start"), end: flagged.includes("end") };
}

/**
 * The ends of a committed range the field would not commit itself: an end the constraints rule
 * out, or both ends of a range that runs backwards. A caller can pass such a `value`; it is shown as
 * it is, and flagged.
 */
export function committedInvalidEnds(range: DateTimeRange | undefined, constraints: DateTimeConstraints): RangeInvalid {
  if (range === undefined) return { start: false, end: false };
  const reversed = !isOrdered(range);
  return { start: reversed || isRejected(range.start, constraints), end: reversed || isRejected(range.end, constraints) };
}

/**
 * The day and time one editor's `text` holds for the pop-up: both, for text that reads as a
 * date-time; the day alone, for the text of a picked day waiting for its time; neither otherwise.
 */
export function endParts(text: string, pending: LocalDate | undefined, locale: Locale): EndParts {
  if (isPendingText(text, pending, locale)) return { day: pending };
  const value = parseDateTimeText(text, locale);
  return value === undefined ? {} : { day: value.date, time: value.time };
}

/**
 * What the range calendar shows for the editors' texts. A start day beside an empty end editor is
 * the calendar's pending anchor, so the next pick completes the range from it. Otherwise the two
 * days are its range when both are there in order, and it shows none when they are not.
 */
export function calendarSelection(
  drafts: RangeDrafts,
  pending: PendingDays,
  locale: Locale,
): { readonly anchor: LocalDate | undefined; readonly value: DateRange | undefined } {
  const start = endParts(drafts.start, pending.start, locale).day;
  const end = endParts(drafts.end, pending.end, locale).day;
  if (start !== undefined && drafts.end.trim() === "") return { anchor: start, value: undefined };
  const days = start === undefined || end === undefined ? undefined : { start, end };
  return { anchor: undefined, value: days !== undefined && isOrdered(days) ? days : undefined };
}

/**
 * What picking `day` in the calendar writes into an editor whose time is `time`. The day takes the
 * time when there is one and the two land inside the constraints, as `DateTimeField` puts a picked
 * day on its committed time. Otherwise the editor shows the day alone and the day is `pending`,
 * waiting for a time: no time is invented for a day on its own.
 */
export function placeDay(
  day: LocalDate,
  time: LocalTime | undefined,
  locale: Locale,
  constraints: DateTimeConstraints = {},
): { readonly text: string; readonly pending: LocalDate | undefined } {
  const value = time === undefined ? undefined : LocalDateTime.of(day, time);
  return value === undefined || isRejected(value, constraints)
    ? { text: day.format(locale), pending: day }
    : { text: formatDateTimeText(value, locale), pending: undefined };
}

/** The texts the editors show for `range`: each end as `DateTimeField` writes it, or empty. */
export function formatRange(range: DateTimeRange | undefined, locale: Locale): RangeDrafts {
  return range === undefined
    ? { start: "", end: "" }
    : { start: formatDateTimeText(range.start, locale), end: formatDateTimeText(range.end, locale) };
}

/** Whether two pairs of texts are the same text. */
export function sameDrafts(a: RangeDrafts, b: RangeDrafts): boolean {
  return a.start === b.start && a.end === b.end;
}

/**
 * A committed range as one string, ISO start and end joined by `/`, or `undefined` for no range.
 * Two ranges with the same ends give the same key, however they were built.
 */
export function rangeKey(range: DateTimeRange | undefined): string | undefined {
  return range === undefined ? undefined : `${range.start.toString()}/${range.end.toString()}`;
}

/** What each field of a date-time is called in the format description. */
const SEGMENT_LABELS: Record<Exclude<DateTimeSegment["type"], "literal">, string> = {
  year: "year",
  month: "month",
  day: "day",
  hour: "hour",
  minute: "minute",
  second: "second",
  dayPeriod: "day period",
};

/** What each numeric field is called in the placeholder. */
const FIELD_HINTS: Partial<Record<DateTimeSegment["type"], string>> = { year: "yyyy", month: "mm", day: "dd", hour: "hh", minute: "mm" };

/** Any morning and evening will do: the hint reads the order of the fields and the day periods' names. */
const SAMPLE_MORNING = LocalDateTime.ofFields(2000, 1, 1, 9, 0);
const SAMPLE_EVENING = LocalDateTime.ofFields(2000, 1, 1, 21, 0);

function dayPeriodName(value: LocalDateTime, locale: Locale): string | undefined {
  return dateTimeSegments(value, locale).find((segment) => segment.type === "dayPeriod")?.value;
}

/**
 * The format `locale` writes each editor's text in, spelled the way a placeholder shows it, as
 * `DateTimeField`'s placeholder spells it: `mm/dd/yyyy hh:mm AM/PM` for `en-US`, `dd.mm.yyyy hh:mm`
 * for `de-DE`.
 */
export function formatHint(locale: Locale): string {
  const periods = `${dayPeriodName(SAMPLE_MORNING, locale)}/${dayPeriodName(SAMPLE_EVENING, locale)}`;
  return dateTimeSegments(SAMPLE_MORNING, locale)
    .map((segment) => (segment.type === "dayPeriod" ? periods : (FIELD_HINTS[segment.type] ?? segment.value)))
    .join("");
}

/** The fields of each editor's text in the order `locale` writes them: `Format: month / day / year / hour / minute / day period`. */
export function formatDescription(locale: Locale): string {
  const fields = dateTimeSegments(SAMPLE_MORNING, locale).flatMap((segment) =>
    segment.type === "literal" ? [] : [SEGMENT_LABELS[segment.type]],
  );
  return `Format: ${fields.join(" / ")}`;
}
