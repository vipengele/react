import { Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import {
  commitHalves,
  commitText,
  type DateTimeHalves,
  dateBounds,
  dateTimeSegments,
  EMPTY_HALVES,
  formatDateTimeText,
  isHalfFilled,
  isInvalid,
  isOutOfBounds,
  isPendingFlagged,
  isRejected,
  joinHalves,
  parseDateTimeText,
  pickDate,
  pickTime,
  reseedHalves,
  sameDateTime,
  serialiseDateTime,
  splitDateTime,
  timeBounds,
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

function halves(date: string | undefined, time: string | undefined): DateTimeHalves {
  return { date: date === undefined ? undefined : d(date), time: time === undefined ? undefined : t(time) };
}

/** The halves as ISO strings, so they compare by value. */
function shown({ date, time }: DateTimeHalves): [string | undefined, string | undefined] {
  return [date?.toString(), time?.toString()];
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

describe("splitDateTime", () => {
  it("fills both halves from a date-time", () => {
    expect(shown(splitDateTime(dt("2026-10-01T14:30:05")))).toEqual(["2026-10-01", "14:30:05"]);
  });

  it("fills neither half from undefined", () => {
    expect(splitDateTime(undefined)).toBe(EMPTY_HALVES);
  });
});

describe("joinHalves", () => {
  it("joins two filled halves into their date-time", () => {
    expect(joinHalves(halves("2026-10-01", "14:30"))?.toString()).toBe("2026-10-01T14:30");
  });

  it("invents no time for a date alone, nor a date for a time alone", () => {
    expect(joinHalves(halves("2026-10-01", undefined))).toBeUndefined();
    expect(joinHalves(halves(undefined, "14:30"))).toBeUndefined();
    expect(joinHalves(EMPTY_HALVES)).toBeUndefined();
  });

  it("round-trips through splitDateTime", () => {
    const value = dt("2026-10-01T14:30:05.250");
    expect(joinHalves(splitDateTime(value))?.equals(value)).toBe(true);
  });
});

describe("isHalfFilled", () => {
  it("is true with exactly one half filled", () => {
    expect(isHalfFilled(halves("2026-10-01", undefined))).toBe(true);
    expect(isHalfFilled(halves(undefined, "14:30"))).toBe(true);
  });

  it("is false with both halves filled or both empty", () => {
    expect(isHalfFilled(halves("2026-10-01", "14:30"))).toBe(false);
    expect(isHalfFilled(EMPTY_HALVES)).toBe(false);
  });
});

describe("isRejected", () => {
  it("rejects two filled halves outside the bounds", () => {
    expect(isRejected(halves("2026-10-01", "08:00"), bounds)).toBe(true);
  });

  it("accepts two filled halves inside the bounds", () => {
    expect(isRejected(halves("2026-10-01", "09:00"), bounds)).toBe(false);
  });

  it("never rejects a half-filled or empty field, which spells no date-time", () => {
    expect(isRejected(halves("2026-09-01", undefined), bounds)).toBe(false);
    expect(isRejected(EMPTY_HALVES, bounds)).toBe(false);
  });
});

describe("isInvalid", () => {
  it("flags a half-filled field only once focus has left the group", () => {
    const dateOnly = halves("2026-10-02", undefined);
    expect(isInvalid(dateOnly, bounds, false)).toBe(false);
    expect(isInvalid(dateOnly, bounds, true)).toBe(true);
    expect(isInvalid(halves(undefined, "10:00"), {}, true)).toBe(true);
  });

  it("flags a filled field outside the bounds whether or not focus has left", () => {
    expect(isInvalid(halves("2026-10-05", "18:00"), bounds, false)).toBe(true);
    expect(isInvalid(halves("2026-10-05", "18:00"), bounds, true)).toBe(true);
  });

  it("does not flag an empty field or a filled one in range", () => {
    expect(isInvalid(EMPTY_HALVES, bounds, true)).toBe(false);
    expect(isInvalid(halves("2026-10-02", "10:00"), bounds, true)).toBe(false);
  });
});

describe("commitHalves", () => {
  const committed = dt("2026-10-02T10:00");
  const spelled = halves("2026-10-02", "10:00");

  it("reports two filled halves in range as their date-time", () => {
    const commit = commitHalves(spelled, halves("2026-10-02", "11:15"), committed, bounds);
    expect(commit.kind === "value" && commit.value?.toString()).toBe("2026-10-02T11:15");
  });

  it("reports the first complete value of an empty field", () => {
    const commit = commitHalves(halves("2026-10-02", undefined), halves("2026-10-02", "11:15"), undefined, bounds);
    expect(commit.kind === "value" && commit.value?.toString()).toBe("2026-10-02T11:15");
  });

  it("reports nothing when the halves still spell the committed value", () => {
    expect(commitHalves(halves("2026-10-01", "10:00"), spelled, committed, bounds)).toEqual({ kind: "none" });
  });

  it("rejects two filled halves outside the bounds", () => {
    expect(commitHalves(spelled, halves("2026-10-05", "18:00"), committed, bounds)).toEqual({ kind: "rejected" });
    expect(commitHalves(EMPTY_HALVES, halves("2026-10-01", "08:59"), undefined, bounds)).toEqual({ kind: "rejected" });
  });

  it("clears a complete value when either half, or both, is emptied", () => {
    expect(commitHalves(spelled, halves("2026-10-02", undefined), committed, bounds)).toEqual({ kind: "value", value: undefined });
    expect(commitHalves(spelled, halves(undefined, "10:00"), committed, bounds)).toEqual({ kind: "value", value: undefined });
    expect(commitHalves(spelled, EMPTY_HALVES, committed, bounds)).toEqual({ kind: "value", value: undefined });
  });

  it("keeps the committed value when a half is emptied from halves a rejected edit moved off it", () => {
    const moved = halves("2026-10-01", "08:30");
    expect(commitHalves(moved, halves("2026-10-01", undefined), committed, bounds)).toEqual({ kind: "none" });
    expect(commitHalves(moved, halves(undefined, "08:30"), committed, bounds)).toEqual({ kind: "none" });
  });

  it("keeps the committed value when the other half of a half-filled field is emptied", () => {
    expect(commitHalves(halves("2026-10-01", undefined), EMPTY_HALVES, committed, bounds)).toEqual({ kind: "none" });
  });

  it("reports nothing while a field with no value is half-filled or emptied", () => {
    expect(commitHalves(EMPTY_HALVES, halves("2026-10-02", undefined), undefined, bounds)).toEqual({ kind: "none" });
    expect(commitHalves(EMPTY_HALVES, halves(undefined, "10:00"), undefined, bounds)).toEqual({ kind: "none" });
    expect(commitHalves(halves("2026-10-02", undefined), EMPTY_HALVES, undefined, bounds)).toEqual({ kind: "none" });
  });
});

describe("reseedHalves", () => {
  const value = dt("2026-10-02T10:00");

  it("keeps the halves, by reference, while the incoming value is the one they were seeded from", () => {
    const current = halves("2026-10-02", "11:00");
    expect(reseedHalves(current, dt("2026-10-02T10:00"), value)).toBe(current);
  });

  it("reseeds both halves from a different incoming date-time", () => {
    expect(shown(reseedHalves(halves("2026-10-02", undefined), dt("2026-10-04T16:45"), value))).toEqual(["2026-10-04", "16:45"]);
    expect(shown(reseedHalves(EMPTY_HALVES, dt("2026-10-04T16:45"), undefined))).toEqual(["2026-10-04", "16:45"]);
  });

  it("empties a complete field whose parent clears its value", () => {
    expect(reseedHalves(halves("2026-10-02", "10:00"), undefined, value)).toBe(EMPTY_HALVES);
  });

  it("keeps a half-filled field beside a controlled empty value", () => {
    const dateOnly = halves("2026-10-02", undefined);
    expect(reseedHalves(dateOnly, undefined, undefined)).toBe(dateOnly);
    const timeOnly = halves(undefined, "10:00");
    expect(reseedHalves(timeOnly, undefined, undefined)).toBe(timeOnly);
  });

  it("keeps a filled field the bounds rejected beside a controlled empty value", () => {
    const rejected = halves("2026-10-09", "10:00");
    expect(reseedHalves(rejected, undefined, undefined)).toBe(rejected);
  });

  it("restores the parent's value when it holds that value against a cleared half", () => {
    // Emptying the time committed `undefined`, which became the seeded value; a parent that
    // declines the clear passes its own value back.
    expect(shown(reseedHalves(halves("2026-10-02", undefined), value, undefined))).toEqual(["2026-10-02", "10:00"]);
  });
});
