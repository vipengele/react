import { LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import {
  commitHalves,
  type DateTimeHalves,
  dateBounds,
  EMPTY_HALVES,
  isHalfFilled,
  isInvalid,
  isOutOfBounds,
  isRejected,
  joinHalves,
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

const bounds = { min: dt("2026-10-01T09:00"), max: dt("2026-10-05T17:30") };

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

describe("serialiseDateTime", () => {
  it("writes the date and the hour and minute in ISO 8601", () => {
    expect(serialiseDateTime(dt("2026-10-01T14:30"))).toBe("2026-10-01T14:30");
  });

  it("adds the second only when it is non-zero, as the time half writes its own time", () => {
    expect(serialiseDateTime(dt("2026-10-01T14:30:05"))).toBe("2026-10-01T14:30:05");
    expect(serialiseDateTime(LocalDateTime.of(d("2026-10-01"), LocalTime.of(14, 30, 0)))).toBe("2026-10-01T14:30");
  });

  it("writes nothing without a value", () => {
    expect(serialiseDateTime(undefined)).toBe("");
  });
});
