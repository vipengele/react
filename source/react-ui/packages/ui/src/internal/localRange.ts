import { LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";

/** A closed span between two local values of one type; `start` is not after `end` once ordered. */
export type LocalRange<T> = { readonly start: T; readonly end: T };

export type DateRange = LocalRange<LocalDate>;
export type TimeRange = LocalRange<LocalTime>;
export type DateTimeRange = LocalRange<LocalDateTime>;

/** True when `start` is not after `end`; a range whose ends are equal is ordered. */
export function isOrdered(range: DateRange | TimeRange | DateTimeRange): boolean {
  const { start, end } = range;
  if (start instanceof LocalDate) return LocalDate.compare(start, end as LocalDate) <= 0;
  if (start instanceof LocalTime) return LocalTime.compare(start, end as LocalTime) <= 0;
  return LocalDateTime.compare(start as LocalDateTime, end as LocalDateTime) <= 0;
}
