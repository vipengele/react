import { Locale, LocalDate } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import {
  committedInvalidEnds,
  decideRange,
  formatDescription,
  formatRange,
  invalidEnds,
  rangeAnchor,
  rangeKey,
  sameDrafts,
  stepDraft,
} from "./dateRangeFieldModel.js";

const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const date = (year: number, month: number, day: number) => LocalDate.of(year, month, day);
const TODAY = date(2026, 10, 14);
const bounds = { min: date(2026, 10, 1), max: date(2026, 10, 31) };

describe("decideRange", () => {
  it("commits two ordered dates", () => {
    expect(decideRange({ start: "10/01/2026", end: "10/20/2026" }, enUS)).toEqual({
      status: "committed",
      range: { start: date(2026, 10, 1), end: date(2026, 10, 20) },
    });
  });

  it("commits equal ends as a one-day range", () => {
    expect(decideRange({ start: "10/05/2026", end: "2026-10-05" }, enUS)).toEqual({
      status: "committed",
      range: { start: date(2026, 10, 5), end: date(2026, 10, 5) },
    });
  });

  it("rejects an end before the start, at both ends, without swapping", () => {
    expect(decideRange({ start: "10/20/2026", end: "10/01/2026" }, enUS)).toEqual({
      status: "rejected",
      reason: "order",
      ends: ["start", "end"],
    });
  });

  it("clears when both editors are empty", () => {
    expect(decideRange({ start: "", end: "  " }, enUS)).toEqual({ status: "cleared" });
  });

  it.each([
    ["start", { start: "", end: "10/20/2026" }],
    ["end", { start: "10/01/2026", end: "" }],
  ] as const)("is incomplete with the %s missing", (missing, drafts) => {
    expect(decideRange(drafts, enUS)).toEqual({ status: "incomplete", missing });
  });

  it("rejects text that reads as no date, naming its end, ahead of a missing end", () => {
    expect(decideRange({ start: "soon", end: "" }, enUS)).toEqual({ status: "rejected", reason: "value", ends: ["start"] });
    expect(decideRange({ start: "10/01/2026", end: "later" }, enUS)).toEqual({ status: "rejected", reason: "value", ends: ["end"] });
    expect(decideRange({ start: "soon", end: "later" }, enUS)).toEqual({ status: "rejected", reason: "value", ends: ["start", "end"] });
  });

  it("rejects an end outside the bounds or disabled", () => {
    expect(decideRange({ start: "09/30/2026", end: "10/02/2026" }, enUS, bounds)).toEqual({
      status: "rejected",
      reason: "value",
      ends: ["start"],
    });
    expect(decideRange({ start: "10/01/2026", end: "10/18/2026" }, enUS, { isDateDisabled: (d) => d.day === 18 })).toEqual({
      status: "rejected",
      reason: "value",
      ends: ["end"],
    });
  });

  it("reads each end in the locale's pattern", () => {
    expect(decideRange({ start: "01.10.2026", end: "20.10.2026" }, deDE)).toEqual({
      status: "committed",
      range: { start: date(2026, 10, 1), end: date(2026, 10, 20) },
    });
  });
});

describe("invalidEnds", () => {
  it("flags nothing without an issue", () => {
    expect(invalidEnds(undefined, true)).toEqual({ start: false, end: false });
  });

  it("flags the missing end only once incompleteness is flagged", () => {
    expect(invalidEnds({ status: "incomplete", missing: "end" }, false)).toEqual({ start: false, end: false });
    expect(invalidEnds({ status: "incomplete", missing: "end" }, true)).toEqual({ start: false, end: true });
    expect(invalidEnds({ status: "incomplete", missing: "start" }, true)).toEqual({ start: true, end: false });
  });

  it("flags a rejection's ends at once", () => {
    expect(invalidEnds({ status: "rejected", reason: "value", ends: ["end"] }, false)).toEqual({ start: false, end: true });
    expect(invalidEnds({ status: "rejected", reason: "order", ends: ["start", "end"] }, false)).toEqual({ start: true, end: true });
  });
});

