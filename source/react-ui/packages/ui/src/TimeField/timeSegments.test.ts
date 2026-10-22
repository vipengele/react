import { Locale, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import {
  adjacentSegment,
  clearSegment,
  commitTimeState,
  displaySegments,
  endEntry,
  enterDigit,
  enterTimeText,
  initialTimeState,
  isOutOfBounds,
  selectDayPeriod,
  settleTimeText,
  stepSegment,
  type TimeDisplaySegment,
  type TimeEditableSegment,
  type TimeFieldState,
  type TimeLayout,
  type TimeNumericSegment,
  type TimeTextEntry,
  timeLayout,
  toLocalTime,
} from "./timeSegments.js";

const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const koKR = new Locale("ko-KR");

const us = timeLayout(enUS, false);
const usSeconds = timeLayout(enUS, true);
const de = timeLayout(deDE, false);
const deSeconds = timeLayout(deDE, true);
const ko = timeLayout(koKR, false);

const empty = initialTimeState(us, undefined);

/** The rendered segments as `type=text` strings, literals left out. */
function shown(segments: readonly TimeDisplaySegment[]): string[] {
  return segments.flatMap((segment) => (segment.type === "literal" ? [] : [`${segment.type}=${segment.text ?? ""}`]));
}

/** Types each character of `keys` into `segment`, returning the final entry. */
function type(layout: TimeLayout, state: TimeFieldState, segment: TimeNumericSegment, keys: string) {
  let entry = { state, advance: false };
  for (const key of keys) {
    const next = enterDigit(layout, entry.state, segment, key);
    if (next === undefined) throw new Error(`not a digit: ${key}`);
    entry = next;
  }
  return entry;
}

describe("timeLayout", () => {
  it("orders a 12-hour locale hour, minute, day period", () => {
    expect(us.editable).toEqual(["hour", "minute", "dayPeriod"]);
    expect(us.twelveHour).toBe(true);
    expect(us.seconds).toBe(false);
    expect(us.tag).toBe("en-US");
    expect(us.dayPeriods).toEqual({ am: "AM", pm: "PM" });
  });

  it("places the second after the minute when seconds are on", () => {
    expect(usSeconds.editable).toEqual(["hour", "minute", "second", "dayPeriod"]);
    expect(deSeconds.editable).toEqual(["hour", "minute", "second"]);
  });

  it("gives a 24-hour locale no day period segment", () => {
    expect(de.editable).toEqual(["hour", "minute"]);
    expect(de.twelveHour).toBe(false);
    expect(de.parts).toEqual([{ type: "hour" }, { type: "literal", text: ":" }, { type: "minute" }]);
  });

  it("puts the day period first in a period-first locale", () => {
    expect(ko.editable).toEqual(["dayPeriod", "hour", "minute"]);
    expect(ko.twelveHour).toBe(true);
    expect(ko.dayPeriods).toEqual({ am: "오전", pm: "오후" });
  });

  it("keeps the literals the locale writes between the segments", () => {
    const joined = us.parts.map((part) => (part.type === "literal" ? part.text : `<${part.type}>`)).join("");
    expect(joined).toMatch(/^<hour>:<minute>\s<dayPeriod>$/u);
  });
});

describe("initialTimeState", () => {
  it("is empty and unedited for no time", () => {
    expect(empty).toEqual({ hour: undefined, minute: undefined, second: undefined, dayPeriod: undefined, draft: undefined, edited: false });
  });

  it("shows midnight as 12 AM on a 12-hour clock", () => {
    const state = initialTimeState(us, LocalTime.of(0, 5));
    expect(state).toMatchObject({ hour: 12, minute: 5, dayPeriod: "am" });
    expect(shown(displaySegments(us, state))).toEqual(["hour=12", "minute=05", "dayPeriod=AM"]);
  });

  it("shows noon as 12 PM on a 12-hour clock", () => {
    const state = initialTimeState(us, LocalTime.of(12, 0));
    expect(state).toMatchObject({ hour: 12, minute: 0, dayPeriod: "pm" });
    expect(shown(displaySegments(us, state))).toEqual(["hour=12", "minute=00", "dayPeriod=PM"]);
  });

  it("shows an afternoon hour on a 12-hour clock as 1-11 PM", () => {
    expect(initialTimeState(us, LocalTime.of(13, 30))).toMatchObject({ hour: 1, dayPeriod: "pm" });
    expect(initialTimeState(us, LocalTime.of(11, 30))).toMatchObject({ hour: 11, dayPeriod: "am" });
  });

  it("shows the 24-hour hour and no day period on a 24-hour clock", () => {
    const state = initialTimeState(de, LocalTime.of(0, 7));
    expect(state).toMatchObject({ hour: 0, minute: 7, dayPeriod: undefined });
    expect(shown(displaySegments(de, state))).toEqual(["hour=00", "minute=07"]);
  });

  it("keeps the second only when the layout shows seconds", () => {
    expect(initialTimeState(deSeconds, LocalTime.of(14, 30, 15)).second).toBe(15);
    expect(initialTimeState(de, LocalTime.of(14, 30, 15)).second).toBeUndefined();
  });

  it("shows the period first in a period-first locale", () => {
    const state = initialTimeState(ko, LocalTime.of(13, 30));
    expect(shown(displaySegments(ko, state))).toEqual([`dayPeriod=${ko.dayPeriods.pm}`, "hour=01", "minute=30"]);
  });
});

describe("displaySegments", () => {
  it("shows every segment empty, with its range, for an empty field", () => {
    const segments = displaySegments(usSeconds, empty).filter((segment) => segment.type !== "literal");
    expect(segments).toEqual([
      { type: "hour", text: undefined, value: undefined, min: 1, max: 12 },
      { type: "minute", text: undefined, value: undefined, min: 0, max: 59 },
      { type: "second", text: undefined, value: undefined, min: 0, max: 59 },
      { type: "dayPeriod", text: undefined, value: undefined, min: 0, max: 1 },
    ]);
  });

  it("reports the 24-hour hour range", () => {
    expect(displaySegments(de, empty)[0]).toMatchObject({ type: "hour", min: 0, max: 23 });
  });

  it("values AM as 0 and PM as 1", () => {
    const am = displaySegments(us, initialTimeState(us, LocalTime.of(9, 0)));
    const pm = displaySegments(us, initialTimeState(us, LocalTime.of(21, 0)));
    expect(am.find((segment) => segment.type === "dayPeriod")).toMatchObject({ value: 0, text: "AM" });
    expect(pm.find((segment) => segment.type === "dayPeriod")).toMatchObject({ value: 1, text: "PM" });
  });

  it("shows the digits of an entry in progress as typed", () => {
    const { state } = type(us, empty, "hour", "0");
    expect(displaySegments(us, state)[0]).toMatchObject({ type: "hour", text: "0", value: undefined });
  });

  it("shows the seconds of a value in a field with seconds", () => {
    expect(shown(displaySegments(deSeconds, initialTimeState(deSeconds, LocalTime.of(8, 9, 5))))).toEqual([
      "hour=08",
      "minute=09",
      "second=05",
    ]);
  });
});

describe("adjacentSegment", () => {
  it("moves through the editable segments in logical order", () => {
    expect(adjacentSegment(us, "hour", 1)).toBe("minute");
    expect(adjacentSegment(us, "minute", 1)).toBe("dayPeriod");
    expect(adjacentSegment(ko, "dayPeriod", 1)).toBe("hour");
    expect(adjacentSegment(us, "minute", -1)).toBe("hour");
  });

  it("returns undefined past either end", () => {
    expect(adjacentSegment(us, "dayPeriod", 1)).toBeUndefined();
    expect(adjacentSegment(us, "hour", -1)).toBeUndefined();
    expect(adjacentSegment(de, "minute", 1)).toBeUndefined();
  });
});

describe("enterDigit", () => {
  it("ignores a key that is not an ASCII digit", () => {
    expect(enterDigit(us, empty, "hour", "a")).toBeUndefined();
    expect(enterDigit(us, empty, "hour", "١")).toBeUndefined();
    expect(enterDigit(us, empty, "hour", "12")).toBeUndefined();
  });

  it("waits for a second digit when one could follow in range, and holds the value meanwhile", () => {
    const entry = type(us, empty, "hour", "1");
    expect(entry.advance).toBe(false);
    expect(entry.state).toMatchObject({ hour: 1, draft: { segment: "hour", text: "1" }, edited: true });
  });

  it("fills the segment and advances on a second digit in range", () => {
    const entry = type(us, empty, "hour", "11");
    expect(entry.advance).toBe(true);
    expect(entry.state).toMatchObject({ hour: 11, draft: undefined });
  });

  it("fills a 12-hour hour from one digit no second digit could follow", () => {
    const entry = type(us, empty, "hour", "2");
    expect(entry).toMatchObject({ advance: true, state: { hour: 2, draft: undefined } });
  });

  it("fills a 24-hour hour from one digit above 2", () => {
    expect(type(de, empty, "hour", "3")).toMatchObject({ advance: true, state: { hour: 3 } });
    expect(type(de, empty, "hour", "2")).toMatchObject({ advance: false, state: { hour: 2 } });
    expect(type(de, empty, "hour", "23")).toMatchObject({ advance: true, state: { hour: 23 } });
  });

  it("fills a minute from one digit above 5", () => {
    expect(type(us, empty, "minute", "6")).toMatchObject({ advance: true, state: { minute: 6 } });
    expect(type(us, empty, "minute", "59")).toMatchObject({ advance: true, state: { minute: 59 } });
    expect(type(deSeconds, empty, "second", "07")).toMatchObject({ advance: true, state: { second: 7 } });
  });

  it("starts a 12-hour hour again from the new digit when two digits are out of range", () => {
    expect(type(us, empty, "hour", "13")).toMatchObject({ advance: true, state: { hour: 3, draft: undefined } });
    expect(type(us, empty, "hour", "10")).toMatchObject({ advance: true, state: { hour: 10 } });
    expect(type(us, empty, "hour", "12")).toMatchObject({ advance: true, state: { hour: 12 } });
  });

  it("starts a 24-hour hour again from the new digit when two digits are out of range", () => {
    expect(type(de, empty, "hour", "24")).toMatchObject({ advance: true, state: { hour: 4 } });
    expect(type(de, empty, "hour", "21")).toMatchObject({ advance: true, state: { hour: 21 } });
  });

  it("leaves a 12-hour hour empty on a lone 0, which only a second digit can complete", () => {
    const zero = type(us, empty, "hour", "0");
    expect(zero).toMatchObject({ advance: false, state: { hour: undefined, draft: { segment: "hour", text: "0" } } });
    expect(type(us, zero.state, "hour", "0")).toMatchObject({ advance: false, state: { hour: undefined } });
    expect(type(us, zero.state, "hour", "7")).toMatchObject({ advance: true, state: { hour: 7 } });
  });

  it("holds 0 in a 24-hour hour and a minute while it waits", () => {
    expect(type(de, empty, "hour", "0")).toMatchObject({ advance: false, state: { hour: 0 } });
    expect(type(de, empty, "minute", "0")).toMatchObject({ advance: false, state: { minute: 0 } });
  });

  it("starts afresh in a segment other than the one with the entry in progress", () => {
    const hour = type(de, empty, "hour", "1");
    const minute = type(de, hour.state, "minute", "4");
    expect(minute).toMatchObject({ advance: false, state: { hour: 1, minute: 4, draft: { segment: "minute", text: "4" } } });
  });

  it("replaces a filled segment rather than appending to it", () => {
    const filled = initialTimeState(de, LocalTime.of(1, 0));
    expect(type(de, filled, "hour", "1")).toMatchObject({ advance: false, state: { hour: 1, draft: { text: "1" } } });
  });
});

describe("endEntry", () => {
  it("drops the entry in progress so the next digit starts afresh", () => {
    const pending = type(de, empty, "hour", "1").state;
    const ended = endEntry(pending);
    expect(ended).toMatchObject({ hour: 1, draft: undefined });
    expect(type(de, ended, "hour", "2")).toMatchObject({ state: { hour: 2 } });
  });

  it("returns the same state when no entry is in progress", () => {
    expect(endEntry(empty)).toBe(empty);
  });
});

describe("stepSegment", () => {
  it("wraps a 24-hour hour between 23 and 00", () => {
    expect(stepSegment(de, initialTimeState(de, LocalTime.of(23, 0)), "hour", 1).hour).toBe(0);
    expect(stepSegment(de, initialTimeState(de, LocalTime.of(0, 0)), "hour", -1).hour).toBe(23);
    expect(stepSegment(de, initialTimeState(de, LocalTime.of(9, 0)), "hour", 1).hour).toBe(10);
  });

  it("wraps a 12-hour hour between 12 and 1 without changing the period", () => {
    const twelve = initialTimeState(us, LocalTime.of(12, 0));
    expect(stepSegment(us, twelve, "hour", 1)).toMatchObject({ hour: 1, dayPeriod: "pm" });
    const one = initialTimeState(us, LocalTime.of(1, 0));
    expect(stepSegment(us, one, "hour", -1)).toMatchObject({ hour: 12, dayPeriod: "am" });
    const eleven = initialTimeState(us, LocalTime.of(23, 0));
    expect(stepSegment(us, eleven, "hour", 1)).toMatchObject({ hour: 12, dayPeriod: "pm" });
  });

  it("wraps a minute and a second between 59 and 00", () => {
    const state = initialTimeState(deSeconds, LocalTime.of(10, 59, 0));
    expect(stepSegment(deSeconds, state, "minute", 1).minute).toBe(0);
    expect(stepSegment(deSeconds, state, "second", -1).second).toBe(59);
  });

  it("steps an empty segment up to its lowest value and down to its highest", () => {
    expect(stepSegment(us, empty, "hour", 1).hour).toBe(1);
    expect(stepSegment(us, empty, "hour", -1).hour).toBe(12);
    expect(stepSegment(de, empty, "hour", 1).hour).toBe(0);
    expect(stepSegment(de, empty, "hour", -1).hour).toBe(23);
    expect(stepSegment(de, empty, "minute", -1).minute).toBe(59);
  });

  it("toggles the day period either way", () => {
    const am = initialTimeState(us, LocalTime.of(9, 0));
    expect(stepSegment(us, am, "dayPeriod", 1).dayPeriod).toBe("pm");
    expect(stepSegment(us, am, "dayPeriod", -1).dayPeriod).toBe("pm");
    const pm = initialTimeState(us, LocalTime.of(21, 0));
    expect(stepSegment(us, pm, "dayPeriod", 1).dayPeriod).toBe("am");
  });

  it("steps an empty day period up to AM and down to PM", () => {
    expect(stepSegment(us, empty, "dayPeriod", 1).dayPeriod).toBe("am");
    expect(stepSegment(us, empty, "dayPeriod", -1).dayPeriod).toBe("pm");
  });

  it("marks the state edited and ends any entry in progress", () => {
    const pending = type(de, empty, "hour", "1").state;
    expect(stepSegment(de, pending, "hour", 1)).toMatchObject({ hour: 2, draft: undefined, edited: true });
    expect(stepSegment(us, pending, "dayPeriod", 1)).toMatchObject({ draft: undefined, edited: true });
  });
});

// biome-ignore lint/security/noSecrets: a function name, read as a high-entropy string
describe("isOutOfBounds", () => {
  const bounds = { min: LocalTime.of(9, 0), max: LocalTime.of(17, 30, 15) };

  it("accepts a time inside the bounds, either end included", () => {
    expect(isOutOfBounds(LocalTime.of(12, 0), bounds)).toBe(false);
    expect(isOutOfBounds(LocalTime.of(9, 0), bounds)).toBe(false);
    expect(isOutOfBounds(LocalTime.of(17, 30, 15), bounds)).toBe(false);
  });

  it("rejects a time before min or after max, to the second", () => {
    expect(isOutOfBounds(LocalTime.of(8, 59, 59), bounds)).toBe(true);
    expect(isOutOfBounds(LocalTime.of(17, 30, 16), bounds)).toBe(true);
  });

  it("checks only the ends that are given", () => {
    expect(isOutOfBounds(LocalTime.of(0, 0), {})).toBe(false);
    expect(isOutOfBounds(LocalTime.of(23, 59), { min: LocalTime.of(9, 0) })).toBe(false);
    expect(isOutOfBounds(LocalTime.of(0, 0), { max: LocalTime.of(17, 0) })).toBe(false);
  });
});

describe("stepSegment within bounds", () => {
  const office = { min: LocalTime.of(9, 0), max: LocalTime.of(17, 0) };

  it("refuses a step that takes a filled 24-hour field past either bound, returning the same state", () => {
    const atMax = initialTimeState(de, LocalTime.of(17, 0));
    expect(stepSegment(de, atMax, "hour", 1, office)).toBe(atMax);
    expect(stepSegment(de, atMax, "minute", 1, office)).toBe(atMax);
    const atMin = initialTimeState(de, LocalTime.of(9, 0));
    expect(stepSegment(de, atMin, "hour", -1, office)).toBe(atMin);
  });

  it("allows a step onto either bound, which is inclusive", () => {
    expect(toLocalTime(de, stepSegment(de, initialTimeState(de, LocalTime.of(16, 0)), "hour", 1, office))?.toString()).toBe("17:00");
    expect(toLocalTime(de, stepSegment(de, initialTimeState(de, LocalTime.of(9, 1)), "minute", -1, office))?.toString()).toBe("09:00");
  });

  it("refuses a wrap that lands outside the bounds", () => {
    const state = initialTimeState(de, LocalTime.of(9, 0));
    expect(stepSegment(de, state, "minute", -1, { min: LocalTime.of(8, 30), max: LocalTime.of(9, 30) })).toBe(state);
    expect(stepSegment(de, state, "minute", -1, { min: LocalTime.of(9, 0) })).toMatchObject({ minute: 59, hour: 9 });
  });

  it("checks the second in a field with seconds", () => {
    const bounds = { max: LocalTime.of(10, 0, 30) };
    const state = initialTimeState(deSeconds, LocalTime.of(10, 0, 30));
    expect(stepSegment(deSeconds, state, "second", 1, bounds)).toBe(state);
    expect(stepSegment(deSeconds, state, "second", -1, bounds)).toMatchObject({ second: 29 });
  });

  it("checks the zero second a field without seconds commits", () => {
    const state = initialTimeState(de, LocalTime.of(10, 1));
    expect(stepSegment(de, state, "minute", -1, { min: LocalTime.of(10, 0, 30) })).toBe(state);
  });

  it("steps freely while any segment is empty", () => {
    const noMinute = clearSegment(initialTimeState(de, LocalTime.of(17, 0)), "minute");
    expect(stepSegment(de, noMinute, "hour", 1, office)).toMatchObject({ hour: 18, minute: undefined });
    expect(stepSegment(deSeconds, initialTimeState(deSeconds, undefined), "hour", -1, office)).toMatchObject({ hour: 23 });
  });

  it("steps freely into the last empty segment, leaving the bound to the commit", () => {
    const noPeriod = clearSegment(initialTimeState(us, LocalTime.of(21, 0)), "dayPeriod");
    const stepped = stepSegment(us, noPeriod, "dayPeriod", -1, office);
    expect(stepped).toMatchObject({ hour: 9, dayPeriod: "pm" });
    expect(commitTimeState(us, stepped, office)).toEqual({ kind: "rejected" });
  });

  describe("on a 12-hour clock", () => {
    it("refuses an hour step from 11 to 12, which crosses into the other half of the day, past a bound", () => {
      const morning = initialTimeState(us, LocalTime.of(11, 30));
      expect(stepSegment(us, morning, "hour", 1, office)).toBe(morning);
      expect(stepSegment(us, morning, "hour", 1)).toMatchObject({ hour: 12, dayPeriod: "am" });
    });

    it("refuses a day period toggle that lands outside the bounds", () => {
      const nine = initialTimeState(us, LocalTime.of(9, 0));
      expect(stepSegment(us, nine, "dayPeriod", 1, office)).toBe(nine);
      const four = initialTimeState(us, LocalTime.of(16, 0));
      expect(stepSegment(us, four, "dayPeriod", -1, office)).toBe(four);
    });

    it("reaches a noon bound through the day period and stops there", () => {
      const toNoon = { max: LocalTime.of(12, 0) };
      const midnight = initialTimeState(us, LocalTime.of(0, 0));
      const noon = stepSegment(us, midnight, "dayPeriod", 1, toNoon);
      expect(toLocalTime(us, noon)?.toString()).toBe("12:00");
      expect(stepSegment(us, noon, "minute", 1, toNoon)).toBe(noon);
      expect(stepSegment(us, noon, "hour", 1, toNoon)).toBe(noon);
    });

    it("refuses a step past a bound with seconds on", () => {
      const bounds = { min: LocalTime.of(9, 0), max: LocalTime.of(12, 0) };
      const state = initialTimeState(usSeconds, LocalTime.of(11, 59, 59));
      expect(stepSegment(usSeconds, state, "hour", 1, bounds)).toBe(state);
      expect(stepSegment(usSeconds, state, "dayPeriod", 1, bounds)).toBe(state);
      expect(stepSegment(usSeconds, state, "second", 1, bounds)).toMatchObject({ second: 0, minute: 59, hour: 11 });
    });
  });
});

describe("selectDayPeriod", () => {
  it("selects AM and PM by their first letter in either case", () => {
    expect(selectDayPeriod(us, empty, "a")).toMatchObject({ dayPeriod: "am", edited: true });
    expect(selectDayPeriod(us, empty, "P")).toMatchObject({ dayPeriod: "pm", edited: true });
  });

  it("selects by the first character where the labels differ when they share a first one", () => {
    expect(selectDayPeriod(ko, empty, "전")).toMatchObject({ dayPeriod: "am" });
    expect(selectDayPeriod(ko, empty, "후")).toMatchObject({ dayPeriod: "pm" });
    expect(selectDayPeriod(ko, empty, "오")).toBeUndefined();
  });

  it("returns undefined for a key that matches neither label", () => {
    expect(selectDayPeriod(us, empty, "m")).toBeUndefined();
    expect(selectDayPeriod(us, empty, "x")).toBeUndefined();
    expect(selectDayPeriod(us, empty, "ArrowUp")).toBeUndefined();
  });

  it("matches no key when the labels are identical", () => {
    const same: TimeLayout = { ...us, dayPeriods: { am: "X", pm: "X" } };
    expect(selectDayPeriod(same, empty, "x")).toBeUndefined();
  });

  it("ends any entry in progress", () => {
    const pending = type(us, empty, "hour", "1").state;
    expect(selectDayPeriod(us, pending, "p")).toMatchObject({ hour: 1, dayPeriod: "pm", draft: undefined });
  });
});

/** Types each character of `keys` at the end of `segment`'s text with `enterTimeText`, from empty. */
function typeText(layout: TimeLayout, segment: TimeEditableSegment, keys: string) {
  let text = "";
  let entry: TimeTextEntry = { kind: "unhandled" };
  for (const key of keys) {
    entry = enterTimeText(layout, segment, text, key);
    if (entry.kind === "entered") text = entry.text;
  }
  return { text, entry };
}

describe("enterTimeText", () => {
  it("types a 12-hour hour as a time field does", () => {
    expect(enterTimeText(us, "hour", "", "0")).toEqual({ kind: "entered", text: "0", complete: false });
    expect(enterTimeText(us, "hour", "", "1")).toEqual({ kind: "entered", text: "1", complete: false });
    expect(enterTimeText(us, "hour", "", "2")).toEqual({ kind: "entered", text: "02", complete: true });
    expect(enterTimeText(us, "hour", "", "3")).toEqual({ kind: "entered", text: "03", complete: true });
    expect(enterTimeText(us, "hour", "1", "2")).toEqual({ kind: "entered", text: "12", complete: true });
    expect(enterTimeText(us, "hour", "1", "3")).toEqual({ kind: "entered", text: "03", complete: true });
    expect(enterTimeText(us, "hour", "0", "7")).toEqual({ kind: "entered", text: "07", complete: true });
  });

  it("types a 24-hour hour as a time field does", () => {
    expect(enterTimeText(de, "hour", "", "0")).toEqual({ kind: "entered", text: "0", complete: false });
    expect(enterTimeText(de, "hour", "", "1")).toEqual({ kind: "entered", text: "1", complete: false });
    expect(enterTimeText(de, "hour", "", "2")).toEqual({ kind: "entered", text: "2", complete: false });
    expect(enterTimeText(de, "hour", "", "3")).toEqual({ kind: "entered", text: "03", complete: true });
    expect(enterTimeText(de, "hour", "1", "2")).toEqual({ kind: "entered", text: "12", complete: true });
    expect(enterTimeText(de, "hour", "1", "3")).toEqual({ kind: "entered", text: "13", complete: true });
    expect(enterTimeText(de, "hour", "0", "0")).toEqual({ kind: "entered", text: "00", complete: true });
  });

  it("replaces the digit shown when the two digits are out of range", () => {
    expect(enterTimeText(us, "hour", "1", "9")).toEqual({ kind: "entered", text: "09", complete: true });
    expect(enterTimeText(de, "hour", "2", "4")).toEqual({ kind: "entered", text: "04", complete: true });
    expect(enterTimeText(us, "hour", "1", "0")).toEqual({ kind: "entered", text: "10", complete: true });
  });

  it("drops a second 0 in a 12-hour hour, which a time field swallows", () => {
    expect(enterTimeText(us, "hour", "0", "0")).toEqual({ kind: "dropped" });
    expect(typeText(us, "hour", "005").text).toBe("05");
  });

  it("completes a minute from one digit above 5", () => {
    for (const key of ["6", "7", "8", "9"]) {
      expect(enterTimeText(us, "minute", "", key)).toEqual({ kind: "entered", text: `0${key}`, complete: true });
      expect(enterTimeText(deSeconds, "second", "", key)).toEqual({ kind: "entered", text: `0${key}`, complete: true });
    }
    expect(enterTimeText(us, "minute", "", "5")).toEqual({ kind: "entered", text: "5", complete: false });
    expect(enterTimeText(us, "minute", "5", "9")).toEqual({ kind: "entered", text: "59", complete: true });
  });

  it("drops a letter at a numeric segment and leaves any other key unhandled", () => {
    expect(enterTimeText(us, "hour", "", "a")).toEqual({ kind: "dropped" });
    expect(enterTimeText(us, "hour", "1", "p")).toEqual({ kind: "dropped" });
    expect(enterTimeText(ko, "hour", "", "오")).toEqual({ kind: "dropped" });
    expect(enterTimeText(us, "hour", "1", ":")).toEqual({ kind: "unhandled" });
    expect(enterTimeText(de, "minute", "", " ")).toEqual({ kind: "unhandled" });
    expect(enterTimeText(us, "hour", "", "١")).toEqual({ kind: "unhandled" });
  });

  it("leaves a pending run of two or more digits unhandled", () => {
    expect(enterTimeText(us, "hour", "12", "3")).toEqual({ kind: "unhandled" });
    expect(enterTimeText(de, "minute", "05", "1")).toEqual({ kind: "unhandled" });
    expect(enterTimeText(de, "hour", "123", "a")).toEqual({ kind: "unhandled" });
  });

  it("leaves pending text that is not digits unhandled", () => {
    expect(enterTimeText(us, "hour", "a", "1")).toEqual({ kind: "unhandled" });
    expect(enterTimeText(us, "minute", "١", "1")).toEqual({ kind: "unhandled" });
  });

  it("shows what a time field shows for every digit, and every second digit the segment still takes", () => {
    const fieldText = (layout: TimeLayout, segment: TimeNumericSegment, keys: string) =>
      displaySegments(layout, type(layout, empty, segment, keys).state).find((part) => part.type === segment)?.text;
    for (const layout of [us, de]) {
      for (const segment of ["hour", "minute"] as const) {
        for (let first = 0; first <= 9; first += 1) {
          const single = typeText(layout, segment, `${first}`);
          expect(single.text, `${layout.tag} ${segment} ${first}`).toBe(fieldText(layout, segment, `${first}`));
          if (single.entry.kind === "entered" && single.entry.complete) continue;
          for (let second = 0; second <= 9; second += 1) {
            const keys = `${first}${second}`;
            expect(typeText(layout, segment, keys).text, `${layout.tag} ${segment} ${keys}`).toBe(fieldText(layout, segment, keys));
          }
        }
      }
    }
  });

  it("selects the day period by the first character where the labels differ, in either case", () => {
    expect(enterTimeText(us, "dayPeriod", "", "p")).toEqual({ kind: "entered", text: "PM", complete: true });
    expect(enterTimeText(us, "dayPeriod", "", "P")).toEqual({ kind: "entered", text: "PM", complete: true });
    expect(enterTimeText(us, "dayPeriod", "", "a")).toEqual({ kind: "entered", text: "AM", complete: true });
    expect(enterTimeText(us, "dayPeriod", "", "A")).toEqual({ kind: "entered", text: "AM", complete: true });
  });

  it("replaces a completed day period with the one a matching key picks out", () => {
    expect(enterTimeText(us, "dayPeriod", "PM", "a")).toEqual({ kind: "entered", text: "AM", complete: true });
    expect(enterTimeText(us, "dayPeriod", "AM", "P")).toEqual({ kind: "entered", text: "PM", complete: true });
  });

  it("drops a key that picks out neither day period", () => {
    expect(enterTimeText(us, "dayPeriod", "PM", "m")).toEqual({ kind: "dropped" });
    expect(enterTimeText(us, "dayPeriod", "", "m")).toEqual({ kind: "dropped" });
    expect(enterTimeText(us, "dayPeriod", "", "1")).toEqual({ kind: "dropped" });
    expect(typeText(us, "dayPeriod", "pm").text).toBe("PM");
  });

  it("selects a Korean day period by its distinguishing syllable, with no Latin fallback", () => {
    expect(enterTimeText(ko, "dayPeriod", "", "전")).toEqual({ kind: "entered", text: "오전", complete: true });
    expect(enterTimeText(ko, "dayPeriod", "", "후")).toEqual({ kind: "entered", text: "오후", complete: true });
    expect(enterTimeText(ko, "dayPeriod", "오전", "후")).toEqual({ kind: "entered", text: "오후", complete: true });
    expect(enterTimeText(ko, "dayPeriod", "", "오")).toEqual({ kind: "dropped" });
    expect(enterTimeText(ko, "dayPeriod", "", "p")).toEqual({ kind: "dropped" });
    expect(enterTimeText(ko, "dayPeriod", "", "a")).toEqual({ kind: "dropped" });
  });

  it("leaves a day period holding neither label unhandled", () => {
    expect(enterTimeText(us, "dayPeriod", "P", "m")).toEqual({ kind: "unhandled" });
    expect(enterTimeText(us, "dayPeriod", "pm", "a")).toEqual({ kind: "unhandled" });
  });
});

describe("settleTimeText", () => {
  it("pads a pending digit that holds a value and completes the segment", () => {
    expect(settleTimeText(us, "hour", "1")).toEqual({ kind: "entered", text: "01", complete: true });
    expect(settleTimeText(de, "hour", "2")).toEqual({ kind: "entered", text: "02", complete: true });
    expect(settleTimeText(de, "hour", "0")).toEqual({ kind: "entered", text: "00", complete: true });
    expect(settleTimeText(us, "minute", "5")).toEqual({ kind: "entered", text: "05", complete: true });
  });

  it("pads a lone digit that completes the segment by itself", () => {
    expect(settleTimeText(de, "hour", "7")).toEqual({ kind: "entered", text: "07", complete: true });
  });

  it("leaves a pending 12-hour 0 as typed and incomplete", () => {
    expect(settleTimeText(us, "hour", "0")).toEqual({ kind: "entered", text: "0", complete: false });
  });

  it("leaves empty pending text, two or more digits and anything but digits unhandled", () => {
    expect(settleTimeText(us, "hour", "")).toEqual({ kind: "unhandled" });
    expect(settleTimeText(us, "hour", "12")).toEqual({ kind: "unhandled" });
    expect(settleTimeText(de, "minute", "a")).toEqual({ kind: "unhandled" });
  });
});

describe("clearSegment", () => {
  it("empties the segment and marks the state edited", () => {
    const state = initialTimeState(us, LocalTime.of(14, 30));
    expect(clearSegment(state, "minute")).toMatchObject({ hour: 2, minute: undefined, dayPeriod: "pm", edited: true });
    expect(clearSegment(state, "dayPeriod")).toMatchObject({ dayPeriod: undefined });
  });

  it("ends any entry in progress", () => {
    const pending = type(de, empty, "hour", "1").state;
    expect(clearSegment(pending, "hour")).toMatchObject({ hour: undefined, draft: undefined });
  });
});

describe("toLocalTime", () => {
  it("builds 12 AM as midnight and 12 PM as noon", () => {
    const midnight = initialTimeState(us, LocalTime.of(0, 0));
    expect(toLocalTime(us, midnight)?.toString()).toBe("00:00");
    const noon = initialTimeState(us, LocalTime.of(12, 0));
    expect(toLocalTime(us, noon)?.toString()).toBe("12:00");
  });

  it("builds an afternoon time from a 12-hour hour and PM", () => {
    expect(toLocalTime(us, initialTimeState(us, LocalTime.of(13, 45)))?.toString()).toBe("13:45");
    expect(toLocalTime(ko, initialTimeState(ko, LocalTime.of(23, 59)))?.toString()).toBe("23:59");
  });

  it("builds a 24-hour time with seconds", () => {
    expect(toLocalTime(deSeconds, initialTimeState(deSeconds, LocalTime.of(14, 30, 15)))?.toString()).toBe("14:30:15");
  });

  it("is undefined while any segment is empty", () => {
    const full = initialTimeState(usSeconds, LocalTime.of(14, 30, 15));
    expect(toLocalTime(usSeconds, full)?.toString()).toBe("14:30:15");
    expect(toLocalTime(usSeconds, clearSegment(full, "hour"))).toBeUndefined();
    expect(toLocalTime(usSeconds, clearSegment(full, "minute"))).toBeUndefined();
    expect(toLocalTime(usSeconds, clearSegment(full, "second"))).toBeUndefined();
    expect(toLocalTime(usSeconds, clearSegment(full, "dayPeriod"))).toBeUndefined();
  });

  it("does not need a day period on a 24-hour clock", () => {
    const state: TimeFieldState = { ...empty, hour: 7, minute: 5 };
    expect(toLocalTime(de, state)?.toString()).toBe("07:05");
  });

  it("builds a time from typed digits", () => {
    let state = type(us, empty, "hour", "09").state;
    state = type(us, state, "minute", "15").state;
    state = selectDayPeriod(us, state, "p") as TimeFieldState;
    expect(toLocalTime(us, state)?.toString()).toBe("21:15");
  });
});

describe("commitTimeState", () => {
  it("is unchanged until the user edits", () => {
    expect(commitTimeState(us, empty)).toEqual({ kind: "unchanged" });
    expect(commitTimeState(us, initialTimeState(us, LocalTime.of(9, 0)))).toEqual({ kind: "unchanged" });
  });

  it("commits undefined once every segment is cleared", () => {
    let state = initialTimeState(de, LocalTime.of(9, 0));
    state = clearSegment(clearSegment(state, "hour"), "minute");
    expect(commitTimeState(de, state)).toEqual({ kind: "value", value: undefined });
  });

  it("is incomplete while some segments are filled and some are not", () => {
    const state = type(us, empty, "hour", "9").state;
    expect(commitTimeState(us, state)).toEqual({ kind: "incomplete" });
  });

  it("commits the time once every segment is filled", () => {
    const state = stepSegment(us, initialTimeState(us, LocalTime.of(9, 0)), "dayPeriod", 1);
    const commit = commitTimeState(us, state);
    expect(commit.kind === "value" && commit.value?.toString()).toBe("21:00");
  });

  describe("with bounds", () => {
    const office = { min: LocalTime.of(9, 0), max: LocalTime.of(17, 0) };

    it("rejects a filled time before min or after max", () => {
      const early = type(de, initialTimeState(de, LocalTime.of(10, 0)), "hour", "08").state;
      expect(commitTimeState(de, early, office)).toEqual({ kind: "rejected" });
      const late = type(de, initialTimeState(de, LocalTime.of(10, 0)), "minute", "01").state;
      expect(commitTimeState(de, { ...late, hour: 17 }, office)).toEqual({ kind: "rejected" });
    });

    it("commits a time on either bound", () => {
      const atMin = type(de, initialTimeState(de, LocalTime.of(10, 0)), "hour", "09").state;
      const commit = commitTimeState(de, atMin, office);
      expect(commit.kind === "value" && commit.value?.toString()).toBe("09:00");
      const atMax = type(de, initialTimeState(de, LocalTime.of(10, 0)), "hour", "17").state;
      expect(commitTimeState(de, atMax, office)).toMatchObject({ kind: "value" });
    });

    it("checks every digit only against its segment's range while it is typed, and the bounds on commit", () => {
      const typed = type(de, initialTimeState(de, LocalTime.of(10, 0)), "hour", "23");
      expect(typed).toMatchObject({ advance: true, state: { hour: 23, minute: 0 } });
      expect(commitTimeState(de, typed.state, office)).toEqual({ kind: "rejected" });
    });

    it("rejects by the second in a field with seconds", () => {
      const bounds = { max: LocalTime.of(17, 0, 0) };
      const state = type(deSeconds, initialTimeState(deSeconds, LocalTime.of(17, 0, 0)), "second", "01").state;
      expect(commitTimeState(deSeconds, state, bounds)).toEqual({ kind: "rejected" });
    });

    it("rejects the zero-second time a field without seconds commits when it falls before min", () => {
      const state = type(de, initialTimeState(de, LocalTime.of(14, 31)), "minute", "30").state;
      expect(commitTimeState(de, state, { min: LocalTime.of(14, 30, 15) })).toEqual({ kind: "rejected" });
    });

    it("tells the halves of a 12-hour day apart", () => {
      const pm = selectDayPeriod(us, type(us, empty, "hour", "12").state, "p") as TimeFieldState;
      const halfPastNoon = type(us, pm, "minute", "30").state;
      const commit = commitTimeState(us, halfPastNoon, office);
      expect(commit.kind === "value" && commit.value?.toString()).toBe("12:30");
      const halfPastMidnight = selectDayPeriod(us, halfPastNoon, "a") as TimeFieldState;
      expect(commitTimeState(us, halfPastMidnight, office)).toEqual({ kind: "rejected" });
      expect(commitTimeState(usSeconds, { ...halfPastMidnight, second: 0 }, office)).toEqual({ kind: "rejected" });
    });

    it("leaves an unedited time as it is, in bounds or not", () => {
      expect(commitTimeState(de, initialTimeState(de, LocalTime.of(20, 0)), office)).toEqual({ kind: "unchanged" });
    });

    it("leaves an empty field and a partly filled one to their own results", () => {
      const cleared = clearSegment(clearSegment(initialTimeState(de, LocalTime.of(20, 0)), "hour"), "minute");
      expect(commitTimeState(de, cleared, office)).toEqual({ kind: "value", value: undefined });
      expect(commitTimeState(de, type(de, empty, "hour", "20").state, office)).toEqual({ kind: "incomplete" });
    });
  });

  describe("a value with non-zero seconds in a field without seconds", () => {
    const value = LocalTime.of(14, 30, 15);
    const seeded = initialTimeState(de, value);

    it("shows the hour and minute only", () => {
      expect(shown(displaySegments(de, seeded))).toEqual(["hour=14", "minute=30"]);
    });

    it("commits nothing until the user edits, so the value keeps its seconds", () => {
      expect(commitTimeState(de, seeded)).toEqual({ kind: "unchanged" });
    });

    it("zeroes the seconds on the first commit after an edit", () => {
      const edited = stepSegment(de, seeded, "minute", 1);
      const commit = commitTimeState(de, edited);
      expect(commit.kind === "value" && commit.value?.toString()).toBe("14:31");
    });

    it("zeroes the seconds even when the edit leaves the hour and minute as they were", () => {
      const edited = type(de, seeded, "minute", "30").state;
      const commit = commitTimeState(de, edited);
      expect(commit.kind === "value" && commit.value?.toString()).toBe("14:30");
    });
  });
});
