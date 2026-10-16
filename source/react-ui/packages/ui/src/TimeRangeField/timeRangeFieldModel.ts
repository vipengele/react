import type { LocalTime } from "@vipengele/ts";
import { isOrdered, type TimeRange } from "../internal/localRange.js";
import { commitTimeState, endEntry, type TimeBounds, type TimeFieldState, type TimeLayout } from "../TimeField/timeSegments.js";

/**
 * The pure model behind `TimeRangeField`: what the two editors make together. Each editor is a
 * `TimeField`'s segment state, read by `TimeField`'s own commit rule (`commitTimeState`); this
 * module decides what the two readings commit as a pair. Nothing here touches React or the DOM.
 */

/** One of the two editors. */
export type TimeRangeEnd = "start" | "end";

/**
 * What one editor holds, as the pair reads it: a time, `undefined` for every segment empty, or
 * `"invalid"` for segments that spell no time the field accepts — partly filled, or a time outside
 * `min` and `max`.
 */
export type EndReading = LocalTime | undefined | "invalid";

/**
 * What the two readings commit. `committed` and `cleared` are commits — the ordered range, or no
 * range. `incomplete` has exactly one end filled. `rejected` has an editor holding no accepted time
 * (`value`), or two times whose end is before the start (`order`); `ends` names the editors at
 * fault, both of them for `order`.
 */
export type TimeRangeDecision =
  | { readonly status: "committed"; readonly range: TimeRange }
  | { readonly status: "cleared" }
  | { readonly status: "incomplete"; readonly missing: TimeRangeEnd }
  | { readonly status: "rejected"; readonly reason: "value" | "order"; readonly ends: readonly TimeRangeEnd[] };

/** A decision that commits nothing. */
export type TimeRangeIssue = Extract<TimeRangeDecision, { readonly status: "incomplete" | "rejected" }>;

/** Which editor is flagged invalid. */
export type TimeRangeInvalid = Readonly<Record<TimeRangeEnd, boolean>>;

/**
 * Reads an editor's segments as the pair decides them. Segments the user has not edited since they
 * were seeded read as `committed`, the time they were seeded from; an edited editor reads as what
 * committing it would yield.
 */
export function readEditor(layout: TimeLayout, state: TimeFieldState, bounds: TimeBounds, committed: LocalTime | undefined): EndReading {
  const result = commitTimeState(layout, endEntry(state), bounds);
  if (result.kind === "unchanged") return committed;
  return result.kind === "value" ? result.value : "invalid";
}

/**
 * Decides what the two readings commit. An invalid editor rejects the pair, whatever the other
 * holds. Two empty editors clear the range, one empty editor leaves it incomplete, and two times
 * commit only when the start is not after the end; equal ends are a range of one instant. The ends
 * are never swapped, and an end before the start never reads as a time on the next day.
 */
export function decideTimeRange(start: EndReading, end: EndReading): TimeRangeDecision {
  const invalid: TimeRangeEnd[] = [];
  if (start === "invalid") invalid.push("start");
  if (end === "invalid") invalid.push("end");
  if (start === "invalid" || end === "invalid") return { status: "rejected", reason: "value", ends: invalid };
  if (start === undefined) return end === undefined ? { status: "cleared" } : { status: "incomplete", missing: "start" };
  if (end === undefined) return { status: "incomplete", missing: "end" };
  const range = { start, end };
  return isOrdered(range) ? { status: "committed", range } : { status: "rejected", reason: "order", ends: ["start", "end"] };
}

/**
 * The editors an issue flags. A rejection flags its ends at once. An incomplete range flags its
 * empty editor only once `flagIncomplete` says the user has stopped working on the pair — while
 * focus is still in the field, the empty end is the one about to be filled.
 */
export function invalidEnds(issue: TimeRangeIssue | undefined, flagIncomplete: boolean): TimeRangeInvalid {
  if (issue === undefined) return { start: false, end: false };
  if (issue.status === "incomplete") {
    return { start: flagIncomplete && issue.missing === "start", end: flagIncomplete && issue.missing === "end" };
  }
  return { start: issue.ends.includes("start"), end: issue.ends.includes("end") };
}

/** Whether a committed range runs backwards. A caller can pass such a `value`; it is shown as it is,
 * and both ends are flagged. */
export function isReversed(range: TimeRange | undefined): boolean {
  return range !== undefined && !isOrdered(range);
}

/**
 * A committed range as one string, ISO start and end joined by `/`, or `undefined` for no range.
 * Two ranges with the same ends give the same key, however they were built.
 */
export function rangeKey(range: TimeRange | undefined): string | undefined {
  return range === undefined ? undefined : `${range.start.toString()}/${range.end.toString()}`;
}
