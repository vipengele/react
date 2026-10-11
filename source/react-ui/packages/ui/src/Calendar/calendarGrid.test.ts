import { LocalDate, Locale } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import {
  canGoToNextMonth,
  canGoToPreviousMonth,
  clampDate,
  firstOfMonth,
  GRID_ROWS,
  isDayDisabled,
  isOutOfRange,
  type MonthGrid,
  monthGrid,
  moveByDays,
  moveByMonths,
  moveByYears,
  moveToEndOfWeek,
  moveToStartOfWeek,
  tabStop,
  weekdaysFrom,
} from "./calendarGrid";

const sundayFirst = new Locale("en-US");
const mondayFirst = new Locale("de-DE");

function d(iso: string): LocalDate {
  return LocalDate.parse(iso);
}

/** Each cell as its day of the month, `0` for a blank cell. */
function days(grid: MonthGrid): number[][] {
  return grid.map((row) => row.map((cell) => cell?.day ?? 0));
}

/** How many rows hold at least one day of the month. */
function weeksUsed(grid: MonthGrid): number {
  return grid.filter((row) => row.some((cell) => cell !== undefined)).length;
}

describe("the locales under test", () => {
  it("start the week on Sunday in en-US and Monday in de-DE", () => {
    expect(sundayFirst.firstDayOfWeek).toBe(7);
    expect(mondayFirst.firstDayOfWeek).toBe(1);
  });
});

describe("firstOfMonth", () => {
  it("returns the first day of the date's month", () => {
    expect(firstOfMonth(d("2026-10-17")).toString()).toBe("2026-10-01");
  });
});

