import { Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import { formatDateTimeText } from "../DateTimeField/dateTimeFieldModel.js";
import {
  calendarSelection,
  committedInvalidEnds,
  decideRange,
  endParts,
  formatDescription,
  formatHint,
  formatRange,
  invalidEnds,
  isRejected,
  placeDay,
  rangeKey,
  readEnd,
  sameDrafts,
  stepEnd,
} from "./dateTimeRangeFieldModel.js";

const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const dt = (iso: string) => LocalDateTime.parse(iso);
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
/** The editor text of `iso` as the field writes it in `en-US`. */
const text = (iso: string) => formatDateTimeText(dt(iso), enUS);
const bounds = { min: dt("2026-10-01T09:00"), max: dt("2026-10-31T17:00") };
const OCTOBER = { start: dt("2026-10-05T09:00"), end: dt("2026-10-09T17:30") };

describe("isRejected", () => {
  it("rejects a date-time outside the bounds or on a disabled day", () => {
    expect(isRejected(dt("2026-10-01T08:55"), bounds)).toBe(true);
    expect(isRejected(dt("2026-10-01T09:00"), bounds)).toBe(false);
    expect(isRejected(dt("2026-10-03T09:00"), { isDateDisabled: (d) => d.day === 3 })).toBe(true);
    expect(isRejected(dt("2026-10-04T09:00"), { isDateDisabled: (d) => d.day === 3 })).toBe(false);
  });
});

describe("readEnd", () => {
  it("reads the text of a picked day as pending", () => {
    expect(readEnd("10/20/2026", undefined, date(2026, 10, 20), enUS)).toBe("pending");
  });

  it("reads text that is no longer the picked day's own text as typed", () => {
    expect(readEnd("10/21/2026", undefined, date(2026, 10, 20), enUS)).toBe("invalid");
    expect(readEnd("2026-10-21T08:00", undefined, date(2026, 10, 20), enUS)).toEqual(dt("2026-10-21T08:00"));
  });

  it("reads whitespace-only text as empty", () => {
    expect(readEnd("  ", OCTOBER.start, undefined, enUS)).toBeUndefined();
  });

  it("reads the committed end's own text as that end, seconds included", () => {
    const withSeconds = dt("2026-10-05T09:00:30");
    expect(readEnd(formatDateTimeText(withSeconds, enUS), withSeconds, undefined, enUS)).toBe(withSeconds);
  });

  it("reads the committed end's own text as invalid when the constraints rule it out", () => {
    const early = dt("2026-09-05T09:00");
    expect(readEnd(formatDateTimeText(early, enUS), early, undefined, enUS, bounds)).toBe("invalid");
  });

  it("reads typed text in the field's layout and in ISO 8601", () => {
    expect(readEnd(text("2026-10-15T21:05"), undefined, undefined, enUS)).toEqual(dt("2026-10-15T21:05"));
    expect(readEnd("2026-10-15T21:05", OCTOBER.start, undefined, enUS)).toEqual(dt("2026-10-15T21:05"));
  });

  it("reads text naming no date-time, or one the constraints rule out, as invalid", () => {
    expect(readEnd("soon", undefined, undefined, enUS)).toBe("invalid");
    expect(readEnd("10/15/2026", undefined, undefined, enUS)).toBe("invalid");
    expect(readEnd("2026-11-01T09:00", undefined, undefined, enUS, bounds)).toBe("invalid");
    expect(readEnd("2026-10-03T09:00", undefined, undefined, enUS, { isDateDisabled: (d) => d.day === 3 })).toBe("invalid");
  });
});

describe("decideRange", () => {
  it("commits two ordered date-times", () => {
    expect(decideRange({ start: "2026-10-01T09:00", end: text("2026-10-20T17:00") }, undefined, {}, enUS)).toEqual({
      status: "committed",
      range: { start: dt("2026-10-01T09:00"), end: dt("2026-10-20T17:00") },
    });
  });

  it("commits equal ends as a range of one instant", () => {
    expect(decideRange({ start: "2026-10-05T09:00", end: "2026-10-05T09:00" }, undefined, {}, enUS)).toEqual({
      status: "committed",
      range: { start: dt("2026-10-05T09:00"), end: dt("2026-10-05T09:00") },
    });
  });

  it("keeps the committed end's seconds while its text is untouched", () => {
    const committed = { start: dt("2026-10-05T09:00:30"), end: dt("2026-10-09T17:30") };
    const decision = decideRange({ start: formatDateTimeText(committed.start, enUS), end: "2026-10-12T10:00" }, committed, {}, enUS);
    expect(decision).toEqual({ status: "committed", range: { start: committed.start, end: dt("2026-10-12T10:00") } });
  });

  it("rejects a same-day end time before the start time, at both ends, without swapping", () => {
    expect(decideRange({ start: "2026-10-05T17:00", end: "2026-10-05T09:00" }, undefined, {}, enUS)).toEqual({
      status: "rejected",
      reason: "order",
      ends: ["start", "end"],
    });
  });

  it("rejects the editors whose text reads as no accepted date-time, whatever the other holds", () => {
    expect(decideRange({ start: "soon", end: "" }, undefined, {}, enUS, bounds)).toEqual({
      status: "rejected",
      reason: "value",
      ends: ["start"],
    });
    expect(decideRange({ start: "soon", end: "2026-12-01T09:00" }, undefined, {}, enUS, bounds)).toEqual({
      status: "rejected",
      reason: "value",
      ends: ["start", "end"],
    });
  });

  it("clears on two empty editors", () => {
    expect(decideRange({ start: "", end: " " }, OCTOBER, {}, enUS)).toEqual({ status: "cleared" });
  });

  it("holds one empty editor as incomplete", () => {
    expect(decideRange({ start: "", end: "2026-10-05T09:00" }, undefined, {}, enUS)).toEqual({ status: "incomplete", missing: ["start"] });
    expect(decideRange({ start: "2026-10-05T09:00", end: "" }, undefined, {}, enUS)).toEqual({ status: "incomplete", missing: ["end"] });
  });

  it("holds a picked day waiting for its time as incomplete, with any empty end", () => {
    const pending = { start: date(2026, 10, 5) };
    expect(decideRange({ start: "10/05/2026", end: "" }, undefined, pending, enUS)).toEqual({
      status: "incomplete",
      missing: ["start", "end"],
    });
    expect(decideRange({ start: "10/05/2026", end: "2026-10-09T09:00" }, undefined, pending, enUS)).toEqual({
      status: "incomplete",
      missing: ["start"],
    });
  });
});

describe("invalidEnds", () => {
  it("flags nothing without an issue", () => {
    expect(invalidEnds(undefined, true)).toEqual({ start: false, end: false });
  });

  it("flags the missing ends of an incomplete range only once it is to be flagged", () => {
    const issue = { status: "incomplete", missing: ["end"] } as const;
    expect(invalidEnds(issue, false)).toEqual({ start: false, end: false });
    expect(invalidEnds(issue, true)).toEqual({ start: false, end: true });
  });

  it("flags the ends of a rejection at once", () => {
    expect(invalidEnds({ status: "rejected", reason: "value", ends: ["start"] }, false)).toEqual({ start: true, end: false });
    expect(invalidEnds({ status: "rejected", reason: "order", ends: ["start", "end"] }, false)).toEqual({ start: true, end: true });
  });
});

describe("committedInvalidEnds", () => {
  it("flags nothing without a range, or for one the field would commit", () => {
    expect(committedInvalidEnds(undefined, bounds)).toEqual({ start: false, end: false });
    expect(committedInvalidEnds(OCTOBER, bounds)).toEqual({ start: false, end: false });
  });

  it("flags each end the constraints rule out", () => {
    expect(committedInvalidEnds({ start: dt("2026-09-30T09:00"), end: OCTOBER.end }, bounds)).toEqual({ start: true, end: false });
    expect(committedInvalidEnds(OCTOBER, { isDateDisabled: (d) => d.day === 9 })).toEqual({ start: false, end: true });
  });

  it("flags both ends of a range that runs backwards", () => {
    expect(committedInvalidEnds({ start: OCTOBER.end, end: OCTOBER.start }, {})).toEqual({ start: true, end: true });
  });
});

describe("endParts", () => {
  it("gives the day alone for a picked day's text", () => {
    expect(endParts("10/05/2026", date(2026, 10, 5), enUS)).toEqual({ day: date(2026, 10, 5) });
  });

  it("gives the day and the time of text that reads as a date-time", () => {
    expect(endParts(text("2026-10-05T21:05"), undefined, enUS)).toEqual({ day: date(2026, 10, 5), time: LocalTime.of(21, 5) });
  });

  it("gives neither for anything else", () => {
    expect(endParts("10/05/2026", undefined, enUS)).toEqual({});
    expect(endParts("", undefined, enUS)).toEqual({});
  });
});

describe("calendarSelection", () => {
  it("makes a start day beside an empty end the anchor", () => {
    expect(calendarSelection({ start: text("2026-10-05T09:00"), end: "" }, {}, enUS)).toEqual({
      anchor: date(2026, 10, 5),
      value: undefined,
    });
    expect(calendarSelection({ start: "10/05/2026", end: " " }, { start: date(2026, 10, 5) }, enUS)).toEqual({
      anchor: date(2026, 10, 5),
      value: undefined,
    });
  });

  it("makes two ordered days the range, whether or not their times are in", () => {
    expect(calendarSelection({ start: text("2026-10-05T17:00"), end: "10/05/2026" }, { end: date(2026, 10, 5) }, enUS)).toEqual({
      anchor: undefined,
      value: { start: date(2026, 10, 5), end: date(2026, 10, 5) },
    });
  });

  it("shows nothing for days out of order, a missing start, or an end that names no day", () => {
    const none = { anchor: undefined, value: undefined };
    expect(calendarSelection({ start: "2026-10-09T09:00", end: "2026-10-05T09:00" }, {}, enUS)).toEqual(none);
    expect(calendarSelection({ start: "", end: "2026-10-05T09:00" }, {}, enUS)).toEqual(none);
    expect(calendarSelection({ start: "2026-10-05T09:00", end: "soon" }, {}, enUS)).toEqual(none);
  });
});

describe("placeDay", () => {
  it("puts the day on the time when there is one inside the constraints", () => {
    expect(placeDay(date(2026, 10, 20), LocalTime.of(9, 5), enUS)).toEqual({ text: text("2026-10-20T09:05"), pending: undefined });
  });

  it("holds the day pending without a time", () => {
    expect(placeDay(date(2026, 10, 20), undefined, enUS)).toEqual({ text: "10/20/2026", pending: date(2026, 10, 20) });
  });

  it("holds the day pending when the constraints rule its time out on it", () => {
    expect(placeDay(date(2026, 10, 1), LocalTime.of(8, 0), deDE, bounds)).toEqual({ text: "01.10.2026", pending: date(2026, 10, 1) });
  });
});

describe("formatRange", () => {
  it("writes each end as the field writes a date-time, or nothing", () => {
    expect(formatRange(undefined, deDE)).toEqual({ start: "", end: "" });
    expect(formatRange(OCTOBER, deDE)).toEqual({ start: "05.10.2026 09:00", end: "09.10.2026 17:30" });
  });
});

describe("sameDrafts", () => {
  it("compares both texts", () => {
    expect(sameDrafts({ start: "a", end: "b" }, { start: "a", end: "b" })).toBe(true);
    expect(sameDrafts({ start: "a", end: "b" }, { start: "a", end: "c" })).toBe(false);
  });
});

describe("rangeKey", () => {
  it("joins the ISO ends, and is undefined without a range", () => {
    expect(rangeKey(undefined)).toBeUndefined();
    expect(rangeKey(OCTOBER)).toBe("2026-10-05T09:00/2026-10-09T17:30");
  });
});

describe("stepEnd", () => {
  const TODAY = date(2026, 10, 14);

  it("steps the date or time field under the caret as DateTimeField does", () => {
    expect(stepEnd(text("2026-10-05T09:00"), 4, 1, enUS, TODAY)).toEqual({
      kind: "stepped",
      value: dt("2026-10-06T09:00"),
      range: { segment: "day", start: 3, end: 5 },
    });
    expect(stepEnd(text("2026-10-05T09:00"), 12, -1, enUS, TODAY)).toEqual({
      kind: "stepped",
      value: dt("2026-10-05T08:00"),
      range: { segment: "hour", start: 11, end: 13 },
    });
  });

  it("steps an empty editor onto today at 00:00", () => {
    expect(stepEnd("", 0, 1, enUS, TODAY)).toEqual({
      kind: "stepped",
      value: dt("2026-10-14T00:00"),
      range: { segment: "month", start: 0, end: 2 },
    });
  });

  it("refuses partial or unparseable text", () => {
    expect(stepEnd("10/05/2026 09", 12, 1, enUS, TODAY)).toEqual({ kind: "refused" });
    expect(stepEnd("10/05/2026", 4, 1, enUS, TODAY)).toEqual({ kind: "refused" });
    expect(stepEnd("soon", 0, 1, enUS, TODAY)).toEqual({ kind: "refused" });
  });

  it("refuses a step outside the bounds, judged on the whole date-time", () => {
    expect(stepEnd(text("2026-10-01T09:00"), 12, -1, enUS, TODAY, bounds)).toEqual({ kind: "refused" });
    expect(stepEnd(text("2026-10-31T17:00"), 15, 1, enUS, TODAY, bounds)).toEqual({ kind: "refused" });
    expect(stepEnd(text("2026-10-01T09:00"), 15, 1, enUS, TODAY, bounds)).toMatchObject({ value: dt("2026-10-01T09:01") });
  });

  it("refuses a step onto a disabled day, an empty editor's today included", () => {
    const isDateDisabled = (d: LocalDate) => d.day === 6 || d.day === 14;
    expect(stepEnd(text("2026-10-05T09:00"), 4, 1, enUS, TODAY, { isDateDisabled })).toEqual({ kind: "refused" });
    expect(stepEnd(text("2026-10-05T09:00"), 4, -1, enUS, TODAY, { isDateDisabled })).toMatchObject({ value: dt("2026-10-04T09:00") });
    expect(stepEnd("", 0, 1, enUS, TODAY, { isDateDisabled })).toEqual({ kind: "refused" });
  });
});

describe("formatHint and formatDescription", () => {
  it("spell a 12-hour locale's layout with its day periods", () => {
    expect(formatHint(enUS).replace(/ /g, " ")).toBe("mm/dd/yyyy hh:mm AM/PM");
    expect(formatDescription(enUS)).toBe("Format: month / day / year / hour / minute / day period");
  });

  it("spell a 24-hour locale's layout with none", () => {
    expect(formatHint(deDE)).toBe("dd.mm.yyyy hh:mm");
    expect(formatDescription(deDE)).toBe("Format: day / month / year / hour / minute");
  });
});
