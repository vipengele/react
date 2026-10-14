import { Locale, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import { isOutOfBounds } from "../TimeField/timeSegments.js";
import {
  pickTimeOption,
  type TimePanelSettings,
  type TimeStrip,
  type TimeStripKind,
  timePanelLayout,
  timePanelStrips,
} from "./timePanelModel.js";

const us = timePanelLayout(new Locale("en-US"));
const de = timePanelLayout(new Locale("de-DE"));

const fives: TimePanelSettings = { minuteStep: 5 };

/** Allows only the times from `min` to `max`, both inclusive. */
function allowedBetween(min: LocalTime, max: LocalTime, minuteStep = 5): TimePanelSettings {
  return { minuteStep, isTimeDisabled: (time) => isOutOfBounds(time, { min, max }) };
}

function strip(strips: readonly TimeStrip[], kind: TimeStripKind): TimeStrip {
  const found = strips.find((candidate) => candidate.kind === kind);
  if (found === undefined) throw new Error(`no ${kind} strip`);
  return found;
}

function values(strips: readonly TimeStrip[], kind: TimeStripKind): number[] {
  return strip(strips, kind).options.map((option) => option.value);
}

function selected(strips: readonly TimeStrip[], kind: TimeStripKind): number[] {
  return strip(strips, kind)
    .options.filter((option) => option.selected)
    .map((option) => option.value);
}

function disabled(strips: readonly TimeStrip[], kind: TimeStripKind): number[] {
  return strip(strips, kind)
    .options.filter((option) => option.disabled)
    .map((option) => option.value);
}

/** A time as `[hour, minute, second]`, or `undefined`. */
function parts(time: LocalTime | undefined): [number, number, number] | undefined {
  return time === undefined ? undefined : [time.hour, time.minute, time.second];
}

describe("timePanelStrips", () => {
  it("shows hour 12, 1 … 11, the minutes and the day periods on a 12-hour layout", () => {
    const strips = timePanelStrips(us, undefined, fives);
    expect(strips.map((candidate) => candidate.kind)).toEqual(["hour", "minute", "dayPeriod"]);
    expect(values(strips, "hour")).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(
      strip(strips, "hour")
        .options.map((option) => option.label)
        .slice(0, 3),
    ).toEqual(["12", "01", "02"]);
    expect(values(strips, "minute")).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(
      strip(strips, "minute")
        .options.map((option) => option.label)
        .slice(0, 3),
    ).toEqual(["00", "05", "10"]);
    expect(strip(strips, "dayPeriod").options.map((option) => [option.value, option.label])).toEqual([
      [0, "AM"],
      [1, "PM"],
    ]);
  });

  it("shows hours 0 … 23 and no day period strip on a 24-hour layout", () => {
    const strips = timePanelStrips(de, undefined, fives);
    expect(strips.map((candidate) => candidate.kind)).toEqual(["hour", "minute"]);
    expect(values(strips, "hour")).toEqual(Array.from({ length: 24 }, (_, hour) => hour));
    expect(strip(strips, "hour").options[0]?.label).toBe("00");
  });

  it("spaces the minutes by minuteStep", () => {
    expect(values(timePanelStrips(de, undefined, { minuteStep: 15 }), "minute")).toEqual([0, 15, 30, 45]);
    expect(values(timePanelStrips(de, undefined, { minuteStep: 7 }), "minute")).toEqual([0, 7, 14, 21, 28, 35, 42, 49, 56]);
    expect(values(timePanelStrips(de, undefined, { minuteStep: 1 }), "minute")).toHaveLength(60);
  });

  it("refuses a minuteStep that is not a positive integer", () => {
    expect(() => timePanelStrips(de, undefined, { minuteStep: 0 })).toThrow(RangeError);
    expect(() => timePanelStrips(de, undefined, { minuteStep: 2.5 })).toThrow(RangeError);
  });

  it("selects no option while there is no value", () => {
    const strips = timePanelStrips(us, undefined, fives);
    for (const candidate of strips) expect(candidate.options.some((option) => option.selected)).toBe(false);
  });

  it("selects the clock hour, minute and day period of a value", () => {
    const strips = timePanelStrips(us, LocalTime.of(21, 5), fives);
    expect(selected(strips, "hour")).toEqual([9]);
    expect(selected(strips, "minute")).toEqual([5]);
    expect(selected(strips, "dayPeriod")).toEqual([1]);
    expect(selected(timePanelStrips(us, LocalTime.of(0, 0), fives), "hour")).toEqual([12]);
    expect(selected(timePanelStrips(us, LocalTime.of(12, 0), fives), "dayPeriod")).toEqual([1]);
    expect(selected(timePanelStrips(de, LocalTime.of(21, 5), fives), "hour")).toEqual([21]);
  });

  it("inserts an off-grid minute in order and selects it", () => {
    const strips = timePanelStrips(de, LocalTime.of(10, 7), fives);
    expect(values(strips, "minute")).toEqual([0, 5, 7, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(selected(strips, "minute")).toEqual([7]);
    expect(values(timePanelStrips(de, LocalTime.of(10, 59), { minuteStep: 15 }), "minute")).toEqual([0, 15, 30, 45, 59]);
  });

  it("ignores a value's seconds", () => {
    const strips = timePanelStrips(de, LocalTime.of(10, 5, 30), fives);
    expect(values(strips, "minute")).toEqual([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    expect(selected(strips, "minute")).toEqual([5]);
  });

  it("disables no option without isTimeDisabled", () => {
    for (const candidate of timePanelStrips(us, LocalTime.of(10, 0), fives)) {
      expect(candidate.options.some((option) => option.disabled)).toBe(false);
    }
  });

  it("disables an hour no allowed time uses at the selected minute", () => {
    const settings = allowedBetween(LocalTime.of(9, 0), LocalTime.of(17, 0));
    const strips = timePanelStrips(de, LocalTime.of(10, 30), settings);
    expect(disabled(strips, "hour")).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 17, 18, 19, 20, 21, 22, 23]);
    expect(disabled(strips, "minute")).toEqual([]);
    expect(disabled(timePanelStrips(de, LocalTime.of(10, 0), settings), "hour")).not.toContain(17);
  });

  it("disables a minute no allowed time uses at the selected hour", () => {
    const strips = timePanelStrips(de, LocalTime.of(17, 0), allowedBetween(LocalTime.of(9, 0), LocalTime.of(17, 0)));
    expect(disabled(strips, "minute")).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    const morning = timePanelStrips(de, LocalTime.of(9, 30), allowedBetween(LocalTime.of(9, 20), LocalTime.of(17, 0)));
    expect(disabled(morning, "minute")).toEqual([0, 5, 10, 15]);
  });

  it("holds the day period when disabling hours on a 12-hour layout", () => {
    const strips = timePanelStrips(us, LocalTime.of(14, 0), allowedBetween(LocalTime.of(9, 0), LocalTime.of(17, 0)));
    expect(disabled(strips, "hour")).toEqual([6, 7, 8, 9, 10, 11]);
    expect(disabled(strips, "dayPeriod")).toEqual([0]);
  });

  it("counts an unset strip as any of its options", () => {
    const strips = timePanelStrips(us, undefined, allowedBetween(LocalTime.of(13, 0), LocalTime.of(14, 0)));
    expect(disabled(strips, "hour")).toEqual([12, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(disabled(strips, "minute")).toEqual([]);
    expect(disabled(strips, "dayPeriod")).toEqual([0]);
  });
});

describe("pickTimeOption", () => {
  it("changes only the picked strip", () => {
    expect(parts(pickTimeOption(de, LocalTime.of(10, 30), "hour", 14, fives))).toEqual([14, 30, 0]);
    expect(parts(pickTimeOption(de, LocalTime.of(10, 30), "minute", 45, fives))).toEqual([10, 45, 0]);
    expect(parts(pickTimeOption(us, LocalTime.of(10, 30), "dayPeriod", 1, fives))).toEqual([22, 30, 0]);
    expect(parts(pickTimeOption(us, LocalTime.of(22, 30), "dayPeriod", 0, fives))).toEqual([10, 30, 0]);
  });

  it("never flips the day period through an hour pick", () => {
    expect(parts(pickTimeOption(us, LocalTime.of(23, 30), "hour", 12, fives))).toEqual([12, 30, 0]);
    expect(parts(pickTimeOption(us, LocalTime.of(12, 15), "hour", 11, fives))).toEqual([23, 15, 0]);
    expect(parts(pickTimeOption(us, LocalTime.of(0, 15), "hour", 1, fives))).toEqual([1, 15, 0]);
    expect(parts(pickTimeOption(us, LocalTime.of(11, 15), "hour", 12, fives))).toEqual([0, 15, 0]);
  });

  it("keeps an off-grid minute through an hour or day period pick", () => {
    expect(parts(pickTimeOption(us, LocalTime.of(10, 7), "hour", 3, fives))).toEqual([3, 7, 0]);
    expect(parts(pickTimeOption(us, LocalTime.of(10, 7), "dayPeriod", 1, fives))).toEqual([22, 7, 0]);
  });

  it("drops the value's seconds", () => {
    expect(parts(pickTimeOption(de, LocalTime.of(10, 7, 45), "minute", 10, fives))).toEqual([10, 10, 0]);
    expect(parts(pickTimeOption(us, LocalTime.of(10, 7, 45), "dayPeriod", 0, fives))).toEqual([10, 7, 0]);
  });

  it("fills the other strips with their first option on the first pick", () => {
    expect(parts(pickTimeOption(us, undefined, "hour", 3, fives))).toEqual([3, 0, 0]);
    expect(parts(pickTimeOption(us, undefined, "minute", 30, fives))).toEqual([0, 30, 0]);
    expect(parts(pickTimeOption(us, undefined, "dayPeriod", 1, fives))).toEqual([12, 0, 0]);
    expect(parts(pickTimeOption(de, undefined, "minute", 15, { minuteStep: 15 }))).toEqual([0, 15, 0]);
    expect(parts(pickTimeOption(de, undefined, "hour", 9, fives))).toEqual([9, 0, 0]);
  });

  it("selects every strip once the first pick fills them", () => {
    const picked = pickTimeOption(us, undefined, "minute", 30, fives);
    const strips = timePanelStrips(us, picked, fives);
    expect(selected(strips, "hour")).toEqual([12]);
    expect(selected(strips, "minute")).toEqual([30]);
    expect(selected(strips, "dayPeriod")).toEqual([0]);
  });

  it("moves a filled strip to the nearest allowed option when the first pick lands outside", () => {
    const settings = allowedBetween(LocalTime.of(13, 0), LocalTime.of(14, 0));
    expect(parts(pickTimeOption(us, undefined, "hour", 1, settings))).toEqual([13, 0, 0]);
    expect(parts(pickTimeOption(us, undefined, "minute", 30, settings))).toEqual([13, 30, 0]);
    expect(parts(pickTimeOption(us, undefined, "dayPeriod", 1, settings))).toEqual([13, 0, 0]);
    const late = allowedBetween(LocalTime.of(9, 20), LocalTime.of(17, 0));
    expect(parts(pickTimeOption(de, undefined, "hour", 9, late))).toEqual([9, 20, 0]);
  });

  it("moves the minute to the nearest allowed option when an hour pick lands outside", () => {
    const settings = allowedBetween(LocalTime.of(9, 0), LocalTime.of(17, 0));
    expect(parts(pickTimeOption(de, LocalTime.of(16, 30), "hour", 17, settings))).toEqual([17, 0, 0]);
    const morning = allowedBetween(LocalTime.of(9, 20), LocalTime.of(17, 0));
    expect(parts(pickTimeOption(de, LocalTime.of(10, 5), "hour", 9, morning))).toEqual([9, 20, 0]);
  });

  it("moves the hour to the nearest allowed option when a minute pick lands outside", () => {
    const settings = allowedBetween(LocalTime.of(9, 0), LocalTime.of(17, 0));
    expect(parts(pickTimeOption(de, LocalTime.of(17, 0), "minute", 30, settings))).toEqual([16, 30, 0]);
  });

  it("moves to the earlier of two equally near allowed times", () => {
    const halfHours: TimePanelSettings = { minuteStep: 5, isTimeDisabled: (time) => time.minute % 30 !== 0 };
    expect(parts(pickTimeOption(de, LocalTime.of(9, 15), "hour", 10, halfHours))).toEqual([10, 0, 0]);
  });

  it("keeps the day period when an hour pick has to move the minute", () => {
    const settings = allowedBetween(LocalTime.of(9, 0), LocalTime.of(17, 0));
    expect(parts(pickTimeOption(us, LocalTime.of(16, 30), "hour", 5, settings))).toEqual([17, 0, 0]);
  });

  it("refuses an hour pick no allowed time in the selected day period uses", () => {
    const settings = allowedBetween(LocalTime.of(9, 0), LocalTime.of(17, 0));
    expect(pickTimeOption(us, LocalTime.of(14, 0), "hour", 8, settings)).toBeUndefined();
  });

  it("refuses a pick no allowed time uses at all", () => {
    const nothing: TimePanelSettings = { minuteStep: 5, isTimeDisabled: () => true };
    expect(pickTimeOption(de, undefined, "hour", 3, nothing)).toBeUndefined();
  });

  it("returns the plain combination when nothing is disabled", () => {
    expect(parts(pickTimeOption(us, LocalTime.of(14, 0), "hour", 8, { minuteStep: 30 }))).toEqual([20, 0, 0]);
  });
});