describe("monthGrid", () => {
  it("always has six rows of seven cells", () => {
    for (const month of ["2015-02-01", "2026-10-01", "2020-03-01"]) {
      const grid = monthGrid(d(month), mondayFirst.firstDayOfWeek);
      expect(grid).toHaveLength(GRID_ROWS);
      for (const row of grid) expect(row).toHaveLength(7);
    }
  });

  it("lays a month out from the locale's first day of the week, blank outside the month", () => {
    expect(days(monthGrid(d("2026-10-17"), sundayFirst.firstDayOfWeek))).toEqual([
      [0, 0, 0, 0, 1, 2, 3],
      [4, 5, 6, 7, 8, 9, 10],
      [11, 12, 13, 14, 15, 16, 17],
      [18, 19, 20, 21, 22, 23, 24],
      [25, 26, 27, 28, 29, 30, 31],
      [0, 0, 0, 0, 0, 0, 0],
    ]);
    expect(days(monthGrid(d("2026-10-17"), mondayFirst.firstDayOfWeek))).toEqual([
      [0, 0, 0, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, 31, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ]);
  });

  it("fills each cell with the date of that month", () => {
    const grid = monthGrid(d("2026-10-17"), sundayFirst.firstDayOfWeek);
    expect(grid[0]?.[4]?.toString()).toBe("2026-10-01");
    expect(grid[4]?.[6]?.toString()).toBe("2026-10-31");
  });

  it("puts each date in the column of its weekday", () => {
    const grid = monthGrid(d("2026-10-01"), mondayFirst.firstDayOfWeek);
    for (const row of grid) {
      row.forEach((cell, column) => {
        if (cell !== undefined) expect(cell.dayOfWeek).toBe(column + 1);
      });
    }
  });

  it("uses four, five or six rows of days, depending on the month and the first day of the week", () => {
    // February 2015 starts on a Sunday and has 28 days.
    expect(weeksUsed(monthGrid(d("2015-02-01"), sundayFirst.firstDayOfWeek))).toBe(4);
    expect(weeksUsed(monthGrid(d("2015-02-01"), mondayFirst.firstDayOfWeek))).toBe(5);
    // March 2020 starts on a Sunday and has 31 days.
    expect(weeksUsed(monthGrid(d("2020-03-01"), sundayFirst.firstDayOfWeek))).toBe(5);
    expect(weeksUsed(monthGrid(d("2020-03-01"), mondayFirst.firstDayOfWeek))).toBe(6);
  });

  it("lays out the first and last months LocalDate can hold", () => {
    const first = monthGrid(d("0001-01-01"), sundayFirst.firstDayOfWeek);
    expect(first[0]?.[0]).toBeUndefined();
    expect(first[0]?.[1]?.toString()).toBe("0001-01-01");
    const last = monthGrid(d("9999-12-31"), mondayFirst.firstDayOfWeek);
    expect(
      last
        .flat()
        .filter((cell) => cell !== undefined)
        .at(-1)
        ?.toString(),
    ).toBe("9999-12-31");
  });
});

describe("weekdaysFrom", () => {
  it("keeps Monday-first names in order for a Monday-first locale", () => {
    const names = mondayFirst.weekdayNames("short");
    expect(weekdaysFrom(names, mondayFirst.firstDayOfWeek)).toEqual(names);
  });

  it("rotates Monday-first names to start on Sunday for a Sunday-first locale", () => {
    expect(weekdaysFrom(sundayFirst.weekdayNames("short"), sundayFirst.firstDayOfWeek)).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
  });

  it("returns a new array and leaves the input untouched", () => {
    const names = ["M", "T", "W", "T", "F", "S", "S"];
    const rotated = weekdaysFrom(names, 6);
    expect(rotated).toEqual(["S", "S", "M", "T", "W", "T", "F"]);
    expect(names).toEqual(["M", "T", "W", "T", "F", "S", "S"]);
    expect(weekdaysFrom(names, 1)).not.toBe(names);
  });
});

describe("the range check", () => {
  const min = d("2026-10-05");
  const max = d("2026-10-25");

  it("is false for any date without bounds", () => {
    expect(isOutOfRange(d("0001-01-01"))).toBe(false);
  });

  it("is true before min and after max, and false on either bound", () => {
    expect(isOutOfRange(d("2026-10-04"), min, max)).toBe(true);
    expect(isOutOfRange(d("2026-10-05"), min, max)).toBe(false);
    expect(isOutOfRange(d("2026-10-25"), min, max)).toBe(false);
    expect(isOutOfRange(d("2026-10-26"), min, max)).toBe(true);
  });

  it("reads each bound on its own", () => {
    expect(isOutOfRange(d("2026-10-04"), min)).toBe(true);
    expect(isOutOfRange(d("9999-12-31"), min)).toBe(false);
    expect(isOutOfRange(d("2026-10-26"), undefined, max)).toBe(true);
    expect(isOutOfRange(d("0001-01-01"), undefined, max)).toBe(false);
  });
});

describe("isDayDisabled", () => {
  const weekends = (date: LocalDate) => date.dayOfWeek >= 6;

  it("is false for an in-range day without a predicate", () => {
    expect(isDayDisabled(d("2026-10-10"), undefined, undefined)).toBe(false);
  });

  it("is true for an out-of-range day", () => {
    expect(isDayDisabled(d("2026-10-10"), d("2026-10-11"), undefined)).toBe(true);
  });

  it("is true for a day the predicate disables, and false for one it allows", () => {
    expect(isDayDisabled(d("2026-10-10"), undefined, undefined, weekends)).toBe(true);
    expect(isDayDisabled(d("2026-10-12"), undefined, undefined, weekends)).toBe(false);
  });
});

describe("clampDate", () => {
  const min = d("2026-10-05");
  const max = d("2026-10-25");

  it("returns a date within the bounds unchanged", () => {
    const date = d("2026-10-10");
    expect(clampDate(date, min, max)).toBe(date);
    expect(clampDate(date)).toBe(date);
  });

  it("returns the bound a date lies beyond", () => {
    expect(clampDate(d("2026-01-01"), min, max)).toBe(min);
    expect(clampDate(d("2027-01-01"), min, max)).toBe(max);
  });
});

describe("moveByDays", () => {
  it("moves by a day and by a week in either direction", () => {
    const date = d("2026-10-31");
    expect(moveByDays(date, 1).toString()).toBe("2026-11-01");
    expect(moveByDays(date, -1).toString()).toBe("2026-10-30");
    expect(moveByDays(date, 7).toString()).toBe("2026-11-07");
    expect(moveByDays(date, -7).toString()).toBe("2026-10-24");
  });

  it("stays put at the first and last dates LocalDate can hold", () => {
    expect(moveByDays(d("0001-01-01"), -1).toString()).toBe("0001-01-01");
    expect(moveByDays(d("0001-01-06"), -7).toString()).toBe("0001-01-06");
    expect(moveByDays(d("9999-12-31"), 1).toString()).toBe("9999-12-31");
    expect(moveByDays(d("9999-12-26"), 7).toString()).toBe("9999-12-26");
  });

  it("reaches the first and last dates LocalDate can hold", () => {
    expect(moveByDays(d("0001-01-08"), -7).toString()).toBe("0001-01-01");
    expect(moveByDays(d("9999-12-24"), 7).toString()).toBe("9999-12-31");
  });

  it("stays put rather than leave the bounds", () => {
    const min = d("2026-10-05");
    const max = d("2026-10-25");
    expect(moveByDays(d("2026-10-05"), -1, min, max).toString()).toBe("2026-10-05");
    expect(moveByDays(d("2026-10-08"), -7, min, max).toString()).toBe("2026-10-08");
    expect(moveByDays(d("2026-10-25"), 1, min, max).toString()).toBe("2026-10-25");
    expect(moveByDays(d("2026-10-20"), 7, min, max).toString()).toBe("2026-10-20");
    expect(moveByDays(d("2026-10-12"), -7, min, max).toString()).toBe("2026-10-05");
  });

  it("moves freely from a day already outside the bounds", () => {
    const min = d("2026-10-05");
    expect(moveByDays(d("2026-10-02"), -1, min).toString()).toBe("2026-10-01");
    expect(moveByDays(d("2026-10-02"), 7, min).toString()).toBe("2026-10-09");
  });
});

describe("the Home and End moves", () => {
  // 2026-10-14 is a Wednesday.
  const wednesday = d("2026-10-14");

  it("move to the ends of the week in a Sunday-first locale", () => {
    expect(moveToStartOfWeek(wednesday, sundayFirst.firstDayOfWeek).toString()).toBe("2026-10-11");
    expect(moveToEndOfWeek(wednesday, sundayFirst.firstDayOfWeek).toString()).toBe("2026-10-17");
  });

  it("move to the ends of the week in a Monday-first locale", () => {
    expect(moveToStartOfWeek(wednesday, mondayFirst.firstDayOfWeek).toString()).toBe("2026-10-12");
    expect(moveToEndOfWeek(wednesday, mondayFirst.firstDayOfWeek).toString()).toBe("2026-10-18");
  });

  it("stay put on a day already at that end of the week", () => {
    expect(moveToStartOfWeek(d("2026-10-11"), sundayFirst.firstDayOfWeek).toString()).toBe("2026-10-11");
    expect(moveToEndOfWeek(d("2026-10-18"), mondayFirst.firstDayOfWeek).toString()).toBe("2026-10-18");
  });

  it("cut the week at the first and last dates LocalDate can hold", () => {
    // 0001-01-01 is a Monday, so its Sunday-first week starts the day before it.
    expect(moveToStartOfWeek(d("0001-01-03"), sundayFirst.firstDayOfWeek).toString()).toBe("0001-01-01");
    // 9999-12-31 is a Friday, so its Monday-first week ends two days after it.
    expect(moveToEndOfWeek(d("9999-12-30"), mondayFirst.firstDayOfWeek).toString()).toBe("9999-12-31");
  });

  it("cut the week at min and max", () => {
    const min = d("2026-10-13");
    const max = d("2026-10-15");
    expect(moveToStartOfWeek(wednesday, mondayFirst.firstDayOfWeek, min, max).toString()).toBe("2026-10-13");
    expect(moveToEndOfWeek(wednesday, mondayFirst.firstDayOfWeek, min, max).toString()).toBe("2026-10-15");
  });

  it("ignore the bounds from a day already outside them", () => {
    const min = d("2026-10-20");
    expect(moveToStartOfWeek(wednesday, mondayFirst.firstDayOfWeek, min).toString()).toBe("2026-10-12");
    expect(moveToEndOfWeek(wednesday, mondayFirst.firstDayOfWeek, min).toString()).toBe("2026-10-18");
  });
});

describe("moveByMonths", () => {
  it("moves to the same day of the next and previous month", () => {
    expect(moveByMonths(d("2026-10-14"), 1).toString()).toBe("2026-11-14");
    expect(moveByMonths(d("2026-10-14"), -1).toString()).toBe("2026-09-14");
  });

  it("clamps the day to the length of the target month", () => {
    expect(moveByMonths(d("2026-10-31"), 1).toString()).toBe("2026-11-30");
    expect(moveByMonths(d("2024-03-31"), -1).toString()).toBe("2024-02-29");
  });

  it("stays put rather than leave the first or last month LocalDate can hold", () => {
    expect(moveByMonths(d("0001-01-15"), -1).toString()).toBe("0001-01-15");
    expect(moveByMonths(d("9999-12-15"), 1).toString()).toBe("9999-12-15");
  });

  it("reaches the first and last months LocalDate can hold", () => {
    expect(moveByMonths(d("0001-02-15"), -1).toString()).toBe("0001-01-15");
    expect(moveByMonths(d("9999-11-15"), 1).toString()).toBe("9999-12-15");
  });

  it("lands on min or max rather than page past it", () => {
    const min = d("2026-09-20");
    const max = d("2026-11-10");
    expect(moveByMonths(d("2026-10-14"), -1, min, max).toString()).toBe("2026-09-20");
    expect(moveByMonths(d("2026-10-14"), 1, min, max).toString()).toBe("2026-11-10");
    expect(moveByMonths(d("2026-10-05"), 1, min, max).toString()).toBe("2026-11-05");
  });
});

describe("moveByYears", () => {
  it("moves to the same day of the next and previous year", () => {
    expect(moveByYears(d("2026-10-14"), 1).toString()).toBe("2027-10-14");
    expect(moveByYears(d("2026-10-14"), -1).toString()).toBe("2025-10-14");
  });

  it("clamps 29 February to 28 February in a common year", () => {
    expect(moveByYears(d("2024-02-29"), 1).toString()).toBe("2025-02-28");
    expect(moveByYears(d("2024-02-29"), -1).toString()).toBe("2023-02-28");
    expect(moveByYears(d("2024-02-29"), 4).toString()).toBe("2028-02-29");
  });

  it("stays put rather than leave the first or last year LocalDate can hold", () => {
    expect(moveByYears(d("0001-12-31"), -1).toString()).toBe("0001-12-31");
    expect(moveByYears(d("9999-01-01"), 1).toString()).toBe("9999-01-01");
  });

  it("reaches the first and last years LocalDate can hold", () => {
    expect(moveByYears(d("0002-01-01"), -1).toString()).toBe("0001-01-01");
    expect(moveByYears(d("9998-12-31"), 1).toString()).toBe("9999-12-31");
  });

  it("lands on min or max rather than page past it", () => {
    const min = d("2026-03-01");
    const max = d("2027-06-30");
    expect(moveByYears(d("2026-10-14"), -1, min, max).toString()).toBe("2026-03-01");
    expect(moveByYears(d("2026-10-14"), 1, min, max).toString()).toBe("2027-06-30");
  });
});

describe("the previous-month button", () => {
  it("is true without a min, away from the first month LocalDate can hold", () => {
    expect(canGoToPreviousMonth(d("2026-10-14"))).toBe(true);
    expect(canGoToPreviousMonth(d("0001-02-01"))).toBe(true);
  });

  it("is false in the first month LocalDate can hold", () => {
    expect(canGoToPreviousMonth(d("0001-01-01"))).toBe(false);
    expect(canGoToPreviousMonth(d("0001-01-31"))).toBe(false);
  });

  it("is true while any day of the previous month is on or after min", () => {
    expect(canGoToPreviousMonth(d("2026-10-01"), d("2026-09-30"))).toBe(true);
  });

  it("is false when the whole previous month is before min", () => {
    expect(canGoToPreviousMonth(d("2026-10-31"), d("2026-10-01"))).toBe(false);
    expect(canGoToPreviousMonth(d("2026-10-01"), d("2026-10-20"))).toBe(false);
  });
});

describe("the next-month button", () => {
  it("is true without a max, away from the last month LocalDate can hold", () => {
    expect(canGoToNextMonth(d("2026-10-14"))).toBe(true);
    expect(canGoToNextMonth(d("9999-11-30"))).toBe(true);
    expect(canGoToNextMonth(d("9998-12-31"))).toBe(true);
  });

  it("is false in the last month LocalDate can hold", () => {
    expect(canGoToNextMonth(d("9999-12-01"))).toBe(false);
    expect(canGoToNextMonth(d("9999-12-31"))).toBe(false);
  });

  it("is true while any day of the next month is on or before max", () => {
    expect(canGoToNextMonth(d("2026-10-31"), d("2026-11-01"))).toBe(true);
  });

  it("is false when the whole next month is after max", () => {
    expect(canGoToNextMonth(d("2026-10-01"), d("2026-10-31"))).toBe(false);
    expect(canGoToNextMonth(d("2026-10-20"), d("2026-10-05"))).toBe(false);
  });
});

describe("tabStop", () => {
  const visibleMonth = d("2026-10-01");
  const base = { visibleMonth, selected: undefined, today: d("2026-12-25"), min: undefined, max: undefined };

  it("is the selected day when it is in the visible month", () => {
    expect(tabStop({ ...base, selected: d("2026-10-20"), today: d("2026-10-11") }).toString()).toBe("2026-10-20");
  });

  it("is the selected day even when it is disabled", () => {
    expect(tabStop({ ...base, selected: d("2026-10-20"), isDateDisabled: () => true }).toString()).toBe("2026-10-20");
  });

  it("is today when the selected day is in another month or absent", () => {
    expect(tabStop({ ...base, selected: d("2026-11-20"), today: d("2026-10-11") }).toString()).toBe("2026-10-11");
    expect(tabStop({ ...base, today: d("2026-10-11") }).toString()).toBe("2026-10-11");
  });

  it("does not take a selected day or today from the same month of another year", () => {
    expect(tabStop({ ...base, selected: d("2025-10-20"), today: d("2027-10-11") }).toString()).toBe("2026-10-01");
  });

  it("is the first day of the month when neither the selected day nor today is in it", () => {
    expect(tabStop(base).toString()).toBe("2026-10-01");
  });

  it("skips days before min and days the predicate disables", () => {
    const weekends = (date: LocalDate) => date.dayOfWeek >= 6;
    // 2026-10-03 and 2026-10-04 are a Saturday and Sunday.
    expect(tabStop({ ...base, min: d("2026-10-03"), isDateDisabled: weekends }).toString()).toBe("2026-10-05");
  });

  it("falls back to the first day of the month when every day is disabled", () => {
    expect(tabStop({ ...base, isDateDisabled: () => true }).toString()).toBe("2026-10-01");
    expect(tabStop({ ...base, max: d("2026-09-30") }).toString()).toBe("2026-10-01");
  });
});
