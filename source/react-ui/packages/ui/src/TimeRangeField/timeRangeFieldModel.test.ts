import { Locale, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import { clearSegment, enterDigit, initialTimeState, timeLayout } from "../TimeField/timeSegments.js";
import { decideTimeRange, invalidEnds, isReversed, rangeKey, readEditor } from "./timeRangeFieldModel.js";

const time = (hour: number, minute = 0) => LocalTime.of(hour, minute);
const layout = timeLayout(new Locale("de-DE"), false);

describe("decideTimeRange", () => {
  it("commits two ordered times", () => {
    expect(decideTimeRange(time(9), time(17))).toEqual({ status: "committed", range: { start: time(9), end: time(17) } });
  });

  it("commits equal ends", () => {
    expect(decideTimeRange(time(9, 30), time(9, 30))).toEqual({ status: "committed", range: { start: time(9, 30), end: time(9, 30) } });
  });

  it("rejects an end before the start at both ends, without swapping", () => {
    expect(decideTimeRange(time(17), time(9))).toEqual({ status: "rejected", reason: "order", ends: ["start", "end"] });
  });

  it("never wraps past midnight: a late start and an early end are reversed", () => {
    expect(decideTimeRange(time(22), time(2))).toEqual({ status: "rejected", reason: "order", ends: ["start", "end"] });
  });

  it("clears when both ends are empty", () => {
    expect(decideTimeRange(undefined, undefined)).toEqual({ status: "cleared" });
  });

  it.each([
    ["start", undefined, time(17)],
    ["end", time(9), undefined],
  ] as const)("is incomplete with the %s missing", (missing, start, end) => {
    expect(decideTimeRange(start, end)).toEqual({ status: "incomplete", missing });
  });

  it("rejects an invalid editor, naming its end, ahead of a missing end", () => {
    expect(decideTimeRange("invalid", undefined)).toEqual({ status: "rejected", reason: "value", ends: ["start"] });
    expect(decideTimeRange(time(9), "invalid")).toEqual({ status: "rejected", reason: "value", ends: ["end"] });
    expect(decideTimeRange("invalid", "invalid")).toEqual({ status: "rejected", reason: "value", ends: ["start", "end"] });
  });
});

describe("readEditor", () => {
  const bounds = { min: time(8), max: time(18) };

  it("reads an unedited editor as the time it was seeded from", () => {
    expect(readEditor(layout, initialTimeState(layout, time(3)), bounds, time(3))).toEqual(time(3));
    expect(readEditor(layout, initialTimeState(layout, undefined), bounds, undefined)).toBeUndefined();
  });

  it("reads an edited editor as what committing it yields", () => {
    const seeded = initialTimeState(layout, time(9));
    const stepped = (enterDigit(layout, seeded, "hour", "1") as { state: typeof seeded }).state;
    const edited = (enterDigit(layout, stepped, "hour", "0") as { state: typeof seeded }).state;
    expect(readEditor(layout, edited, bounds, time(9))).toEqual(time(10));
    expect(readEditor(layout, clearSegment(clearSegment(seeded, "hour"), "minute"), bounds, time(9))).toBeUndefined();
  });

  it("reads a partly filled or out-of-bounds editor as invalid", () => {
    const seeded = initialTimeState(layout, time(9));
    expect(readEditor(layout, clearSegment(seeded, "minute"), bounds, time(9))).toBe("invalid");
    const early = (enterDigit(layout, seeded, "hour", "7") as { state: typeof seeded }).state;
    expect(readEditor(layout, early, bounds, time(9))).toBe("invalid");
  });
});

describe("invalidEnds", () => {
  it("flags nothing without an issue", () => {
    expect(invalidEnds(undefined, true)).toEqual({ start: false, end: false });
  });

  it("flags the missing end of an incomplete range only once asked to", () => {
    expect(invalidEnds({ status: "incomplete", missing: "end" }, false)).toEqual({ start: false, end: false });
    expect(invalidEnds({ status: "incomplete", missing: "end" }, true)).toEqual({ start: false, end: true });
    expect(invalidEnds({ status: "incomplete", missing: "start" }, true)).toEqual({ start: true, end: false });
  });

  it("flags a rejection's ends at once", () => {
    expect(invalidEnds({ status: "rejected", reason: "order", ends: ["start", "end"] }, false)).toEqual({ start: true, end: true });
    expect(invalidEnds({ status: "rejected", reason: "value", ends: ["end"] }, false)).toEqual({ start: false, end: true });
  });
});

describe("isReversed", () => {
  it("is true only for a range whose end is before its start", () => {
    expect(isReversed(undefined)).toBe(false);
    expect(isReversed({ start: time(9), end: time(9) })).toBe(false);
    expect(isReversed({ start: time(9), end: time(8, 59) })).toBe(true);
  });
});

describe("rangeKey", () => {
  it("keys a range by its ISO ends, and no range as undefined", () => {
    expect(rangeKey(undefined)).toBeUndefined();
    expect(rangeKey({ start: time(9), end: LocalTime.of(17, 0, 30) })).toBe("09:00/17:00:30");
    expect(rangeKey({ start: time(9), end: time(17) })).toBe(rangeKey({ start: time(9), end: time(17) }));
  });
});
