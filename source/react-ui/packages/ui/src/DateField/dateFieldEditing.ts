import { type DateSegment, type Locale, LocalDate } from "@vipengele/ts";

/**
 * The pure model behind `DateField`: where the caret's segment lies in the formatted text, what a
 * step of that segment lands on, and whether typed text commits. Nothing here touches React or the
 * DOM, and nothing throws for a date `LocalDate` can hold.
 *
 * `min` and `max` are optional inclusive bounds, and `min` is assumed not to be after `max`.
 */

/** A field of a date the caret can sit in and a step can move. */
export type DateFieldSegment = "year" | "month" | "day";

/** Where one field sits in the formatted text: `text.slice(start, end)` is its digits. */
export interface SegmentRange {
  segment: DateFieldSegment;
  start: number;
  end: number;
}

/** What a date must satisfy to be committed or stepped onto. */
export interface DateConstraints {
  min?: LocalDate | undefined;
  max?: LocalDate | undefined;
  isDateDisabled?: ((date: LocalDate) => boolean) | undefined;
}

/** The earliest date `LocalDate` can hold. */
const FIRST_DATE = LocalDate.of(1, 1, 1);
/** The latest date `LocalDate` can hold. */
const LAST_DATE = LocalDate.of(9999, 12, 31);

/** The furthest a step walks past disabled days looking for an enabled one. */
const MAX_SKIPPED_DAYS = 366;

/** Whether `date` falls before `min` or after `max`. */
function isOutOfRange(date: LocalDate, { min, max }: DateConstraints): boolean {
  return (min !== undefined && LocalDate.compare(date, min) < 0) || (max !== undefined && LocalDate.compare(date, max) > 0);
}

/** Whether `date` cannot be committed: it is out of range, or `isDateDisabled` reports it. */
export function isRejected(date: LocalDate, constraints: DateConstraints): boolean {
  return isOutOfRange(date, constraints) || (constraints.isDateDisabled?.(date) ?? false);
}

/** `date`, or the bound it lies beyond. */
function clampDate(date: LocalDate, { min, max }: DateConstraints): LocalDate {
  if (min !== undefined && LocalDate.compare(date, min) < 0) return min;
  if (max !== undefined && LocalDate.compare(date, max) > 0) return max;
  return date;
}

/** The day after (`1`) or before (`-1`) `date`, or `undefined` past the range `LocalDate` holds. */
function shiftDay(date: LocalDate, direction: 1 | -1): LocalDate | undefined {
  return date.equals(direction === 1 ? LAST_DATE : FIRST_DATE) ? undefined : date.plusDays(direction);
}

/** `date` moved by `months`, or `undefined` when the target month is past the range `LocalDate` holds. */
function shiftMonths(date: LocalDate, months: number): LocalDate | undefined {
  const target = date.year * 12 + (date.month - 1) + months;
  if (target < FIRST_DATE.year * 12 || target > LAST_DATE.year * 12 + 11) return undefined;
  return date.plusMonths(months);
}

/** `date` with `segment` moved one step in `direction`, or `undefined` past the range `LocalDate` holds. */
function shiftSegment(date: LocalDate, segment: DateFieldSegment, direction: 1 | -1): LocalDate | undefined {
  if (segment === "day") return shiftDay(date, direction);
  return shiftMonths(date, segment === "year" ? direction * 12 : direction);
}

/** The offsets of each field among `segments`, in the order the locale writes them. */
function fieldRanges(segments: readonly DateSegment[]): SegmentRange[] {
  const ranges: SegmentRange[] = [];
  let offset = 0;
  for (const { type, value } of segments) {
    const end = offset + value.length;
    if (type !== "literal") ranges.push({ segment: type, start: offset, end });
    offset = end;
  }
  return ranges;
}

/**
 * Where each field sits in `text`, or `undefined` when `text` is not exactly a date as
 * `LocalDate#format` writes it under `locale`: unpadded digits, surrounding whitespace or a date
 * that does not exist all yield `undefined`, since their offsets are not the locale's.
 */
export function segmentRanges(text: string, locale: Locale): SegmentRange[] | undefined {
  const date = LocalDate.tryParseLocalized(text, locale).value;
  if (date === undefined) return undefined;
  const segments = date.segments(locale);
  return segments.map((segment) => segment.value).join("") === text ? fieldRanges(segments) : undefined;
}

