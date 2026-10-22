import { LocalDate, Locale } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import {
  formatHint,
  isRejected,
  parseDateInput,
  readDateRun,
  segmentAt,
  segmentRanges,
  startsWithLiteral,
  stepDate,
  withSeparator,
} from "./dateFieldEditing";

const enUS = new Locale("en-US");
const deDE = new Locale("de-DE");
const jaJP = new Locale("ja-JP");
const arEG = new Locale("ar-EG");
const ptPT = new Locale("pt-PT");
const koKR = new Locale("ko-KR");

/** The date segments `locale` writes, from any date: the pattern does not depend on which. */
function dateSegments(locale: Locale) {
  return LocalDate.of(2000, 1, 1).segments(locale);
}

function d(iso: string): LocalDate {
  return LocalDate.parse(iso);
}

/** The ISO string of a stepped date, or `undefined`. */
function iso(date: LocalDate | undefined): string | undefined {
  return date?.toString();
}

describe("isRejected", () => {
  const constraints = { min: d("2024-03-10"), max: d("2024-03-20"), isDateDisabled: (date: LocalDate) => date.toString() === "2024-03-15" };

  it("accepts a date inside the bounds that is not disabled", () => {
    expect(isRejected(d("2024-03-12"), constraints)).toBe(false);
    expect(isRejected(d("2024-03-10"), constraints)).toBe(false);
    expect(isRejected(d("2024-03-20"), constraints)).toBe(false);
  });

  it("accepts any date when nothing constrains it", () => {
    expect(isRejected(d("2024-03-12"), {})).toBe(false);
  });

  it("rejects a date before min", () => {
    expect(isRejected(d("2024-03-09"), constraints)).toBe(true);
  });

  it("rejects a date after max", () => {
    expect(isRejected(d("2024-03-21"), constraints)).toBe(true);
  });

  it("rejects a date isDateDisabled reports", () => {
    expect(isRejected(d("2024-03-15"), constraints)).toBe(true);
  });
});

describe("segmentRanges", () => {
  it("places each field at its offsets in the locale's order", () => {
    expect(segmentRanges("02/03/2026", enUS)).toEqual([
      { segment: "month", start: 0, end: 2 },
      { segment: "day", start: 3, end: 5 },
      { segment: "year", start: 6, end: 10 },
    ]);
    expect(segmentRanges("03.02.2026", deDE)?.map((range) => range.segment)).toEqual(["day", "month", "year"]);
    expect(segmentRanges("2026/02/03", jaJP)?.map((range) => range.segment)).toEqual(["year", "month", "day"]);
  });

  it("counts the bidi marks a locale writes into its separators", () => {
    const text = LocalDate.of(2026, 2, 3).format(arEG);
    const ranges = segmentRanges(text, arEG) ?? [];
    expect(ranges.map((range) => text.slice(range.start, range.end))).toEqual(["03", "02", "2026"]);
    expect(ranges[1]?.start).toBe(4);
  });

  it("is undefined for text that is not exactly the locale's formatted date", () => {
    expect(segmentRanges("2/3/2026", enUS)).toBeUndefined();
    expect(segmentRanges(" 02/03/2026", enUS)).toBeUndefined();
    expect(segmentRanges("02/30/2026", enUS)).toBeUndefined();
    expect(segmentRanges("2026-02-03", enUS)).toBeUndefined();
    expect(segmentRanges("", enUS)).toBeUndefined();
  });
});

describe("segmentAt", () => {
  const text = "02/03/2026";

  it("finds the field the caret is inside", () => {
    expect(segmentAt(text, 1, enUS)).toEqual({ segment: "month", start: 0, end: 2 });
    expect(segmentAt(text, 4, enUS)).toEqual({ segment: "day", start: 3, end: 5 });
    expect(segmentAt(text, 8, enUS)).toEqual({ segment: "year", start: 6, end: 10 });
  });

  it("keeps a caret at a field's start or end in that field", () => {
    expect(segmentAt(text, 0, enUS)?.segment).toBe("month");
    expect(segmentAt(text, 2, enUS)?.segment).toBe("month");
    expect(segmentAt(text, 5, enUS)?.segment).toBe("day");
    expect(segmentAt(text, 10, enUS)?.segment).toBe("year");
  });

  it("gives a caret inside a separator to the field after it", () => {
    const text = LocalDate.of(2026, 2, 3).format(arEG);
    expect(segmentAt(text, 3, arEG)?.segment).toBe("month");
  });

  it("gives a caret before the text to the first field and past it to the last", () => {
    expect(segmentAt(text, -1, enUS)?.segment).toBe("month");
    expect(segmentAt(text, 99, enUS)?.segment).toBe("year");
  });

  it("is undefined for text that is not the locale's formatted date", () => {
    expect(segmentAt("not a date", 1, enUS)).toBeUndefined();
  });
});

