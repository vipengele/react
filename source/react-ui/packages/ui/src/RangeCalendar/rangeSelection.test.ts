import { LocalDate } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import { type DayState, dayState, pickDay, type RangeDisplay, rangeBetween } from "./rangeSelection.js";

const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const NONE: DayState = { selected: false, start: false, end: false, inRange: false, preview: false };

/** The state of each day of 2026-10-`from`..`to` under `display`, keyed by day of the month. */
function states(display: RangeDisplay, from: number, to: number): Record<number, DayState> {
  const result: Record<number, DayState> = {};
  for (let day = from; day <= to; day += 1) result[day] = dayState(date(2026, 10, day), display);
  return result;
}

describe("rangeBetween", () => {
  it("keeps two days already in order", () => {
    expect(rangeBetween(date(2026, 10, 3), date(2026, 10, 9))).toEqual({ start: date(2026, 10, 3), end: date(2026, 10, 9) });
  });

  it("swaps two days given latest first", () => {
    expect(rangeBetween(date(2026, 10, 9), date(2026, 10, 3))).toEqual({ start: date(2026, 10, 3), end: date(2026, 10, 9) });
  });

  it("makes a one-day range of two equal days", () => {
    expect(rangeBetween(date(2026, 10, 9), date(2026, 10, 9))).toEqual({ start: date(2026, 10, 9), end: date(2026, 10, 9) });
  });

  it("orders across a month and a year", () => {
    expect(rangeBetween(date(2027, 1, 2), date(2026, 12, 30))).toEqual({ start: date(2026, 12, 30), end: date(2027, 1, 2) });
  });
});

describe("pickDay", () => {
  it("anchors on the first pick and completes no range", () => {
    expect(pickDay(undefined, date(2026, 10, 9))).toEqual({ anchor: date(2026, 10, 9), range: undefined });
  });

  it("completes the range from the anchor on the second pick and clears the anchor", () => {
    expect(pickDay(date(2026, 10, 3), date(2026, 10, 9))).toEqual({
      anchor: undefined,
      range: { start: date(2026, 10, 3), end: date(2026, 10, 9) },
    });
  });

  it("swaps a second pick earlier than the anchor", () => {
    expect(pickDay(date(2026, 10, 9), date(2026, 10, 3))).toEqual({
      anchor: undefined,
      range: { start: date(2026, 10, 3), end: date(2026, 10, 9) },
    });
  });

  it("completes a one-day range when the anchor is picked again", () => {
    expect(pickDay(date(2026, 10, 9), date(2026, 10, 9))).toEqual({
      anchor: undefined,
      range: { start: date(2026, 10, 9), end: date(2026, 10, 9) },
    });
  });
});

describe("dayState", () => {
  it("marks nothing with no range and no anchor", () => {
    const result = states({ range: undefined, anchor: undefined, preview: date(2026, 10, 5) }, 1, 31);
    expect(Object.values(result)).toEqual(Array(31).fill(NONE));
  });

  it("selects a committed range's ends and marks the days strictly between them", () => {
    const result = states({ range: { start: date(2026, 10, 3), end: date(2026, 10, 6) }, anchor: undefined, preview: undefined }, 2, 7);
    expect(result).toEqual({
      2: NONE,
      3: { selected: true, start: true, end: false, inRange: false, preview: false },
      4: { selected: false, start: false, end: false, inRange: true, preview: false },
      5: { selected: false, start: false, end: false, inRange: true, preview: false },
      6: { selected: true, start: false, end: true, inRange: false, preview: false },
      7: NONE,
    });
  });

  it("draws a one-day range as one day that is both ends", () => {
    const result = states({ range: { start: date(2026, 10, 4), end: date(2026, 10, 4) }, anchor: undefined, preview: undefined }, 3, 5);
    expect(result[4]).toEqual({ selected: true, start: true, end: true, inRange: false, preview: false });
    expect(result[3]).toEqual(NONE);
    expect(result[5]).toEqual(NONE);
  });

  it("ignores a preview with no anchor pending", () => {
    const display = { range: { start: date(2026, 10, 3), end: date(2026, 10, 4) }, anchor: undefined, preview: date(2026, 10, 20) };
    expect(dayState(date(2026, 10, 10), display)).toEqual(NONE);
  });

  it("draws a lone anchor as one selected day, with no preview", () => {
    const result = states({ range: undefined, anchor: date(2026, 10, 4), preview: undefined }, 3, 5);
    expect(result[4]).toEqual({ selected: true, start: true, end: true, inRange: false, preview: false });
    expect(result[3]).toEqual(NONE);
  });

  it("draws no preview while the previewed day is the anchor", () => {
    const result = states({ range: undefined, anchor: date(2026, 10, 4), preview: date(2026, 10, 4) }, 4, 4);
    expect(result[4]).toEqual({ selected: true, start: true, end: true, inRange: false, preview: false });
  });

  it("previews the span from the anchor forward to the previewed day, selecting only the anchor", () => {
    const result = states({ range: undefined, anchor: date(2026, 10, 3), preview: date(2026, 10, 5) }, 2, 6);
    expect(result).toEqual({
      2: NONE,
      3: { selected: true, start: true, end: false, inRange: false, preview: true },
      4: { selected: false, start: false, end: false, inRange: true, preview: true },
      5: { selected: false, start: false, end: true, inRange: false, preview: true },
      6: NONE,
    });
  });

  it("previews a span running back from the anchor with the previewed day as its start", () => {
    const result = states({ range: undefined, anchor: date(2026, 10, 5), preview: date(2026, 10, 3) }, 3, 5);
    expect(result).toEqual({
      3: { selected: false, start: true, end: false, inRange: false, preview: true },
      4: { selected: false, start: false, end: false, inRange: true, preview: true },
      5: { selected: true, start: false, end: true, inRange: false, preview: true },
    });
  });

  it("draws the anchor in place of a committed range", () => {
    const display = { range: { start: date(2026, 10, 10), end: date(2026, 10, 20) }, anchor: date(2026, 10, 4), preview: undefined };
    expect(dayState(date(2026, 10, 10), display)).toEqual(NONE);
    expect(dayState(date(2026, 10, 15), display)).toEqual(NONE);
    expect(dayState(date(2026, 10, 4), display).selected).toBe(true);
  });
});