/**
 * The field the caret at offset `caret` belongs to: the first field ending at or after it. A caret
 * at a field's end stays in that field, a caret inside a separator belongs to the field after it,
 * and a caret past the last field belongs to the last. `undefined` when `text` is not a formatted
 * date (see `segmentRanges`).
 */
export function segmentAt(text: string, caret: number, locale: Locale): SegmentRange | undefined {
  const ranges = segmentRanges(text, locale);
  return ranges?.find((range) => caret <= range.end) ?? ranges?.at(-1);
}

/**
 * The first day from `from` on, walking a day at a time in `direction`, that is inside the bounds
 * and not disabled. `undefined` when the walk leaves the bounds or the range `LocalDate` holds, or
 * passes `MAX_SKIPPED_DAYS` disabled days first.
 */
function nearestEnabled(from: LocalDate, direction: 1 | -1, constraints: DateConstraints): LocalDate | undefined {
  let date = from;
  for (let skipped = 0; skipped <= MAX_SKIPPED_DAYS; skipped += 1) {
    if (isOutOfRange(date, constraints)) return undefined;
    if (!constraints.isDateDisabled?.(date)) return date;
    const next = shiftDay(date, direction);
    if (next === undefined) return undefined;
    date = next;
  }
  return undefined;
}

/**
 * The date one step of `segment` in `direction` from `value`, for ArrowUp (`1`) and ArrowDown
 * (`-1`). A day steps by one day and a month by one month, each carrying into the next field; a
 * year steps by twelve months. A day past the end of the target month clamps to its last day, and
 * a step past the range `LocalDate` holds leaves the date where it is.
 *
 * An empty field (`value` undefined) steps onto `today` itself rather than a day either side of it.
 *
 * The result is then clamped to `min`..`max`. When it lands on a disabled date, the walk continues
 * a day at a time in the same direction to the first enabled date within the bounds. When there is
 * none — the walk leaves the bounds or the range `LocalDate` holds, or passes a year of disabled
 * days — the step is refused and `value` comes back unchanged.
 */
export function stepDate(
  value: LocalDate | undefined,
  segment: DateFieldSegment,
  direction: 1 | -1,
  today: LocalDate,
  constraints: DateConstraints = {},
): LocalDate | undefined {
  const target = value === undefined ? today : shiftSegment(value, segment, direction);
  if (target === undefined) return value;
  return nearestEnabled(clampDate(target, constraints), direction, constraints) ?? value;
}

/** Any date will do: the pattern a locale writes dates in does not depend on which one. */
const SAMPLE_DATE = LocalDate.of(2000, 1, 1);

/** The most digits each field of a numeric date takes. */
const FIELD_DIGITS: Record<DateFieldSegment, number> = { year: 4, month: 2, day: 2 };

/** What each field is called in the format hint. */
const FIELD_HINTS: Record<DateFieldSegment, string> = { year: "yyyy", month: "mm", day: "dd" };

/**
 * The format `locale` writes dates in, spelled the way a placeholder shows it: `dd/mm/yyyy` for
 * `pt-PT`, `mm/dd/yyyy` for `en-US`, `dd.mm.yyyy` for `de-DE`.
 */
export function formatHint(locale: Locale): string {
  return SAMPLE_DATE.segments(locale)
    .map((segment) => (segment.type === "literal" ? segment.value : FIELD_HINTS[segment.type]))
    .join("");
}

/**
 * The text the box should hold after the user typed one character onto the end of `previous`,
 * which produced `next`. When that character completes a field and `locale` writes a separator
 * before the next one, the separator is appended, so `10` then `10` reads `10/10/`. A separator the
 * user types themselves is accepted, and is dropped when it would repeat the one already there, so
 * typing `10/10` and typing `1010` end up at the same text.
 *
 * Only a single character appended at the end is rewritten. A deletion, a paste, an edit in the
 * middle and a replaced selection come back as `next`, untouched.
 */
export function withSeparator(previous: string, next: string, locale: Locale): string {
  if (next.length !== previous.length + 1 || !next.startsWith(previous)) return next;
  const typed = next.slice(-1);
  if (!/\d/.test(typed)) return startsWithLiteral(previous.slice(-1), typed) ? previous : next;

  const reading = readDateRun(next, SAMPLE_DATE.segments(locale), false);
  return reading.status === "inside" ? next + reading.separator : next;
}