describe("stepDate", () => {
  const today = d("2026-10-12");

  it("steps each field by one, carrying into the next", () => {
    expect(iso(stepDate(d("2026-10-31"), "day", 1, today))).toBe("2026-11-01");
    expect(iso(stepDate(d("2026-01-01"), "day", -1, today))).toBe("2025-12-31");
    expect(iso(stepDate(d("2026-12-15"), "month", 1, today))).toBe("2027-01-15");
    expect(iso(stepDate(d("2026-10-15"), "month", -1, today))).toBe("2026-09-15");
    expect(iso(stepDate(d("2026-10-15"), "year", 1, today))).toBe("2027-10-15");
    expect(iso(stepDate(d("2026-10-15"), "year", -1, today))).toBe("2025-10-15");
  });

  it("clamps a day past the end of the target month to its last day", () => {
    expect(iso(stepDate(d("2026-01-31"), "month", 1, today))).toBe("2026-02-28");
    expect(iso(stepDate(d("2024-02-29"), "year", 1, today))).toBe("2025-02-28");
  });

  it("steps an empty field onto today", () => {
    expect(iso(stepDate(undefined, "day", 1, today))).toBe("2026-10-12");
    expect(iso(stepDate(undefined, "year", -1, today))).toBe("2026-10-12");
  });

  it("leaves the date where it is at the edges of the range LocalDate holds", () => {
    expect(iso(stepDate(d("9999-12-31"), "day", 1, today))).toBe("9999-12-31");
    expect(iso(stepDate(d("0001-01-01"), "day", -1, today))).toBe("0001-01-01");
    expect(iso(stepDate(d("9999-12-15"), "month", 1, today))).toBe("9999-12-15");
    expect(iso(stepDate(d("0001-01-15"), "month", -1, today))).toBe("0001-01-15");
    expect(iso(stepDate(d("9999-01-15"), "year", 1, today))).toBe("9999-01-15");
    expect(iso(stepDate(d("0001-12-15"), "year", -1, today))).toBe("0001-12-15");
  });

  it("clamps the result to min and max", () => {
    const bounds = { min: d("2026-10-01"), max: d("2026-10-31") };
    expect(iso(stepDate(d("2026-10-20"), "month", 1, today, bounds))).toBe("2026-10-31");
    expect(iso(stepDate(d("2026-10-20"), "year", -1, today, bounds))).toBe("2026-10-01");
    expect(iso(stepDate(d("2026-10-31"), "day", 1, today, bounds))).toBe("2026-10-31");
    expect(iso(stepDate(undefined, "day", 1, d("2027-03-01"), bounds))).toBe("2026-10-31");
  });

  it("brings a date outside the bounds onto the bound it lies beyond", () => {
    const bounds = { min: d("2026-10-01"), max: d("2026-10-31") };
    expect(iso(stepDate(d("2027-05-01"), "day", -1, today, bounds))).toBe("2026-10-31");
    expect(iso(stepDate(d("2025-05-01"), "day", 1, today, bounds))).toBe("2026-10-01");
  });

  it("walks past disabled dates in the step's direction to the next enabled one", () => {
    const weekdaysOnly = { isDateDisabled: (date: LocalDate) => date.dayOfWeek >= 6 };
    // 2026-10-16 is a Friday and 2026-10-19 a Monday.
    expect(iso(stepDate(d("2026-10-16"), "day", 1, today, weekdaysOnly))).toBe("2026-10-19");
    expect(iso(stepDate(d("2026-10-19"), "day", -1, today, weekdaysOnly))).toBe("2026-10-16");
    // 2026-11-14 is a Saturday.
    expect(iso(stepDate(d("2026-10-14"), "month", 1, today, weekdaysOnly))).toBe("2026-11-16");
    // 2026-10-11 is a Sunday.
    expect(iso(stepDate(undefined, "day", -1, d("2026-10-11"), weekdaysOnly))).toBe("2026-10-09");
  });

  it("refuses a step that finds no enabled date before the bound", () => {
    const options = { max: d("2026-10-18"), isDateDisabled: (date: LocalDate) => date.dayOfWeek >= 6 };
    expect(iso(stepDate(d("2026-10-16"), "day", 1, today, options))).toBe("2026-10-16");
    expect(stepDate(undefined, "day", 1, d("2026-10-17"), options)).toBeUndefined();
  });

  it("refuses a step that reaches the edge of the range LocalDate holds without an enabled date", () => {
    const lastDayDisabled = { isDateDisabled: (date: LocalDate) => date.equals(d("9999-12-31")) };
    expect(iso(stepDate(d("9999-12-30"), "day", 1, today, lastDayDisabled))).toBe("9999-12-30");
  });

  it("refuses a step that passes a year of disabled dates", () => {
    const everyDayDisabled = { isDateDisabled: () => true };
    expect(iso(stepDate(d("2026-10-12"), "day", 1, today, everyDayDisabled))).toBe("2026-10-12");
  });

  it("finds an enabled date just within a year of disabled ones", () => {
    const enabled = d("2027-10-13");
    const options = { isDateDisabled: (date: LocalDate) => !date.equals(enabled) };
    expect(iso(stepDate(d("2026-10-12"), "day", 1, today, options))).toBe("2027-10-13");
  });
});