describe("committedInvalidEnds", () => {
  it("flags nothing for no range", () => {
    expect(committedInvalidEnds(undefined, bounds)).toEqual({ start: false, end: false });
  });

  it("flags nothing for an accepted range", () => {
    expect(committedInvalidEnds({ start: date(2026, 10, 1), end: date(2026, 10, 31) }, bounds)).toEqual({ start: false, end: false });
  });

  it("flags each end outside the bounds", () => {
    expect(committedInvalidEnds({ start: date(2026, 9, 1), end: date(2026, 10, 2) }, bounds)).toEqual({ start: true, end: false });
    expect(committedInvalidEnds({ start: date(2026, 10, 1), end: date(2026, 11, 2) }, bounds)).toEqual({ start: false, end: true });
  });

  it("flags both ends of a reversed range", () => {
    expect(committedInvalidEnds({ start: date(2026, 10, 9), end: date(2026, 10, 2) }, {})).toEqual({ start: true, end: true });
  });
});

describe("rangeAnchor", () => {
  it("is the start while the end is empty", () => {
    expect(rangeAnchor({ start: "10/05/2026", end: "" }, enUS)).toEqual(date(2026, 10, 5));
  });

  it("is nothing once the end holds text", () => {
    expect(rangeAnchor({ start: "10/05/2026", end: "10/" }, enUS)).toBeUndefined();
  });

  it("is nothing for a start the field would not commit", () => {
    expect(rangeAnchor({ start: "soon", end: "" }, enUS)).toBeUndefined();
    expect(rangeAnchor({ start: "09/05/2026", end: "" }, enUS, bounds)).toBeUndefined();
    expect(rangeAnchor({ start: "", end: "" }, enUS)).toBeUndefined();
  });
});

describe("formatRange", () => {
  it("writes each end in the locale's pattern", () => {
    expect(formatRange({ start: date(2026, 10, 1), end: date(2026, 10, 20) }, deDE)).toEqual({ start: "01.10.2026", end: "20.10.2026" });
  });

  it("writes no range as two empty texts", () => {
    expect(formatRange(undefined, enUS)).toEqual({ start: "", end: "" });
  });
});

describe("sameDrafts", () => {
  it("compares both texts", () => {
    expect(sameDrafts({ start: "a", end: "b" }, { start: "a", end: "b" })).toBe(true);
    expect(sameDrafts({ start: "a", end: "b" }, { start: "a", end: "c" })).toBe(false);
    expect(sameDrafts({ start: "a", end: "b" }, { start: "c", end: "b" })).toBe(false);
  });
});

describe("rangeKey", () => {
  it("joins the ISO ends, and is the same for equal ranges built apart", () => {
    expect(rangeKey({ start: date(2026, 10, 1), end: date(2026, 10, 20) })).toBe("2026-10-01/2026-10-20");
    expect(rangeKey({ start: date(2026, 10, 1), end: date(2026, 10, 20) })).toBe(
      rangeKey({ start: date(2026, 10, 1), end: date(2026, 10, 20) }),
    );
  });

  it("is undefined for no range", () => {
    expect(rangeKey(undefined)).toBeUndefined();
  });
});

describe("stepDraft", () => {
  it("steps the segment under the caret", () => {
    expect(stepDraft("10/14/2026", 0, 1, enUS, TODAY, {})).toEqual(date(2026, 11, 14));
    expect(stepDraft("10/14/2026", 4, -1, enUS, TODAY, {})).toEqual(date(2026, 10, 13));
  });

  it("steps an empty text onto today", () => {
    expect(stepDraft("", 0, 1, enUS, TODAY, {})).toEqual(TODAY);
  });

  it("steps nothing while the text names no segment", () => {
    expect(stepDraft("10/14", 2, 1, enUS, TODAY, {})).toBeUndefined();
  });

  it("refuses a step that lands on no date the field accepts", () => {
    expect(stepDraft("10/14/2026", 4, 1, enUS, TODAY, { isDateDisabled: () => true })).toBeUndefined();
    expect(stepDraft("", 0, 1, enUS, TODAY, { isDateDisabled: () => true })).toBeUndefined();
  });
});

describe("formatDescription", () => {
  it("names the locale's fields in its order", () => {
    expect(formatDescription(enUS)).toBe("Format: month / day / year");
    expect(formatDescription(deDE)).toBe("Format: day / month / year");
  });
});
