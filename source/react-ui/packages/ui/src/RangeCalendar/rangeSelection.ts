import { LocalDate } from "@vipengele/ts";
import type { DateRange } from "../internal/localRange.js";

/** The range two picked days make, earlier day first. Two equal days make a one-day range. */
export function rangeBetween(a: LocalDate, b: LocalDate): DateRange {
  return LocalDate.compare(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

/** The pending anchor after one pick, and the range the pick completed, if it completed one. */
export type PickResult = { anchor: LocalDate; range: undefined } | { anchor: undefined; range: DateRange };

/**
 * What one pick does. With no anchor pending the picked day becomes the anchor and no range is
 * made; with one pending the pick completes the range between the two days and the anchor clears.
 * A pick after a completed range has no anchor to complete, so it anchors afresh.
 */
export function pickDay(anchor: LocalDate | undefined, date: LocalDate): PickResult {
  if (anchor === undefined) return { anchor: date, range: undefined };
  return { anchor: undefined, range: rangeBetween(anchor, date) };
}

/** What a range calendar draws: the committed range, the pending anchor and the day a preview reaches to. */
export interface RangeDisplay {
  range: DateRange | undefined;
  anchor: LocalDate | undefined;
  /** The hovered or focused day while the anchor is pending. Ignored with no anchor. */
  preview: LocalDate | undefined;
}

/**
 * How one day is drawn. `selected` is a committed endpoint or the pending anchor; `start` and
 * `end` are the ends of the drawn span; `inRange` is strictly between them; `preview` is any day of
 * a span that runs from the anchor to the previewed day, its ends included.
 */
export interface DayState {
  selected: boolean;
  start: boolean;
  end: boolean;
  inRange: boolean;
  preview: boolean;
}

function within(date: LocalDate, span: DateRange): { start: boolean; end: boolean; inside: boolean } {
  const fromStart = LocalDate.compare(date, span.start);
  const toEnd = LocalDate.compare(date, span.end);
  return { start: fromStart === 0, end: toEnd === 0, inside: fromStart > 0 && toEnd < 0 };
}

/**
 * The state of `date` under `display`. A pending anchor replaces the committed range on screen:
 * the span drawn is the anchor to the previewed day, or the anchor alone, so the range a second
 * pick would make is what the user sees. With no anchor the committed range is drawn.
 */
export function dayState(date: LocalDate, { range, anchor, preview }: RangeDisplay): DayState {
  if (anchor !== undefined) {
    const span = rangeBetween(anchor, preview ?? anchor);
    const { start, end, inside } = within(date, span);
    const previewing = !span.start.equals(span.end);
    return { selected: date.equals(anchor), start, end, inRange: inside, preview: previewing && (start || end || inside) };
  }
  if (range === undefined) return { selected: false, start: false, end: false, inRange: false, preview: false };
  const { start, end, inside } = within(date, range);
  return { selected: start || end, start, end, inRange: inside, preview: false };
}
