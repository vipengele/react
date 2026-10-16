import { type Locale, LocalDate } from "@vipengele/ts";
import { type DateConstraints, isRejected, parseDateInput, segmentAt, stepDate } from "../DateField/dateFieldEditing.js";
import { type DateRange, isOrdered } from "../internal/localRange.js";

/**
 * The pure model behind `DateRangeField`: what the two editors' texts commit as a pair, which end
 * each problem belongs to, and what a step of one editor lands on. Each editor's text is read by
 * `DateField`'s own rules (`parseDateInput`); this module decides what the two readings make
 * together. Nothing here touches React or the DOM.
 */

/** One of the two editors. */
export type RangeEnd = "start" | "end";

/** The text in each editor. */
export interface RangeDrafts {
  readonly start: string;
  readonly end: string;
}

/**
 * What the two texts commit. `committed` and `cleared` are commits — the ordered range, or no
 * range. `incomplete` has exactly one end filled. `rejected` has text that reads as no accepted
 * date (`value`), or two dates whose end is before the start (`order`); `ends` names the editors
 * at fault, both of them for `order`.
 */
export type RangeDecision =
  | { readonly status: "committed"; readonly range: DateRange }
  | { readonly status: "cleared" }
  | { readonly status: "incomplete"; readonly missing: RangeEnd }
  | { readonly status: "rejected"; readonly reason: "value" | "order"; readonly ends: readonly RangeEnd[] };

/** A decision that commits nothing. */
export type RangeIssue = Extract<RangeDecision, { readonly status: "incomplete" | "rejected" }>;

/** Which editor is flagged invalid. */
export type RangeInvalid = Readonly<Record<RangeEnd, boolean>>;

const ENDS: readonly RangeEnd[] = ["start", "end"];

/**
 * Reads the two texts as the field commits them. Text that reads as no accepted date in either
 * editor rejects the pair, whatever the other holds. Two empty editors clear the range, one empty
 * editor leaves it incomplete, and two dates commit only when the start is not after the end; equal
 * ends are a one-day range. The ends are never swapped.
 */
export function decideRange(drafts: RangeDrafts, locale: Locale, constraints: DateConstraints = {}): RangeDecision {
  const start = parseDateInput(drafts.start, locale, constraints);
  const end = parseDateInput(drafts.end, locale, constraints);
  const unreadable = ENDS.filter((which) => (which === "start" ? start : end).status === "rejected");
  if (unreadable.length > 0) return { status: "rejected", reason: "value", ends: unreadable };
  if (start.status !== "valid") return end.status === "valid" ? { status: "incomplete", missing: "start" } : { status: "cleared" };
  if (end.status !== "valid") return { status: "incomplete", missing: "end" };
  const range = { start: start.value, end: end.value };
  return isOrdered(range) ? { status: "committed", range } : { status: "rejected", reason: "order", ends: ENDS };
}

/**
 * The editors an issue flags. A rejection flags its ends at once. An incomplete range flags its
 * empty editor only once `flagIncomplete` says the user has stopped working on the pair — while
 * focus is still in the field, the empty end is the one about to be typed.
 */
export function invalidEnds(issue: RangeIssue | undefined, flagIncomplete: boolean): RangeInvalid {
  if (issue === undefined) return { start: false, end: false };
  if (issue.status === "incomplete") {
    return { start: flagIncomplete && issue.missing === "start", end: flagIncomplete && issue.missing === "end" };
  }
  return { start: issue.ends.includes("start"), end: issue.ends.includes("end") };
}

/**
 * The ends of a committed range the field would not commit itself: an end outside `min`..`max` or
 * reported by `isDateDisabled`, or both ends of a range that runs backwards. A caller can pass such
 * a `value`; it is shown as it is, and flagged.
 */
export function committedInvalidEnds(range: DateRange | undefined, constraints: DateConstraints): RangeInvalid {
  if (range === undefined) return { start: false, end: false };
  const reversed = !isOrdered(range);
  return { start: reversed || isRejected(range.start, constraints), end: reversed || isRejected(range.end, constraints) };
}

/**
 * The start the texts hold while the end is still to come — the calendar's pending anchor. Only a
 * start that reads as an accepted date beside an empty end is one.
 */
export function rangeAnchor(drafts: RangeDrafts, locale: Locale, constraints: DateConstraints = {}): LocalDate | undefined {
  const start = parseDateInput(drafts.start, locale, constraints);
  return start.status === "valid" && drafts.end.trim() === "" ? start.value : undefined;
}

/** The texts the editors show for `range`: each end in `locale`'s numeric pattern, or empty. */
export function formatRange(range: DateRange | undefined, locale: Locale): RangeDrafts {
  return range === undefined ? { start: "", end: "" } : { start: range.start.format(locale), end: range.end.format(locale) };
}

/** Whether two pairs of texts are the same text. */
export function sameDrafts(a: RangeDrafts, b: RangeDrafts): boolean {
  return a.start === b.start && a.end === b.end;
}

/**
 * A committed range as one string, ISO start and end joined by `/`, or `undefined` for no range.
 * Two ranges with the same ends give the same key, however they were built.
 */
export function rangeKey(range: DateRange | undefined): string | undefined {
  return range === undefined ? undefined : `${range.start.toString()}/${range.end.toString()}`;
}

/**
 * The date an arrow key at offset `caret` steps one editor's `text` onto: the segment under the
 * caret moved one step, or `today` when the text is empty. `undefined` when the text is neither
 * empty nor a date as the field writes one — the caret then names no segment — or when the step
 * lands on a date the field does not commit.
 */
export function stepDraft(
  text: string,
  caret: number,
  direction: 1 | -1,
  locale: Locale,
  today: LocalDate,
  constraints: DateConstraints,
): LocalDate | undefined {
  const range = segmentAt(text, caret, locale);
  if (range === undefined && text.trim() !== "") return undefined;
  const base = range === undefined ? undefined : LocalDate.parseLocalized(text, locale);
  const next = stepDate(base, range?.segment ?? "day", direction, today, constraints);
  return next !== undefined && !isRejected(next, constraints) ? next : undefined;
}

/** What each field of a date is called in the format description. */
const SEGMENT_LABELS = { year: "year", month: "month", day: "day" } as const;

/** Any date will do: the format description reads only the order of its fields. */
const SAMPLE_DATE = LocalDate.of(2000, 1, 1);

/** The fields of `locale`'s date pattern in the order it writes them: `Format: month / day / year`. */
export function formatDescription(locale: Locale): string {
  const fields = SAMPLE_DATE.segments(locale).flatMap((segment) => (segment.type === "literal" ? [] : [SEGMENT_LABELS[segment.type]]));
  return `Format: ${fields.join(" / ")}`;
}
