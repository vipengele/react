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