describe("parseDateInput", () => {
  it("reads empty and whitespace-only text as empty", () => {
    expect(parseDateInput("", enUS)).toEqual({ status: "empty" });
    expect(parseDateInput("   ", enUS)).toEqual({ status: "empty" });
  });

  it("reads text in the locale's numeric pattern", () => {
    expect(parseDateInput("02/03/2026", enUS)).toEqual({ status: "valid", value: d("2026-02-03") });
    expect(parseDateInput("2/3/2026", enUS)).toEqual({ status: "valid", value: d("2026-02-03") });
    expect(parseDateInput("03.02.2026", deDE)).toEqual({ status: "valid", value: d("2026-02-03") });
  });

  it("reads an ISO 8601 date in any locale, whitespace around it included", () => {
    expect(parseDateInput("2026-10-01", enUS)).toEqual({ status: "valid", value: d("2026-10-01") });
    expect(parseDateInput(" 2026-10-01 ", deDE)).toEqual({ status: "valid", value: d("2026-10-01") });
  });

  it("rejects text that is not a date", () => {
    expect(parseDateInput("tomorrow", enUS)).toEqual({ status: "rejected" });
    expect(parseDateInput("02/30/2026", enUS)).toEqual({ status: "rejected" });
    expect(parseDateInput("03.02.2026", enUS)).toEqual({ status: "rejected" });
  });

  it("rejects a date outside min..max and accepts one on either bound", () => {
    const bounds = { min: d("2026-10-01"), max: d("2026-10-31") };
    expect(parseDateInput("2026-09-30", enUS, bounds)).toEqual({ status: "rejected" });
    expect(parseDateInput("2026-11-01", enUS, bounds)).toEqual({ status: "rejected" });
    expect(parseDateInput("2026-10-01", enUS, bounds).status).toBe("valid");
    expect(parseDateInput("2026-10-31", enUS, bounds).status).toBe("valid");
  });

  it("rejects a date isDateDisabled reports", () => {
    const options = { isDateDisabled: (date: LocalDate) => date.dayOfWeek >= 6 };
    expect(parseDateInput("2026-10-17", enUS, options)).toEqual({ status: "rejected" });
    expect(parseDateInput("2026-10-16", enUS, options).status).toBe("valid");
  });
});

describe("formatHint", () => {
  it("spells the locale's field order and separators", () => {
    expect(formatHint(enUS)).toBe("mm/dd/yyyy");
    expect(formatHint(ptPT)).toBe("dd/mm/yyyy");
    expect(formatHint(deDE)).toBe("dd.mm.yyyy");
    expect(formatHint(jaJP)).toBe("yyyy/mm/dd");
  });
});

