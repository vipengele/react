import type { IsoWeekday, LocalDate } from "@vipengele/ts";
import { type KeyboardEvent, type RefObject, useLayoutEffect, useRef, useState } from "react";
import { firstOfMonth, moveByDays, moveByMonths, moveByYears, moveToEndOfWeek, moveToStartOfWeek, tabStop } from "./calendarGrid.js";

interface CalendarFocusOptions {
  /** The first day of the visible month. */
  visibleMonth: LocalDate;
  setMonth: (month: LocalDate) => void;
  /** The day the selection puts the tab stop on while it is visible; see `tabStop`. */
  anchor: LocalDate | undefined;
  today: LocalDate;
  min: LocalDate | undefined;
  max: LocalDate | undefined;
  isDateDisabled: ((date: LocalDate) => boolean) | undefined;
  firstDayOfWeek: IsoWeekday;
  /** Picks a day, for Enter and Space. */
  pick: (date: LocalDate) => void;
  autoFocus: boolean;
}

export interface CalendarFocus {
  /** The day with `tabIndex={0}`. */
  active: LocalDate;
  /** Each mounted day's cell, by `LocalDate.toString()`, which DOM focus moves through. */
  cellsRef: RefObject<Map<string, HTMLElement>>;
  /** Records the day DOM focus landed on as the tab stop. */
  setFocusedDate: (date: LocalDate) => void;
  /** A day cell's key handler: the keymap's moves, and Enter and Space to pick. */
  handleDayKeyDown: (event: KeyboardEvent<HTMLElement>, date: LocalDate) => void;
}

/** A day DOM focus is headed for in a month that was not rendered when the move was asked for. */
interface PendingFocus {
  date: LocalDate;
  /** The day the move started from, which keeps the tab stop when the month never changes. */
  from: LocalDate;
  /** Whether DOM focus was on the grid when the move was asked for. */
  focus: boolean;
}

function sameMonth(a: LocalDate, b: LocalDate): boolean {
  return a.year === b.year && a.month === b.month;
}

/**
 * The day a key moves to from `from`, or `undefined` for a key the grid does not handle. Paging
 * and the week moves clamp to the bounds; Shift with Page Up or Page Down moves a year.
 */
function keyTarget(
  event: KeyboardEvent,
  from: LocalDate,
  firstDayOfWeek: IsoWeekday,
  min: LocalDate | undefined,
  max: LocalDate | undefined,
): LocalDate | undefined {
  switch (event.key) {
    case "ArrowLeft":
      return moveByDays(from, -1, min, max);
    case "ArrowRight":
      return moveByDays(from, 1, min, max);
    case "ArrowUp":
      return moveByDays(from, -7, min, max);
    case "ArrowDown":
      return moveByDays(from, 7, min, max);
    case "Home":
      return moveToStartOfWeek(from, firstDayOfWeek, min, max);
    case "End":
      return moveToEndOfWeek(from, firstDayOfWeek, min, max);
    case "PageUp":
      return event.shiftKey ? moveByYears(from, -1, min, max) : moveByMonths(from, -1, min, max);
    case "PageDown":
      return event.shiftKey ? moveByYears(from, 1, min, max) : moveByMonths(from, 1, min, max);
    default:
      return undefined;
  }
}

/**
 * The grid's roving tab stop and keymap: which day is tabbable, moving DOM focus between days,
 * following a move into another month once that month renders, and `autoFocus` on mount.
 */
export function useCalendarFocus({
  visibleMonth,
  setMonth,
  anchor,
  today,
  min,
  max,
  isDateDisabled,
  firstDayOfWeek,
  pick,
  autoFocus,
}: CalendarFocusOptions): CalendarFocus {
  /** The day the user last focused, which holds the tab stop while its month is visible. */
  const [focusedDate, setFocusedDate] = useState<LocalDate | undefined>(undefined);
  const cellsRef = useRef(new Map<string, HTMLElement>());
  const pendingFocusRef = useRef<PendingFocus | undefined>(undefined);
  const autoFocusRef = useRef(autoFocus);

  const active =
    focusedDate !== undefined && sameMonth(focusedDate, visibleMonth)
      ? focusedDate
      : tabStop({ visibleMonth, anchor, today, min, max, isDateDisabled });

  // A move into another month is requested before that month renders, so this is the commit that
  // can reach its target. When the month never changed — a controlled `month` that ignored
  // `onMonthChange` — the target is not rendered: DOM focus is left where it is, and the tab stop
  // goes back to the day the move started from.
  useLayoutEffect(() => {
    const pending = pendingFocusRef.current;
    if (pending === undefined) return;
    pendingFocusRef.current = undefined;
    const cell = cellsRef.current.get(pending.date.toString());
    if (cell === undefined) {
      setFocusedDate(pending.from);
      return;
    }
    if (pending.focus) cell.focus();
  });

  // `autoFocus` acts once, on mount, as it does on a native element: the ref is cleared on the
  // first run, so a later tab-stop change focuses nothing.
  const activeKey = active.toString();
  useLayoutEffect(() => {
    if (!autoFocusRef.current) return;
    autoFocusRef.current = false;
    (cellsRef.current.get(activeKey) as HTMLElement).focus();
  }, [activeKey]);

  // DOM focus follows the move only when it is on the grid already, so a synthesised key never
  // takes focus from elsewhere on the page. Setting the focused day also guarantees the commit the
  // pending-focus layout effect runs in, even when a controlled `month` does not change.
  function moveFocus(from: LocalDate, to: LocalDate, focusInside: boolean) {
    setFocusedDate(to);
    if (sameMonth(to, visibleMonth)) {
      if (focusInside) (cellsRef.current.get(to.toString()) as HTMLElement).focus();
      return;
    }
    pendingFocusRef.current = { date: to, from, focus: focusInside };
    setMonth(firstOfMonth(to));
  }

  function handleDayKeyDown(event: KeyboardEvent<HTMLElement>, date: LocalDate) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(date);
      return;
    }
    const target = keyTarget(event, date, firstDayOfWeek, min, max);
    if (target === undefined) return;
    event.preventDefault();
    moveFocus(date, target, event.currentTarget === event.currentTarget.ownerDocument.activeElement);
  }

  return { active, cellsRef, setFocusedDate, handleDayKeyDown };
}
