import { Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import {
  commitText,
  dateBounds,
  type DateTimeBounds,
  dateTimeSegmentAt,
  dateTimeSegmentRanges,
  dateTimeSegments,
  formatDateTimeText,
  isOutOfBounds,
  isPendingFlagged,
  parseDateTimeText,
  pickDate,
  pickTime,
  sameDateTime,
  serialiseDateTime,
  stepDateTimeText,
  timeBounds,
  typeDateTimeText,
} from "./dateTimeFieldModel.js";

function dt(iso: string): LocalDateTime {
  return LocalDateTime.parse(iso);
}

function d(iso: string): LocalDate {
  return LocalDate.parse(iso);
}

function t(iso: string): LocalTime {
  return LocalTime.parse(iso);
}

/**
 * `text` with U+202F read as a plain space: ICU writes it before a 12-hour day period in some
 * versions and a plain space in others, and the time's own spacing is the locale's.
 */
function plain(text: string): string {
  return text.replace(/\u202f/g, " ");
}

/** The ISO text of what `text` reads as under `locale`, so it compares by value. */
function read(text: string, locale: Locale): string | undefined {
  return parseDateTimeText(text, locale)?.toString();
}

/** The box text after typing each character of `keys` onto the end of `from`, one at a time. */
function typeInto(keys: string, locale: Locale, from = ""): string {
  let text = from;
  for (const key of keys) {
    text = typeDateTimeText(text, text + key, locale);
  }
  return text;
}

const enUS = new Locale("en-US");
const enGB = new Locale("en-GB");
const deDE = new Locale("de-DE");
const koKR = new Locale("ko-KR");
const vi = new Locale("vi");
const eu = new Locale("eu");

const evening = dt("2026-10-15T21:05");
const bounds = { min: dt("2026-10-01T09:00"), max: dt("2026-10-05T17:30") };

describe("formatDateTimeText", () => {
  it("writes the date, a single space and a 12-hour time in en-US, with no comma", () => {
    expect(plain(formatDateTimeText(evening, enUS))).toBe("10/15/2026 09:05 PM");
  });

  it("writes a 24-hour time in the locale's own date order", () => {
    expect(formatDateTimeText(evening, enGB)).toBe("15/10/2026 21:05");
    expect(formatDateTimeText(evening, deDE)).toBe("15.10.2026 21:05");
  });

  it("keeps ko-KR's own date punctuation and its day period before the hour", () => {
    expect(formatDateTimeText(evening, koKR)).toBe("2026. 10. 15. 오후 09:05");
  });

  it("writes the time first where the locale does", () => {
    expect(formatDateTimeText(evening, vi)).toBe("21:05 15/10/2026");
  });

  it("drops the text the locale's combined layout writes around the time", () => {
    expect(formatDateTimeText(evening, eu)).toBe("2026/10/15 21:05");
  });

  it("writes midnight and noon on the 12-hour clock as 12", () => {
    expect(plain(formatDateTimeText(dt("2026-10-15T00:00"), enUS))).toBe("10/15/2026 12:00 AM");
    expect(plain(formatDateTimeText(dt("2026-10-15T12:00"), enUS))).toBe("10/15/2026 12:00 PM");
  });

  it("never writes the second", () => {
    expect(formatDateTimeText(dt("2026-10-15T21:05:42"), deDE)).toBe("15.10.2026 21:05");
  });
});

describe("dateTimeSegments", () => {
  it("splits the text into the date's fields, one space and the time's fields", () => {
    expect(dateTimeSegments(evening, enUS).map(({ type, value }) => [type, plain(value)])).toEqual([
      ["month", "10"],
      ["literal", "/"],
      ["day", "15"],
      ["literal", "/"],
      ["year", "2026"],
      ["literal", " "],
      ["hour", "09"],
      ["literal", ":"],
      ["minute", "05"],
      ["literal", " "],
      ["dayPeriod", "PM"],
    ]);
  });

  it("joins the halves with a plain space whatever space characters the time holds", () => {
    expect(dateTimeSegments(evening, enUS)[5]).toEqual({ type: "literal", value: " " });
  });

  it("puts the time's segments first where the locale writes the time first", () => {
    expect(dateTimeSegments(evening, vi).map(({ type }) => type)).toEqual([
      "hour",
      "literal",
      "minute",
      "literal",
      "day",
      "literal",
      "month",
      "literal",
      "year",
    ]);
  });
});

describe("parseDateTimeText", () => {
  it("reads back what formatDateTimeText writes, in every order", () => {
    for (const locale of [enUS, enGB, deDE, koKR, vi, eu]) {
      expect(read(formatDateTimeText(evening, locale), locale)).toBe("2026-10-15T21:05");
    }
  });

  it("reads a 12-hour time in either letter case, unpadded, with any run of whitespace", () => {
    expect(read("10/5/2026   9:05 pm", enUS)).toBe("2026-10-05T21:05");
    expect(read("  10/15/2026 12:30 am ", enUS)).toBe("2026-10-15T00:30");
  });

  it("reads a 24-hour time in the locale's own date order", () => {
    expect(read("15.10.2026 21:05", deDE)).toBe("2026-10-15T21:05");
    expect(read("15/10/2026 09:05", enGB)).toBe("2026-10-15T09:05");
  });

  it("reads ko-KR's date and day period, both of which hold whitespace of their own", () => {
    expect(read("2026. 10. 15. 오전 9:05", koKR)).toBe("2026-10-15T09:05");
  });

  it("keeps a minute off any picker's grid as written", () => {
    expect(read("10/15/2026 09:07 PM", enUS)).toBe("2026-10-15T21:07");
    expect(read("15.10.2026 21:59", deDE)).toBe("2026-10-15T21:59");
  });

  it("reads the locale's combined layout, comma included, and ISO 8601", () => {
    expect(read("10/15/2026, 09:05 PM", enUS)).toBe("2026-10-15T21:05");
    expect(read("15.10.2026, 21:05", deDE)).toBe("2026-10-15T21:05");
    expect(read(" 2026-10-15T21:05 ", koKR)).toBe("2026-10-15T21:05");
  });

  it("reads nothing from text in another locale's order or with a half missing", () => {
    expect(read("15/10/2026 21:05", enUS)).toBeUndefined();
    expect(read("10/15/2026", enUS)).toBeUndefined();
    expect(read("09:05 PM", enUS)).toBeUndefined();
    expect(read("09:05 PM 10/15/2026", enUS)).toBeUndefined();
    expect(read("15.10.2026 09:05 PM", deDE)).toBeUndefined();
  });

  it("reads nothing from a date or a time that does not exist", () => {
    expect(read("02/30/2026 09:05 PM", enUS)).toBeUndefined();
    expect(read("10/15/2026 13:05 PM", enUS)).toBeUndefined();
    expect(read("15.10.2026 24:00", deDE)).toBeUndefined();
    expect(read("15.10.2026 21:60", deDE)).toBeUndefined();
  });
});

describe("commitText", () => {
  const committed = dt("2026-10-02T10:00");

  it("commits typed text inside the bounds", () => {
    expect(commitText("10/03/2026 11:15 AM", committed, enUS, bounds)).toEqual({ kind: "value", value: dt("2026-10-03T11:15") });
    expect(commitText("03.10.2026 11:15", undefined, deDE, bounds)).toEqual({ kind: "value", value: dt("2026-10-03T11:15") });
  });

  it("leaves the committed value alone while the text is still its own", () => {
    expect(commitText("10/02/2026 10:00 AM", committed, enUS, bounds)).toEqual({ kind: "unchanged" });
  });

  it("keeps the seconds of a committed value whose text is untouched", () => {
    const withSeconds = dt("2026-10-02T10:00:30");
    expect(commitText(formatDateTimeText(withSeconds, enUS), withSeconds, enUS, bounds)).toEqual({ kind: "unchanged" });
  });

  it("treats text reading as the committed value, written differently, as unchanged", () => {
    expect(commitText("10/2/2026 10:00 am", committed, enUS, bounds)).toEqual({ kind: "unchanged" });
  });

  it("rejects text outside the bounds, by date or by time", () => {
    expect(commitText("10/01/2026 08:59 AM", committed, enUS, bounds)).toEqual({ kind: "rejected" });
    expect(commitText("05.10.2026 17:31", committed, deDE, bounds)).toEqual({ kind: "rejected" });
    expect(commitText("10/06/2026 09:00 AM", undefined, enUS, bounds)).toEqual({ kind: "rejected" });
  });

  it("accepts the bounds themselves, which are inclusive", () => {
    expect(commitText("10/01/2026 09:00 AM", committed, enUS, bounds)).toEqual({ kind: "value", value: bounds.min });
    expect(commitText("05.10.2026 17:30", committed, deDE, bounds)).toEqual({ kind: "value", value: bounds.max });
  });

  it("rejects text that reads as no date-time", () => {
    expect(commitText("10/02/2026", committed, enUS)).toEqual({ kind: "rejected" });
    expect(commitText("tomorrow", undefined, enUS)).toEqual({ kind: "rejected" });
  });

  it("clears a committed value when the text is emptied", () => {
    expect(commitText("  ", committed, enUS, bounds)).toEqual({ kind: "value", value: undefined });
  });

  it("reports nothing for an empty field left empty", () => {
    expect(commitText("", undefined, enUS, bounds)).toEqual({ kind: "unchanged" });
  });

  it("commits in ko-KR's order", () => {
    expect(commitText("2026. 10. 03. 오후 2:45", committed, koKR, bounds)).toEqual({ kind: "value", value: dt("2026-10-03T14:45") });
  });

  it("commits a typed minute off any picker's grid", () => {
    expect(commitText("10/03/2026 11:17 AM", committed, enUS, bounds)).toEqual({ kind: "value", value: dt("2026-10-03T11:17") });
  });
});

describe("pickDate", () => {
  it("holds a day picked on an empty field pending, committing nothing", () => {
    expect(pickDate(d("2026-10-03"), undefined, bounds)).toEqual({ kind: "pending", date: d("2026-10-03") });
  });

  it("commits a day picked beside a committed value at that value's time", () => {
    expect(pickDate(d("2026-10-03"), dt("2026-10-02T10:00"), bounds)).toEqual({ kind: "value", value: dt("2026-10-03T10:00") });
  });

  it("reports the committed value's own day as unchanged", () => {
    expect(pickDate(d("2026-10-02"), dt("2026-10-02T10:00"), bounds)).toEqual({ kind: "unchanged" });
  });

  it("holds the day pending when the committed time falls outside the bounds on it", () => {
    expect(pickDate(d("2026-10-05"), dt("2026-10-02T18:00"), bounds)).toEqual({ kind: "pending", date: d("2026-10-05") });
    expect(pickDate(d("2026-10-01"), dt("2026-10-02T08:00"), bounds)).toEqual({ kind: "pending", date: d("2026-10-01") });
  });
});

describe("pickTime", () => {
  const committed = dt("2026-10-02T10:00");

  it("commits a time on the pending day", () => {
    expect(pickTime(t("14:30"), d("2026-10-03"), undefined, bounds)).toEqual({ kind: "value", value: dt("2026-10-03T14:30") });
  });

  it("prefers the pending day over the committed value's day", () => {
    expect(pickTime(t("10:00"), d("2026-10-04"), committed, bounds)).toEqual({ kind: "value", value: dt("2026-10-04T10:00") });
  });

  it("commits a time on the committed value's day when nothing is pending", () => {
    expect(pickTime(t("16:15"), undefined, committed, bounds)).toEqual({ kind: "value", value: dt("2026-10-02T16:15") });
  });

  it("commits nothing with no day to put the time on", () => {
    expect(pickTime(t("16:15"), undefined, undefined, bounds)).toEqual({ kind: "unchanged" });
  });

  it("reports the committed value itself as unchanged", () => {
    expect(pickTime(t("10:00"), undefined, committed, bounds)).toEqual({ kind: "unchanged" });
  });

  it("rejects a time outside the bounds on its day", () => {
    expect(pickTime(t("08:30"), d("2026-10-01"), undefined, bounds)).toEqual({ kind: "rejected" });
    expect(pickTime(t("17:45"), undefined, dt("2026-10-05T10:00"), bounds)).toEqual({ kind: "rejected" });
  });
});

describe("isPendingFlagged", () => {
  it("flags a pending day only once focus has left the whole field", () => {
    expect(isPendingFlagged(d("2026-10-03"), false)).toBe(false);
    expect(isPendingFlagged(d("2026-10-03"), true)).toBe(true);
  });

  it("never flags a field with no pending day", () => {
    expect(isPendingFlagged(undefined, true)).toBe(false);
    expect(isPendingFlagged(undefined, false)).toBe(false);
  });
});

describe("sameDateTime", () => {
  it("compares date-times by value", () => {
    expect(sameDateTime(dt("2026-10-01T14:30"), dt("2026-10-01T14:30"))).toBe(true);
    expect(sameDateTime(dt("2026-10-01T14:30"), dt("2026-10-01T14:31"))).toBe(false);
  });

  it("treats undefined as equal only to undefined", () => {
    expect(sameDateTime(undefined, undefined)).toBe(true);
    expect(sameDateTime(undefined, dt("2026-10-01T14:30"))).toBe(false);
    expect(sameDateTime(dt("2026-10-01T14:30"), undefined)).toBe(false);
  });
});

// biome-ignore lint/security/noSecrets: a function name, read as a high-entropy string
describe("isOutOfBounds", () => {
  it("accepts the bounds themselves, which are inclusive", () => {
    expect(isOutOfBounds(dt("2026-10-01T09:00"), bounds)).toBe(false);
    expect(isOutOfBounds(dt("2026-10-05T17:30"), bounds)).toBe(false);
    expect(isOutOfBounds(dt("2026-10-03T00:00"), bounds)).toBe(false);
  });

  it("rejects a date-time before min or after max, by date or by time", () => {
    expect(isOutOfBounds(dt("2026-10-01T08:59"), bounds)).toBe(true);
    expect(isOutOfBounds(dt("2026-09-30T23:59"), bounds)).toBe(true);
    expect(isOutOfBounds(dt("2026-10-05T17:31"), bounds)).toBe(true);
    expect(isOutOfBounds(dt("2026-10-06T00:00"), bounds)).toBe(true);
  });

  it("accepts any date-time when nothing bounds it, and checks only the end given", () => {
    expect(isOutOfBounds(dt("0001-01-01T00:00"), {})).toBe(false);
    expect(isOutOfBounds(dt("2026-12-31T00:00"), { min: bounds.min })).toBe(false);
    expect(isOutOfBounds(dt("2026-01-01T00:00"), { max: bounds.max })).toBe(false);
  });
});

describe("dateBounds", () => {
  it("hands the date half the dates of both bounds", () => {
    const { min, max } = dateBounds(bounds);
    expect([min?.toString(), max?.toString()]).toEqual(["2026-10-01", "2026-10-05"]);
  });

  it("hands it no bound where the field has none", () => {
    expect(dateBounds({})).toEqual({ min: undefined, max: undefined });
  });
});

describe("timeBounds", () => {
  it("applies min's time only on min's date", () => {
    const { min, max } = timeBounds(d("2026-10-01"), bounds);
    expect([min?.toString(), max]).toEqual(["09:00", undefined]);
  });

  it("applies max's time only on max's date", () => {
    const { min, max } = timeBounds(d("2026-10-05"), bounds);
    expect([min, max?.toString()]).toEqual([undefined, "17:30"]);
  });

  it("applies both times when min and max share a date", () => {
    const { min, max } = timeBounds(d("2026-10-01"), { min: dt("2026-10-01T09:00"), max: dt("2026-10-01T17:00") });
    expect([min?.toString(), max?.toString()]).toEqual(["09:00", "17:00"]);
  });

  it("applies neither on a date between the bounds, or with no date chosen", () => {
    expect(timeBounds(d("2026-10-03"), bounds)).toEqual({ min: undefined, max: undefined });
    expect(timeBounds(undefined, bounds)).toEqual({ min: undefined, max: undefined });
  });

  it("applies neither when the field has no bounds", () => {
    expect(timeBounds(d("2026-10-01"), {})).toEqual({ min: undefined, max: undefined });
  });
});

describe("serialiseDateTime", () => {
  it("writes the date and the hour and minute in ISO 8601", () => {
    expect(serialiseDateTime(dt("2026-10-01T14:30"))).toBe("2026-10-01T14:30");
  });

  it("adds the second only when it is non-zero, as the ISO time does", () => {
    expect(serialiseDateTime(dt("2026-10-01T14:30:05"))).toBe("2026-10-01T14:30:05");
    expect(serialiseDateTime(LocalDateTime.of(d("2026-10-01"), LocalTime.of(14, 30, 0)))).toBe("2026-10-01T14:30");
  });

  it("writes nothing without a value", () => {
    expect(serialiseDateTime(undefined)).toBe("");
  });
});

describe("typeDateTimeText", () => {
  describe("the acceptance input", () => {
    it("types en-US's date, a padded 12-hour time and the day period from digits and a letter", () => {
      const text = typeInto("101520260905p", enUS);
      expect(plain(text)).toBe("10/15/2026 09:05 PM");
      expect(read(text, enUS)).toBe("2026-10-15T21:05");
    });

    it("picks either day period in either letter case", () => {
      expect(plain(typeInto("101520260905a", enUS))).toBe("10/15/2026 09:05 AM");
      expect(plain(typeInto("101520260905A", enUS))).toBe("10/15/2026 09:05 AM");
      expect(plain(typeInto("101520260905P", enUS))).toBe("10/15/2026 09:05 PM");
    });

    it("types de-DE's date and a 24-hour time, appending nothing after the minute", () => {
      expect(typeInto("151020262105", deDE)).toBe("15.10.2026 21:05");
    });

    it("leaves text that commits to a value written back the same way after blur", () => {
      const text = typeInto("101520260905p", enUS);
      const commit = commitText(text, undefined, enUS);
      expect(commit).toEqual({ kind: "value", value: evening });
      expect(plain(formatDateTimeText(evening, enUS))).toBe(plain(text));
      expect(formatDateTimeText(evening, deDE)).toBe(typeInto("151020262105", deDE));
    });
  });

  describe("appending literals", () => {
    it("appends the separator after a completed date field and the space after the date", () => {
      expect(typeInto("10", enUS)).toBe("10/");
      expect(typeInto("1015", enUS)).toBe("10/15/");
      expect(typeInto("10152026", enUS)).toBe("10/15/2026 ");
      expect(typeInto("1015202609", enUS)).toBe("10/15/2026 09:");
    });

    it("appends the literal before the day period as the locale writes it", () => {
      const text = typeInto("101520260905", enUS);
      expect(plain(text)).toBe("10/15/2026 09:05 ");
      expect(text.slice(-1)).toBe(dateTimeSegments(evening, enUS)[9]?.value);
    });

    it("appends every literal between ko-KR's day and its day period", () => {
      expect(typeInto("20261015", koKR)).toBe("2026. 10. 15. ");
    });

    it("types ko-KR's day period before its hour", () => {
      expect(typeInto("20261015후", koKR)).toBe("2026. 10. 15. 오후 ");
      expect(typeInto("0905", koKR, typeInto("20261015후", koKR))).toBe(formatDateTimeText(evening, koKR));
      expect(typeInto("0905", koKR, typeInto("20261015전", koKR))).toBe("2026. 10. 15. 오전 09:05");
    });

    it("types vi's time before its date, with nothing after the year", () => {
      expect(typeInto("2105", vi)).toBe("21:05 ");
      expect(typeInto("2105151020", vi)).toBe("21:05 15/10/20");
      expect(typeInto("210515102026", vi)).toBe(formatDateTimeText(evening, vi));
    });
  });

  describe("the time half", () => {
    it("pads a digit that completes its segment and appends the literal after it", () => {
      expect(typeInto("151020263", deDE)).toBe("15.10.2026 03:");
      expect(typeInto("101520262", enUS)).toBe("10/15/2026 02:");
      expect(typeInto("1510202621", deDE)).toBe("15.10.2026 21:");
      expect(typeInto("15102026217", deDE)).toBe("15.10.2026 21:07");
    });

    it("shows a digit that may still take another as typed", () => {
      expect(typeInto("101520261", enUS)).toBe("10/15/2026 1");
      expect(typeInto("151020262", deDE)).toBe("15.10.2026 2");
    });

    it("rewrites the shown digit when the next one spells no hour with it", () => {
      expect(typeInto("1015202619", enUS)).toBe("10/15/2026 09:");
      expect(typeInto("1510202624", deDE)).toBe("15.10.2026 04:");
    });

    it("completes a 24-hour 1 and 3 as 13, as the time field does", () => {
      expect(typeInto("1510202613", deDE)).toBe("15.10.2026 13:");
    });

    it("drops a second 0 in a 12-hour hour", () => {
      expect(typeInto("1015202600", enUS)).toBe("10/15/2026 0");
      expect(typeInto("10152026001", enUS)).toBe("10/15/2026 01:");
    });

    it("pads a digit a separator is typed onto and keeps the separator", () => {
      expect(typeInto("101520261:", enUS)).toBe("10/15/2026 01:");
      expect(typeInto("15102026210 ", deDE)).toBe("15.10.2026 21:00 ");
      expect(plain(typeInto("1015202609:5 ", enUS))).toBe("10/15/2026 09:05 ");
    });

    it("leaves a separator typed onto a 12-hour 0 as typed", () => {
      expect(typeInto("101520260:", enUS)).toBe("10/15/2026 0:");
    });

    it("drops a letter typed into a numeric segment", () => {
      expect(typeInto("10152026x", enUS)).toBe("10/15/2026 ");
      expect(typeInto("101520260p", enUS)).toBe("10/15/2026 0");
      expect(typeInto("15102026210a", deDE)).toBe("15.10.2026 21:0");
    });

    it("leaves a key typed onto two digits an entry in progress never holds as typed", () => {
      expect(typeInto("1", enUS, "10/15/2026 09")).toBe("10/15/2026 091");
      expect(typeInto("p", enUS, "10/15/2026 09")).toBe("10/15/2026 09p");
      expect(typeInto(":", enUS, "10/15/2026 09")).toBe("10/15/2026 09:");
    });
  });

  describe("the day period", () => {
    const beforePeriod = typeInto("101520260905", enUS);

    it("replaces a completed day period with the one a key picks out", () => {
      expect(plain(typeInto("pa", enUS, beforePeriod))).toBe("10/15/2026 09:05 AM");
      expect(plain(typeInto("aP", enUS, beforePeriod))).toBe("10/15/2026 09:05 PM");
    });

    it("drops a key that picks out neither day period", () => {
      expect(plain(typeInto("pm", enUS, beforePeriod))).toBe("10/15/2026 09:05 PM");
      expect(typeInto("x", enUS, beforePeriod)).toBe(beforePeriod);
      expect(typeInto("오", koKR, "2026. 10. 15. ")).toBe("2026. 10. 15. ");
    });

    it("drops a digit typed into an empty day period", () => {
      expect(typeInto("9", enUS, beforePeriod)).toBe(beforePeriod);
      expect(typeInto("9", koKR, "2026. 10. 15. ")).toBe("2026. 10. 15. ");
    });

    it("leaves text in the day period that is neither label as typed", () => {
      expect(typeInto("M", enUS, `${beforePeriod}p`)).toBe(`${beforePeriod}pM`);
    });

    it("leaves a separator typed after ko-KR's day period as typed", () => {
      expect(typeInto(" ", koKR, "2026. 10. 15. 오후")).toBe("2026. 10. 15. 오후 ");
    });
  });

  describe("past the last segment", () => {
    it("leaves a digit typed after the last segment as typed", () => {
      const complete = typeInto("101520260905p", enUS);
      expect(typeInto("5", enUS, complete)).toBe(`${complete}5`);
      expect(typeInto("6", deDE, "15.10.2026 21:05")).toBe("15.10.2026 21:056");
      expect(typeInto("7", vi, "21:05 15/10/2026")).toBe("21:05 15/10/20267");
    });

    it("leaves a day-period key typed after ko-KR's minute as typed", () => {
      const complete = formatDateTimeText(evening, koKR);
      expect(typeInto("a", koKR, complete)).toBe(`${complete}a`);
      expect(typeInto("전", koKR, complete)).toBe(`${complete}전`);
    });

    it("leaves text that runs past the pattern as typed", () => {
      expect(typeInto("1", deDE, "15.10.2026 21:05 x")).toBe("15.10.2026 21:05 x1");
    });
  });

  describe("separators", () => {
    it("accepts a separator typed into the date half and drops one that repeats", () => {
      expect(typeInto("10/1/", enUS)).toBe("10/1/");
      expect(typeInto("10/", enUS)).toBe("10/");
      expect(typeInto("10/15/2026 ", enUS)).toBe("10/15/2026 ");
    });

    it("never doubles a separator the field appended", () => {
      expect(typeInto(":", enUS, "10/15/2026 09:")).toBe("10/15/2026 09:");
      expect(typeInto(" ", koKR, "2026. 10. 15. ")).toBe("2026. 10. 15. ");
    });

    it("reads a typed space as the narrow or non-breaking one the locale writes", () => {
      expect(typeInto(" ", enUS, "10/15/2026 09:05\u202f")).toBe("10/15/2026 09:05\u202f");
      expect(typeInto(" ", enUS, "10/15/2026 09:05\u00a0")).toBe("10/15/2026 09:05\u00a0");
      expect(plain(typeInto("p", enUS, "10/15/2026 09:05 "))).toBe("10/15/2026 09:05 PM");
    });

    it("leaves a text that ends partway through a literal as typed", () => {
      expect(typeInto("1", koKR, "2026.")).toBe("2026.1");
      expect(typeInto("오", koKR, "2026. 10. 15.")).toBe("2026. 10. 15.오");
    });
  });

  describe("edits other than one character typed at the end", () => {
    it("leaves a deletion untouched", () => {
      expect(typeDateTimeText("10/15/", "10/15", enUS)).toBe("10/15");
      expect(typeDateTimeText("10/15/2026 09:", "10/15/2026 09", enUS)).toBe("10/15/2026 09");
    });

    it("leaves a paste untouched", () => {
      expect(typeDateTimeText("", "10/15/2026", enUS)).toBe("10/15/2026");
      expect(typeDateTimeText("10/15/2026 ", "10/15/2026 0905", enUS)).toBe("10/15/2026 0905");
    });

    it("leaves an edit in the middle untouched", () => {
      expect(typeDateTimeText("10/15/2026 09:", "10/155/2026 09:", enUS)).toBe("10/155/2026 09:");
      expect(typeDateTimeText("15.10.2026 2", "15.10.20226 2", deDE)).toBe("15.10.20226 2");
    });

    it("leaves a replaced selection untouched", () => {
      expect(typeDateTimeText("10/15/2026 09:05", "10/15/2026 09:07", enUS)).toBe("10/15/2026 09:07");
      expect(typeDateTimeText("10/15/2026 09", "10/15/2026 1", enUS)).toBe("10/15/2026 1");
    });

    it("leaves text that leaves the pattern untouched", () => {
      expect(typeDateTimeText("10-1", "10-15", enUS)).toBe("10-15");
    });
  });
});

describe("committing typed text", () => {
  it("commits a draft ending in an appended separator as it commits the same text without it", () => {
    const drafts: [string, Locale][] = [
      [typeInto("10152026", enUS), enUS],
      [typeInto("101520260905", enUS), enUS],
      [typeInto("20261015", koKR), koKR],
      [typeInto("2105", vi), vi],
      [typeInto("15102026", deDE), deDE],
      ["15.10.2026 21:05 ", deDE],
      [`${typeInto("101520260905p", enUS)} `, enUS],
    ];
    for (const [draft, locale] of drafts) {
      expect(commitText(draft, undefined, locale)).toEqual(commitText(draft.trimEnd(), undefined, locale));
      expect(commitText(draft, evening, locale)).toEqual(commitText(draft.trimEnd(), evening, locale));
    }
  });

  it("keeps a committed second when the committed value's text ends in a typed space", () => {
    const withSeconds = dt("2026-10-15T21:05:42");
    const text = formatDateTimeText(withSeconds, deDE);
    expect(commitText(`${text} `, withSeconds, deDE)).toEqual({ kind: "unchanged" });
  });

  it("reads the zero-padded hour the time half writes", () => {
    expect(read(typeInto("101520260105a", enUS), enUS)).toBe("2026-10-15T01:05");
    expect(read(typeInto("15102026305", deDE), deDE)).toBe("2026-10-15T03:05");
    expect(read(typeInto("0905", koKR, typeInto("20261015전", koKR)), koKR)).toBe("2026-10-15T09:05");
    expect(read("10/15/2026 01:05 PM", enUS)).toBe("2026-10-15T13:05");
  });
});

/** Each field of `text` under `locale` as `[segment, start, end]`, or `undefined` when there are none. */
function rangesOf(text: string, locale: Locale): [string, number, number][] | undefined {
  return dateTimeSegmentRanges(text, locale)?.map(({ segment, start, end }) => [segment, start, end]);
}

const TODAY = d("2026-10-14");

/**
 * What an arrow key at `caret` does to the field's text for `from`: the ISO text of the stepped
 * value and the stepped field's range in its text, or `refused`.
 */
function stepFrom(
  from: LocalDateTime | string,
  caret: number,
  direction: 1 | -1,
  locale: Locale,
  stepBounds: DateTimeBounds = {},
): [string, string, number, number] | "refused" {
  const text = typeof from === "string" ? from : formatDateTimeText(from, locale);
  const result = stepDateTimeText(text, caret, direction, locale, TODAY, stepBounds);
  if (result.kind === "refused") return "refused";
  const { segment, start, end } = result.range;
  return [result.value.toString(), segment, start, end];
}

describe("dateTimeSegmentRanges", () => {
  it("places every field of a 12-hour text, the date's and the time's", () => {
    expect(rangesOf(formatDateTimeText(evening, enUS), enUS)).toEqual([
      ["month", 0, 2],
      ["day", 3, 5],
      ["year", 6, 10],
      ["hour", 11, 13],
      ["minute", 14, 16],
      ["dayPeriod", 17, 19],
    ]);
  });

  it("counts every literal of a run, the day period coming before the hour", () => {
    expect(rangesOf("2026. 10. 15. 오후 09:05", koKR)).toEqual([
      ["year", 0, 4],
      ["month", 6, 8],
      ["day", 10, 12],
      ["dayPeriod", 14, 16],
      ["hour", 17, 19],
      ["minute", 20, 22],
    ]);
  });

  it("places the time's fields first where the locale writes the time first", () => {
    expect(rangesOf("21:05 15/10/2026", vi)).toEqual([
      ["hour", 0, 2],
      ["minute", 3, 5],
      ["day", 6, 8],
      ["month", 9, 11],
      ["year", 12, 16],
    ]);
  });

  it("reads a no-break or narrow no-break space where the field writes a plain one, and the reverse", () => {
    expect(rangesOf("15.10.2026\u00a021:05", deDE)).toEqual(rangesOf("15.10.2026 21:05", deDE));
    expect(rangesOf("10/15/2026\u202f09:05 PM", enUS)).toEqual(rangesOf(formatDateTimeText(evening, enUS), enUS));
    expect(rangesOf(plain(formatDateTimeText(evening, enUS)), enUS)).toHaveLength(6);
  });

  it("places nothing in text that is not exactly a date-time as the field writes it", () => {
    expect(rangesOf("15.10.2026 21:0", deDE)).toBeUndefined();
    expect(rangesOf("15.10.2026 9:05", deDE)).toBeUndefined();
    expect(rangesOf(" 15.10.2026 21:05", deDE)).toBeUndefined();
    expect(rangesOf("15.10.2026 21:05:30", deDE)).toBeUndefined();
    expect(rangesOf("2026-10-15T21:05", deDE)).toBeUndefined();
    expect(rangesOf("tomorrow", deDE)).toBeUndefined();
    expect(rangesOf("", deDE)).toBeUndefined();
  });
});

describe("dateTimeSegmentAt", () => {
  const text = "15.10.2026 21:05";

  it("keeps a caret at a field's end in that field", () => {
    expect(dateTimeSegmentAt(text, 2, deDE)).toEqual({ segment: "day", start: 0, end: 2 });
    expect(dateTimeSegmentAt(text, 10, deDE)).toEqual({ segment: "year", start: 6, end: 10 });
  });

  it("gives a caret inside a literal to the field after it, across the gap between the halves", () => {
    expect(dateTimeSegmentAt(text, 11, deDE)).toEqual({ segment: "hour", start: 11, end: 13 });
    expect(dateTimeSegmentAt("2026. 10. 15. 오후 09:05", 13, koKR)).toEqual({ segment: "dayPeriod", start: 14, end: 16 });
  });

  it("gives a caret past the last field to the last field", () => {
    expect(dateTimeSegmentAt(text, 99, deDE)).toEqual({ segment: "minute", start: 14, end: 16 });
  });

  it("names no field in text the field does not write", () => {
    expect(dateTimeSegmentAt("15.10.2026", 0, deDE)).toBeUndefined();
  });
});

describe("stepDateTimeText", () => {
  describe("a 12-hour layout", () => {
    it("steps the month, the day and the year as the date field does, keeping the time", () => {
      expect(stepFrom(evening, 0, 1, enUS)).toEqual(["2026-11-15T21:05", "month", 0, 2]);
      expect(stepFrom(evening, 4, -1, enUS)).toEqual(["2026-10-14T21:05", "day", 3, 5]);
      expect(stepFrom(evening, 8, 1, enUS)).toEqual(["2027-10-15T21:05", "year", 6, 10]);
    });

    it("steps the hour and the minute within their ranges, keeping the date and the day period", () => {
      expect(stepFrom(evening, 12, 1, enUS)).toEqual(["2026-10-15T22:05", "hour", 11, 13]);
      expect(stepFrom(dt("2026-10-15T12:05"), 12, 1, enUS)).toEqual(["2026-10-15T13:05", "hour", 11, 13]);
      expect(stepFrom(dt("2026-10-15T23:05"), 12, 1, enUS)).toEqual(["2026-10-15T12:05", "hour", 11, 13]);
      expect(stepFrom(dt("2026-10-15T21:59"), 15, 1, enUS)).toEqual(["2026-10-15T21:00", "minute", 14, 16]);
    });

    it("toggles the day period", () => {
      expect(stepFrom(evening, 18, 1, enUS)).toEqual(["2026-10-15T09:05", "dayPeriod", 17, 19]);
      expect(stepFrom(dt("2026-10-15T09:05"), 19, -1, enUS)).toEqual(["2026-10-15T21:05", "dayPeriod", 17, 19]);
    });
  });

  describe("a 24-hour layout", () => {
    it("wraps the hour at midnight without moving the date", () => {
      expect(stepFrom(dt("2026-10-15T23:05"), 12, 1, deDE)).toEqual(["2026-10-15T00:05", "hour", 11, 13]);
      expect(stepFrom(dt("2026-10-15T00:05"), 12, -1, deDE)).toEqual(["2026-10-15T23:05", "hour", 11, 13]);
    });

    it("wraps the minute without moving the hour", () => {
      expect(stepFrom(dt("2026-10-15T21:00"), 16, -1, deDE)).toEqual(["2026-10-15T21:59", "minute", 14, 16]);
    });

    it("carries a day into the next month, and clamps a month to the target month's last day", () => {
      expect(stepFrom(dt("2026-10-31T21:05"), 0, 1, deDE)).toEqual(["2026-11-01T21:05", "day", 0, 2]);
      expect(stepFrom(dt("2026-10-31T21:05"), 3, 1, deDE)).toEqual(["2026-11-30T21:05", "month", 3, 5]);
    });
  });

  describe("a period-first layout", () => {
    it("steps the day period, the hour and the minute after the date", () => {
      expect(stepFrom(evening, 15, 1, koKR)).toEqual(["2026-10-15T09:05", "dayPeriod", 14, 16]);
      expect(stepFrom(evening, 18, -1, koKR)).toEqual(["2026-10-15T20:05", "hour", 17, 19]);
      expect(stepFrom(evening, 22, 1, koKR)).toEqual(["2026-10-15T21:06", "minute", 20, 22]);
    });

    it("steps the date's fields", () => {
      expect(stepFrom(evening, 2, 1, koKR)).toEqual(["2027-10-15T21:05", "year", 0, 4]);
      expect(stepFrom(evening, 7, 1, koKR)).toEqual(["2026-11-15T21:05", "month", 6, 8]);
      expect(stepFrom(evening, 11, 1, koKR)).toEqual(["2026-10-16T21:05", "day", 10, 12]);
    });
  });

  describe("a time-first layout", () => {
    it("steps the time's fields before the date's", () => {
      expect(stepFrom(evening, 0, 1, vi)).toEqual(["2026-10-15T22:05", "hour", 0, 2]);
      expect(stepFrom(evening, 4, -1, vi)).toEqual(["2026-10-15T21:04", "minute", 3, 5]);
    });

    it("steps the date's fields after the time", () => {
      expect(stepFrom(evening, 7, 1, vi)).toEqual(["2026-10-16T21:05", "day", 6, 8]);
      expect(stepFrom(evening, 10, -1, vi)).toEqual(["2026-09-15T21:05", "month", 9, 11]);
      expect(stepFrom(evening, 16, 1, vi)).toEqual(["2027-10-15T21:05", "year", 12, 16]);
    });
  });

  describe("an empty field", () => {
    it("steps onto today at midnight, selecting the first field", () => {
      expect(stepFrom("", 0, 1, enUS)).toEqual(["2026-10-14T00:00", "month", 0, 2]);
      expect(stepFrom("  ", 0, -1, deDE)).toEqual(["2026-10-14T00:00", "day", 0, 2]);
      expect(stepFrom("", 0, 1, vi)).toEqual(["2026-10-14T00:00", "hour", 0, 2]);
    });

    it("clamps today to the dates of the bounds", () => {
      expect(stepFrom("", 0, 1, deDE, { min: dt("2026-11-01T00:00") })).toEqual(["2026-11-01T00:00", "day", 0, 2]);
    });

    it("refuses a midnight the bounds rule out", () => {
      expect(stepFrom("", 0, 1, deDE, { min: dt("2026-10-14T09:00") })).toBe("refused");
    });
  });

  describe("text the field does not write", () => {
    it("refuses partial, unpadded and unparseable text", () => {
      expect(stepFrom("15.10.2026 21:0", 14, 1, deDE)).toBe("refused");
      expect(stepFrom("15.10.2026 9:05", 11, 1, deDE)).toBe("refused");
      expect(stepFrom("2026-10-15T21:05", 0, 1, deDE)).toBe("refused");
      expect(stepFrom("tomorrow", 0, 1, deDE)).toBe("refused");
    });

    it("steps text whose spaces are the equivalents of the ones the field writes", () => {
      expect(stepFrom("15.10.2026\u00a021:05", 12, 1, deDE)).toEqual(["2026-10-15T22:05", "hour", 11, 13]);
    });
  });

  describe("bounds", () => {
    it("refuses a time step past max or min", () => {
      expect(stepFrom(dt("2026-10-15T21:30"), 15, 1, deDE, { max: dt("2026-10-15T21:30") })).toBe("refused");
      expect(stepFrom(dt("2026-10-15T21:30"), 12, -1, deDE, { min: dt("2026-10-15T21:00") })).toBe("refused");
    });

    it("refuses a time step that wraps out of the bounds", () => {
      expect(stepFrom(dt("2026-10-15T23:05"), 12, 1, deDE, { min: dt("2026-10-15T08:00") })).toBe("refused");
    });

    it("judges a date step by the whole value, its time included", () => {
      expect(stepFrom(evening, 0, 1, deDE, { max: dt("2026-10-16T12:00") })).toBe("refused");
      expect(stepFrom(evening, 0, 1, deDE, { max: dt("2026-10-16T22:00") })).toEqual(["2026-10-16T21:05", "day", 0, 2]);
    });

    it("clamps a date step to the dates of the bounds, and refuses one that the clamp leaves in place", () => {
      expect(stepFrom(evening, 3, 1, deDE, { max: dt("2026-10-20T23:00") })).toEqual(["2026-10-20T21:05", "month", 3, 5]);
      expect(stepFrom(evening, 0, 1, deDE, { max: dt("2026-10-15T23:00") })).toBe("refused");
    });

    it("accepts a step from a value outside the bounds that lands inside them", () => {
      expect(stepFrom(dt("2026-10-15T20:05"), 12, 1, deDE, { min: dt("2026-10-15T21:00") })).toEqual(["2026-10-15T21:05", "hour", 11, 13]);
    });
  });
});