describe("withSeparator", () => {
  it("appends the separator once a day or month has both digits", () => {
    expect(withSeparator("1", "10", ptPT)).toBe("10/");
    expect(withSeparator("10/1", "10/10", ptPT)).toBe("10/10/");
    expect(withSeparator("1", "10", deDE)).toBe("10.");
  });

  it("appends the separator after a four-digit year that leads the pattern", () => {
    expect(withSeparator("202", "2026", jaJP)).toBe("2026/");
  });

  it("leaves a field that is not complete yet alone", () => {
    expect(withSeparator("", "1", ptPT)).toBe("1");
    expect(withSeparator("10/", "10/1", ptPT)).toBe("10/1");
    expect(withSeparator("10/10/20", "10/10/202", ptPT)).toBe("10/10/202");
  });

  it("adds no trailing separator after the last field", () => {
    expect(withSeparator("10/10/202", "10/10/2026", ptPT)).toBe("10/10/2026");
    expect(withSeparator("2026. 10. 1", "2026. 10. 10", koKR)).toBe("2026. 10. 10");
  });

  it("drops a typed separator that repeats the one already at the end", () => {
    expect(withSeparator("10/", "10//", ptPT)).toBe("10/");
    expect(withSeparator("10.", "10..", deDE)).toBe("10.");
  });

  it("accepts a separator the user types before the field is complete", () => {
    expect(withSeparator("1", "1/", ptPT)).toBe("1/");
    expect(withSeparator("1/2", "1/2/", ptPT)).toBe("1/2/");
  });

  it("leaves text that does not follow the locale's pattern alone", () => {
    expect(withSeparator("10-1", "10-10", ptPT)).toBe("10-10");
    expect(withSeparator("ab", "ab1", ptPT)).toBe("ab1");
    expect(withSeparator("", "/", ptPT)).toBe("/");
  });

  it("leaves text typed past the last field alone", () => {
    expect(withSeparator("10/10/2026 ", "10/10/2026 5", ptPT)).toBe("10/10/2026 5");
    expect(withSeparator("2026. 10. 10. ", "2026. 10. 10. 5", koKR)).toBe("2026. 10. 10. 5");
  });

  it("rewrites only one character appended at the end", () => {
    expect(withSeparator("10/10/", "10/10", ptPT)).toBe("10/10");
    expect(withSeparator("1", "10/10/2026", ptPT)).toBe("10/10/2026");
    expect(withSeparator("0", "10", ptPT)).toBe("10");
    expect(withSeparator("10/10/2026", "1", ptPT)).toBe("1");
    expect(withSeparator("13", "103", ptPT)).toBe("103");
  });
});

describe("withSeparator with space-like literals", () => {
  it("matches a typed space against the locale's literal whichever of U+0020, U+00A0 and U+202F it is", () => {
    expect(withSeparator("2026.\u00a01", "2026.\u00a010", koKR)).toBe("2026.\u00a010. ");
    expect(withSeparator("2026.\u202f1", "2026.\u202f10", koKR)).toBe("2026.\u202f10. ");
    expect(withSeparator("2026.\u202f10. 1", "2026.\u202f10. 10", koKR)).toBe("2026.\u202f10. 10");
  });

  it("drops a typed space that repeats an appended U+00A0 or U+202F", () => {
    expect(withSeparator("2026.\u00a0", "2026.\u00a0 ", koKR)).toBe("2026.\u00a0");
    expect(withSeparator("2026.\u202f", "2026.\u202f ", koKR)).toBe("2026.\u202f");
    expect(withSeparator("2026. ", "2026. \u00a0", koKR)).toBe("2026. ");
  });

  it("drops a repeated non-space separator and keeps a different one", () => {
    expect(withSeparator("10/", "10//", ptPT)).toBe("10/");
    expect(withSeparator("10/", "10/.", ptPT)).toBe("10/.");
    expect(withSeparator("10.\u00a0", "10.\u00a0/", ptPT)).toBe("10.\u00a0/");
    expect(withSeparator("10/", "10/\u00a0", ptPT)).toBe("10/\u00a0");
  });
});

describe("startsWithLiteral", () => {
  it("matches a literal character for character", () => {
    expect(startsWithLiteral("/10", "/")).toBe(true);
    expect(startsWithLiteral(". 10", ". ")).toBe(true);
    expect(startsWithLiteral("-10", "/")).toBe(false);
    expect(startsWithLiteral(".", ". ")).toBe(false);
  });

  it("reads U+0020, U+00A0 and U+202F as the same character", () => {
    for (const typed of [" ", "\u00a0", "\u202f"]) {
      for (const written of [" ", "\u00a0", "\u202f"]) {
        expect(startsWithLiteral(`.${typed}10`, `.${written}`)).toBe(true);
      }
    }
  });

  it("does not read other whitespace as a space", () => {
    expect(startsWithLiteral(".\t10", ". ")).toBe(false);
    expect(startsWithLiteral(".\u2009", ".\u202f")).toBe(false);
  });
});

