import { type IsoWeekday, LocalDate } from "@vipengele/ts";

/**
 * The pure model behind `Calendar`: the month grid, the weekday header order, keyboard moves,
 * bounds and the tab stop. Every function here takes and returns `LocalDate`s and never throws
 * for a date `LocalDate` can hold, including at the edges of its 0001-01-01..9999-12-31 range.
 *
 * `min` and `max` are optional inclusive bounds, and `min` is assumed not to be after `max`.
 */

/** The earliest date `LocalDate` can hold. */
const FIRST_DATE = LocalDate.of(1, 1, 1);
/** The latest date `LocalDate` can hold. */
const LAST_DATE = LocalDate.of(9999, 12, 31);

/** A month grid always has this many rows, so the calendar's height does not jump between months. */
export const GRID_ROWS = 6;
const DAYS_PER_WEEK = 7;

/**
 * One visible month: `GRID_ROWS` weeks of seven cells, each the date it shows, or `undefined` for a
 * blank cell before the month's first day or after its last.
 */
export type MonthGrid = (LocalDate | undefined)[][];

/** The first day of `date`'s month. */
export function firstOfMonth(date: LocalDate): LocalDate {
  return LocalDate.of(date.year, date.month, 1);
}

/** How many days `date` lies after the first day of its week, in a week starting on `firstDayOfWeek`. */
function dayOfWeekIndex(date: LocalDate, firstDayOfWeek: IsoWeekday): number {
  return (date.dayOfWeek - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;
}

/**
 * The grid for the month `month` falls in, weeks starting on `firstDayOfWeek`. It always has
 * `GRID_ROWS` rows: a month spanning four or five weeks is followed by blank rows.
 */
export function monthGrid(month: LocalDate, firstDayOfWeek: IsoWeekday): MonthGrid {
  const first = firstOfMonth(month);
  const leading = dayOfWeekIndex(first, firstDayOfWeek);
  const length = first.lengthOfMonth;
  const rows: MonthGrid = [];
  for (let row = 0; row < GRID_ROWS; row += 1) {
    const cells: (LocalDate | undefined)[] = [];
    for (let column = 0; column < DAYS_PER_WEEK; column += 1) {
      const day = row * DAYS_PER_WEEK + column - leading + 1;
      cells.push(day >= 1 && day <= length ? LocalDate.of(first.year, first.month, day) : undefined);
    }
    rows.push(cells);
  }
  return rows;
}

/**
 * Monday-first weekday names (as `Locale#weekdayNames` returns them) reordered to start on
 * `firstDayOfWeek`. Returns a new array and leaves `mondayFirst` untouched.
 */
export function weekdaysFrom<T>(mondayFirst: readonly T[], firstDayOfWeek: IsoWeekday): T[] {
  const start = firstDayOfWeek - 1;
  return [...mondayFirst.slice(start), ...mondayFirst.slice(0, start)];
}

/** Whether `date` falls before `min` or after `max`. */
export function isOutOfRange(date: LocalDate, min?: LocalDate, max?: LocalDate): boolean {
  return (min !== undefined && LocalDate.compare(date, min) < 0) || (max !== undefined && LocalDate.compare(date, max) > 0);
}

/**
 * Whether `date` cannot be selected: it is out of range, or `isDateDisabled` reports it. A
 * disabled day stays focusable; this drives `aria-disabled` and selection only.
 */
export function isDayDisabled(
  date: LocalDate,
  min: LocalDate | undefined,
  max: LocalDate | undefined,
  isDateDisabled?: (date: LocalDate) => boolean,
): boolean {
  return isOutOfRange(date, min, max) || (isDateDisabled?.(date) ?? false);
}

/** `date`, or the bound it lies beyond. */
export function clampDate(date: LocalDate, min?: LocalDate, max?: LocalDate): LocalDate {
  if (min !== undefined && LocalDate.compare(date, min) < 0) return min;
  if (max !== undefined && LocalDate.compare(date, max) > 0) return max;
  return date;
}

/** `date` moved by `days`, or `undefined` when that leaves the range `LocalDate` can hold. */
function shiftDays(date: LocalDate, days: number): LocalDate | undefined {
  if (days > 0 && LocalDate.compare(date, LAST_DATE.minusDays(days)) > 0) return undefined;
  if (days < 0 && LocalDate.compare(date, FIRST_DATE.minusDays(days)) < 0) return undefined;
  return date.plusDays(days);
}

/**
 * `date` moved by `months`, its day clamped to the target month's length, or `undefined` when the
 * target month is outside the range `LocalDate` can hold.
 */
function shiftMonths(date: LocalDate, months: number): LocalDate | undefined {
  const target = date.year * 12 + (date.month - 1) + months;
  if (target < FIRST_DATE.year * 12 || target > LAST_DATE.year * 12 + 11) return undefined;
  return date.plusMonths(months);
}

/**
 * Applies the bounds to a day or week move: a move from inside the bounds to outside them is
 * refused and focus stays on `from`. A move starting outside the bounds is free, since an
 * out-of-range day is still a focus stop.
 */
function keepInRange(from: LocalDate, to: LocalDate, min: LocalDate | undefined, max: LocalDate | undefined): LocalDate {
  return isOutOfRange(to, min, max) && !isOutOfRange(from, min, max) ? from : to;
}

/**
 * The day `days` days from `date`: ±1 for the left and right arrows, ±7 for up and down. Returns
 * `date` itself when the move would leave the bounds or the range `LocalDate` can hold.
 */
export function moveByDays(date: LocalDate, days: number, min?: LocalDate, max?: LocalDate): LocalDate {
  const target = shiftDays(date, days);
  return target === undefined ? date : keepInRange(date, target, min, max);
}

/**
 * The first day of `date`'s week, weeks starting on `firstDayOfWeek` (Home). The week is cut at the
 * earliest date `LocalDate` holds, and at `min` when `date` is in range.
 */
export function moveToStartOfWeek(date: LocalDate, firstDayOfWeek: IsoWeekday, min?: LocalDate, max?: LocalDate): LocalDate {
  const target = shiftDays(date, -dayOfWeekIndex(date, firstDayOfWeek)) ?? FIRST_DATE;
  return isOutOfRange(date, min, max) ? target : clampDate(target, min, max);
}

/**
 * The last day of `date`'s week, weeks starting on `firstDayOfWeek` (End). The week is cut at the
 * latest date `LocalDate` holds, and at `max` when `date` is in range.
 */
export function moveToEndOfWeek(date: LocalDate, firstDayOfWeek: IsoWeekday, min?: LocalDate, max?: LocalDate): LocalDate {
  const target = shiftDays(date, DAYS_PER_WEEK - 1 - dayOfWeekIndex(date, firstDayOfWeek)) ?? LAST_DATE;
  return isOutOfRange(date, min, max) ? target : clampDate(target, min, max);
}

/**
 * The same day `months` months from `date`, clamped to the target month's length and then to the
 * bounds, so a page past `min` or `max` lands on that bound. Returns `date` itself when the target
 * month is outside the range `LocalDate` can hold.
 */
export function moveByMonths(date: LocalDate, months: number, min?: LocalDate, max?: LocalDate): LocalDate {
  const target = shiftMonths(date, months);
  return target === undefined ? date : clampDate(target, min, max);
}

/**
 * The same day `years` years from `date`, moved as `12 * years` months: 29 February lands on 28
 * February in a common year. Clamped and guarded as `moveByMonths` is.
 */
export function moveByYears(date: LocalDate, years: number, min?: LocalDate, max?: LocalDate): LocalDate {
  return moveByMonths(date, years * 12, min, max);
}

/**
 * Whether the month before the one `visibleMonth` falls in can be shown: it exists in the range
 * `LocalDate` holds and at least its last day is not before `min`.
 */
export function canGoToPreviousMonth(visibleMonth: LocalDate, min?: LocalDate): boolean {
  const first = firstOfMonth(visibleMonth);
  if (first.equals(FIRST_DATE)) return false;
  return min === undefined || LocalDate.compare(firstOfMonth(min), first) < 0;
}

/**
 * Whether the month after the one `visibleMonth` falls in can be shown: it exists in the range
 * `LocalDate` holds and at least its first day is not after `max`.
 */
export function canGoToNextMonth(visibleMonth: LocalDate, max?: LocalDate): boolean {
  const first = firstOfMonth(visibleMonth);
  if (first.year === LAST_DATE.year && first.month === LAST_DATE.month) return false;
  return max === undefined || LocalDate.compare(firstOfMonth(max), first) > 0;
}

/** What `tabStop` chooses the visible month's focusable day from. */
export interface TabStopOptions {
  /** Any day of the visible month. */
  visibleMonth: LocalDate;
  selected: LocalDate | undefined;
  today: LocalDate;
  min: LocalDate | undefined;
  max: LocalDate | undefined;
  isDateDisabled?: ((date: LocalDate) => boolean) | undefined;
}

function inMonth(date: LocalDate, month: LocalDate): boolean {
  return date.year === month.year && date.month === month.month;
}

/**
 * The visible month's one day with `tabIndex={0}`: the selected day when it is in the visible
 * month, else today when it is, else the month's first enabled day, else its first day when every
 * day is disabled. The selected day and today win even when disabled, since a disabled day stays
 * focusable.
 */
export function tabStop({ visibleMonth, selected, today, min, max, isDateDisabled }: TabStopOptions): LocalDate {
  if (selected !== undefined && inMonth(selected, visibleMonth)) return selected;
  if (inMonth(today, visibleMonth)) return today;
  const first = firstOfMonth(visibleMonth);
  for (let day = 1; day <= first.lengthOfMonth; day += 1) {
    const date = LocalDate.of(first.year, first.month, day);
    if (!isDayDisabled(date, min, max, isDateDisabled)) return date;
  }
  return first;
}