/** Whitespace a locale may write in a literal, any of which stands for any other. */
const SPACES = new Set([" ", " ", " "]);

/** Whether two characters of a literal match: equal, or both spaces of `SPACES`. */
function sameLiteralChar(a: string, b: string): boolean {
  return a === b || (SPACES.has(a) && SPACES.has(b));
}

/**
 * Whether `text` starts with `literal`, reading U+0020, U+00A0 and U+202F as the same character,
 * so a space typed by hand matches the narrow or non-breaking one an ICU build writes.
 */
export function startsWithLiteral(text: string, literal: string): boolean {
  if (text.length < literal.length) return false;
  for (let index = 0; index < literal.length; index += 1) {
    if (!sameLiteralChar(text.charAt(index), literal.charAt(index))) return false;
  }
  return true;
}

/**
 * How the start of a text reads against a run of date segments:
 *
 * - `unmatched`: the text leaves the pattern inside the run, at a literal it does not match.
 * - `past`: the text runs through every segment of the run, and `rest` is what follows it.
 * - `inside`: the text ends in a field of the run. `digits` is what it holds of that field, and
 *   `complete` whether that is every digit the field takes. `last` says the field is the run's last
 *   field. `separator` is what to append: the locale's literals between this field and the run's
 *   next one, verbatim, once the field is complete. It is empty while the field is incomplete,
 *   when no literal follows the field in the run, and when the literals that follow it end the run
 *   and nothing editable follows the run.
 */
export type DateRunReading =
  | { status: "unmatched" }
  | { status: "past"; rest: string }
  | { status: "inside"; segment: DateFieldSegment; digits: string; complete: boolean; last: boolean; separator: string };

/**
 * Reads the start of `text` against `segments`, a run of date segments as `LocalDate#segments`
 * writes them, which may be only part of what the whole text holds. Literals match with
 * `startsWithLiteral`, and a field takes the run of ASCII digits at its position, however long.
 *
 * `followed` says whether an editable segment follows the run in the whole text. A literal is
 * appended only between two fields, never after the last field of the whole text: without
 * `followed`, a literal that ends the run (ko-KR's trailing `.`) is never appended.
 */
export function readDateRun(text: string, segments: readonly DateSegment[], followed: boolean): DateRunReading {
  let rest = text;
  for (const [index, segment] of segments.entries()) {
    if (segment.type === "literal") {
      if (!startsWithLiteral(rest, segment.value)) return { status: "unmatched" };
      rest = rest.slice(segment.value.length);
      continue;
    }
    const digits = /^\d*/.exec(rest)?.[0] ?? "";
    rest = rest.slice(digits.length);
    if (rest !== "") continue;
    const following = segments.slice(index + 1);
    const nextField = following.findIndex((candidate) => candidate.type !== "literal");
    const literals = (nextField === -1 ? following : following.slice(0, nextField)).map((literal) => literal.value).join("");
    const complete = digits.length === FIELD_DIGITS[segment.type];
    const separated = nextField !== -1 || followed;
    return {
      status: "inside",
      segment: segment.type,
      digits,
      complete,
      last: nextField === -1,
      separator: complete && separated ? literals : "",
    };
  }
  return { status: "past", rest };
}

/**
 * What typed text commits: `empty` commits `undefined`, `valid` commits `value`, and `rejected`
 * commits nothing.
 */
export type DateTextResult = { status: "empty" } | { status: "valid"; value: LocalDate } | { status: "rejected" };

/** The date `text` writes in `locale`'s numeric pattern, or else in ISO 8601 (`2026-10-01`). */
function parseDateText(text: string, locale: Locale): LocalDate | undefined {
  return LocalDate.tryParseLocalized(text, locale).value ?? LocalDate.tryParse(text.trim()).value;
}

/**
 * Reads `text` as the field would commit it. Whitespace-only text is `empty`. Text is read in
 * `locale`'s numeric pattern first and in ISO 8601 second, so a pasted `2026-10-01` reads in every
 * locale. Text that is neither, or a date outside `min`..`max` or reported by `isDateDisabled`, is
 * `rejected`.
 */
export function parseDateInput(text: string, locale: Locale, constraints: DateConstraints = {}): DateTextResult {
  if (text.trim() === "") return { status: "empty" };
  const value = parseDateText(text, locale);
  return value === undefined || isRejected(value, constraints) ? { status: "rejected" } : { status: "valid", value };
}