describe("readDateRun", () => {
  it("reads a field the text ends in, and appends the literal before the next field once it is complete (pt-PT)", () => {
    const segments = dateSegments(ptPT);
    expect(readDateRun("1", segments, false)).toEqual({
      status: "inside",
      segment: "day",
      digits: "1",
      complete: false,
      last: false,
      separator: "",
    });
    expect(readDateRun("10", segments, false)).toEqual({
      status: "inside",
      segment: "day",
      digits: "10",
      complete: true,
      last: false,
      separator: "/",
    });
    expect(readDateRun("10/", segments, false)).toEqual({
      status: "inside",
      segment: "month",
      digits: "",
      complete: false,
      last: false,
      separator: "",
    });
    expect(readDateRun("10/10", segments, false)).toMatchObject({ segment: "month", complete: true, separator: "/" });
    expect(readDateRun("10/10/2026", segments, false)).toEqual({
      status: "inside",
      segment: "year",
      digits: "2026",
      complete: true,
      last: true,
      separator: "",
    });
  });

  it("counts every digit of the field, so a field past its length is not complete (de-DE)", () => {
    const segments = dateSegments(deDE);
    expect(readDateRun("101", segments, false)).toMatchObject({ segment: "day", digits: "101", complete: false, separator: "" });
    expect(readDateRun("10.10", segments, false)).toMatchObject({ segment: "month", complete: true, separator: "." });
    expect(readDateRun("10.10.202", segments, false)).toMatchObject({ segment: "year", complete: false, last: true, separator: "" });
  });

  it("reads a leading four-digit year as complete (ja-JP)", () => {
    const segments = dateSegments(jaJP);
    expect(readDateRun("2026", segments, false)).toMatchObject({ segment: "year", complete: true, separator: "/" });
    expect(readDateRun("2026/10/15", segments, false)).toMatchObject({ segment: "day", complete: true, last: true, separator: "" });
  });

  it("is unmatched when a literal departs from the locale's", () => {
    expect(readDateRun("10-10", dateSegments(ptPT), false)).toEqual({ status: "unmatched" });
    expect(readDateRun("10,10", dateSegments(deDE), false)).toEqual({ status: "unmatched" });
    expect(readDateRun("2026.", dateSegments(koKR), false)).toEqual({ status: "unmatched" });
  });

  it("hands back what follows the run once the text passes its last segment", () => {
    expect(readDateRun("10/10/2026 09", dateSegments(ptPT), true)).toEqual({ status: "past", rest: " 09" });
    expect(readDateRun("2026/10/15 ", dateSegments(jaJP), true)).toEqual({ status: "past", rest: " " });
    expect(readDateRun("2026. 10. 15.", dateSegments(koKR), false)).toEqual({ status: "past", rest: "" });
    expect(readDateRun("2026. 10. 15. 오후", dateSegments(koKR), true)).toEqual({ status: "past", rest: " 오후" });
  });

  it("appends a literal that ends the run only when an editable segment follows the run (ko-KR)", () => {
    const segments = dateSegments(koKR);
    expect(readDateRun("2026", segments, false)).toMatchObject({ segment: "year", complete: true, separator: ". " });
    expect(readDateRun("2026. 10", segments, false)).toMatchObject({ segment: "month", complete: true, separator: ". " });
    expect(readDateRun("2026. 10. 15", segments, false)).toEqual({
      status: "inside",
      segment: "day",
      digits: "15",
      complete: true,
      last: true,
      separator: "",
    });
    expect(readDateRun("2026. 10. 15", segments, true)).toEqual({
      status: "inside",
      segment: "day",
      digits: "15",
      complete: true,
      last: true,
      separator: ".",
    });
    expect(readDateRun("2026. 10. 1", segments, true)).toMatchObject({ segment: "day", complete: false, separator: "" });
  });

  it("appends nothing after the run's last field when no literal follows it, whatever follows the run", () => {
    expect(readDateRun("10/10/2026", dateSegments(ptPT), true)).toMatchObject({
      segment: "year",
      complete: true,
      last: true,
      separator: "",
    });
    expect(readDateRun("10.10.2026", dateSegments(deDE), true)).toMatchObject({
      segment: "year",
      complete: true,
      last: true,
      separator: "",
    });
  });

  it("matches space-like literals as one another and appends the locale's literal verbatim", () => {
    const segments = dateSegments(koKR);
    expect(readDateRun("2026.\u202f10", segments, false)).toMatchObject({ segment: "month", complete: true, separator: ". " });
    expect(readDateRun("2026.\u00a010.\u202f15", segments, true)).toMatchObject({ segment: "day", complete: true, separator: "." });
    const narrow = segments.map((segment) =>
      segment.type === "literal" ? { ...segment, value: segment.value.replace(" ", "\u202f") } : segment,
    );
    expect(readDateRun("2026. 10", narrow, false)).toMatchObject({ segment: "month", complete: true, separator: ".\u202f" });
  });
});
