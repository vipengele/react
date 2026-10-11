import { ChevronLeft, ChevronRight } from "@vipengele/react-icons";
import { useLocale } from "@vipengele/react-tokens";
import { type IsoWeekday, type Locale, LocalDate } from "@vipengele/ts";
import { type ComponentPropsWithRef, type KeyboardEvent, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useControllableState } from "../internal/useControllableState.js";
import { calendarStylesheet } from "./Calendar.stylesheet.js";
import {
  canGoToNextMonth,
  canGoToPreviousMonth,
  firstOfMonth,
  isDayDisabled,
  monthGrid,
  moveByDays,
  moveByMonths,
  moveByYears,
  moveToEndOfWeek,
  moveToStartOfWeek,
  tabStop,
  weekdaysFrom,
} from "./calendarGrid.js";

export interface CalendarProps extends Omit<ComponentPropsWithRef<"div">, "children" | "defaultValue" | "onChange"> {
  /** The controlled selected day. Passing the prop at all makes the selection controlled, so
   * `value={undefined}` is a controlled calendar with nothing selected. */
  value?: LocalDate;
  /** The initially selected day of an uncontrolled calendar. Absent, nothing is selected. */
  defaultValue?: LocalDate;
  /** Called with the day the user selected, or `undefined` when Clear empties the selection. */
  onChange?: (value: LocalDate | undefined) => void;
  /** The controlled visible month; any day of it will do. Pair it with `onMonthChange`. */
  month?: LocalDate;
  /** The initially visible month of an uncontrolled calendar; any day of it will do. Defaults to
   * the selected day's month, else today's. */
  defaultMonth?: LocalDate;
  /** Called with the first day of the month the user moved to, by a month button or a key. */
  onMonthChange?: (month: LocalDate) => void;
  /** The locale month and weekday names, day labels and the first day of the week come from.
   * Defaults to the nearest `LocaleProvider`'s, then the runtime's own. */
  locale?: Locale;
  /** The day marked as today. Defaults to `LocalDate.now()`. */
  today?: LocalDate;
  /** The earliest selectable day, inclusive. */
  min?: LocalDate;
  /** The latest selectable day, inclusive. */
  max?: LocalDate;
  /** Reports a day that cannot be selected. A disabled day stays focusable, so arrow keys pass
   * through it. */
  isDateDisabled?: (date: LocalDate) => boolean;
  /** Renders a Clear button below the grid that empties the selection. */
  clearable?: boolean;
  /** The Clear button's text. Defaults to `"Clear"`. */
  clearLabel?: string;
  /** The previous-month button's accessible name. Defaults to `"Previous month"`. */
  previousMonthLabel?: string;
  /** The next-month button's accessible name. Defaults to `"Next month"`. */
  nextMonthLabel?: string;
  /** Focuses the grid's tab-stop day on mount. */
  autoFocus?: boolean;
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
 * A month grid for picking one day: a `role="grid"` labelled by the visible month's heading, its
 * weekday column headers in the locale's order from its first day of the week, and six weeks of
 * days, so its height never changes between months. Days before the month's first and after its
 * last are inert, `aria-hidden` blanks.
 *
 * The grid is one tab stop with a roving tabindex: the day the user last focused while its month
 * is visible, else the selected day, else today, else the month's first enabled day. Arrows move a
 * day or a week, Home and End to the ends of the week, Page Up and Page Down a month and, with
 * Shift, a year; Enter and Space select. A move into another month changes the visible month and
 * follows it with DOM focus, only if focus was on the grid; a controlled `month` that ignores
 * `onMonthChange` keeps the month, and focus stays where it was.
 *
 * A day outside `min`..`max` or reported by `isDateDisabled` is `aria-disabled`: still focusable,
 * never selected. Selecting the selected day again keeps it. The selection is controlled exactly
 * when `value` is passed; the visible month is controlled when `month` is, and is never derived
 * from `value` after the first render, so clearing keeps the month in view.
 *
 * The previous- and next-month buttons are `aria-disabled` rather than natively disabled at the
 * months of `min` and `max`, so a button stepped to its bound keeps focus. `clearable` adds a Clear
 * button that is `aria-disabled` the same way while nothing is selected, so pressing it keeps focus
 * where it is and the footer keeps its height.
 * The component opens nothing and handles no Escape. `ref` and any other native attribute land on
 * the root `<div>`.
 */
export function Calendar(props: CalendarProps) {
  const {
    value,
    defaultValue,
    onChange,
    month,
    defaultMonth,
    onMonthChange,
    locale: localeProp,
    today: todayProp,
    min,
    max,
    isDateDisabled,
    clearable = false,
    clearLabel = "Clear",
    previousMonthLabel = "Previous month",
    nextMonthLabel = "Next month",
    // Kept out of `rest`: React focuses a host element given `autoFocus` on mount, which here would
    // be the root `div` rather than the tab-stop day.
    autoFocus = false,
    className,
    ...rest
  } = props;

  // A controlled selection is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled calendar spells "nothing selected".
  const isControlled = "value" in props;
  const [uncontrolledValue, setUncontrolledValue] = useState<LocalDate | undefined>(defaultValue);
  const selected = isControlled ? value : uncontrolledValue;

  const locale = useLocale(localeProp);
  const today = todayProp ?? LocalDate.now();
  const firstDayOfWeek = locale.firstDayOfWeek;

  const [rawMonth, setMonth] = useControllableState(month, () => firstOfMonth(defaultMonth ?? selected ?? today), onMonthChange);
  const visibleMonth = firstOfMonth(rawMonth);

  // `Locale`'s name lists are fresh arrays on every call; the resolved locale is stable.
  const monthNames = useMemo(() => locale.monthNames("long"), [locale]);
  const weekdays = useMemo(() => {
    const long = weekdaysFrom(locale.weekdayNames("long"), locale.firstDayOfWeek);
    const short = weekdaysFrom(locale.weekdayNames("short"), locale.firstDayOfWeek);
    return long.map((name, index) => ({ long: name, short: short[index] }));
  }, [locale]);

  /** The day the user last focused, which holds the tab stop while its month is visible. */
  const [focusedDate, setFocusedDate] = useState<LocalDate | undefined>(undefined);
  const cellsRef = useRef(new Map<string, HTMLElement>());
  const pendingFocusRef = useRef<PendingFocus | undefined>(undefined);
  const autoFocusRef = useRef(autoFocus);
  const headingId = useId();

  const active =
    focusedDate !== undefined && sameMonth(focusedDate, visibleMonth)
      ? focusedDate
      : tabStop({ visibleMonth, selected, today, min, max, isDateDisabled });

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

  function select(date: LocalDate) {
    if (isDayDisabled(date, min, max, isDateDisabled) || selected?.equals(date)) return;
    if (!isControlled) setUncontrolledValue(date);
    onChange?.(date);
  }

  // The button stays focusable while nothing is selected, so a press then has to be refused here.
  function clear() {
    if (selected === undefined) return;
    if (!isControlled) setUncontrolledValue(undefined);
    onChange?.(undefined);
  }

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
      select(date);
      return;
    }
    const target = keyTarget(event, date, firstDayOfWeek, min, max);
    if (target === undefined) return;
    event.preventDefault();
    moveFocus(date, target, event.currentTarget === event.currentTarget.ownerDocument.activeElement);
  }

  // The month buttons stay focusable at a bound, as Clear does while nothing is selected: a natively
  // disabled button drops the focus it holds to `body`, so a keyboard user stepping to `max` would
  // lose their place. A press at a bound is refused here instead.
  const hasPreviousMonth = canGoToPreviousMonth(visibleMonth, min);
  const hasNextMonth = canGoToNextMonth(visibleMonth, max);

  const weeks = monthGrid(visibleMonth, firstDayOfWeek).map((week, row) => ({
    key: `week-${row}`,
    blank: week.every((date) => date === undefined),
    cells: week.map((date, column) => ({ key: date?.toString() ?? `blank-${row}-${column}`, date })),
  }));

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N calendars on a page inject one
        stylesheet.
      */}
      <style href="vpg-calendar" precedence="vpg-calendar">
        {calendarStylesheet}
      </style>
      <div {...rest} className={["vpg-calendar", className].filter(Boolean).join(" ")}>
        <div className="vpg-calendar-header">
          <button
            type="button"
            className="vpg-calendar-nav"
            aria-label={previousMonthLabel}
            aria-disabled={!hasPreviousMonth || undefined}
            onClick={() => {
              if (hasPreviousMonth) setMonth(visibleMonth.minusMonths(1));
            }}
          >
            <ChevronLeft className="vpg-calendar-nav-icon" aria-hidden="true" />
          </button>
          <div id={headingId} className="vpg-calendar-heading" aria-live="polite">
            {`${monthNames[visibleMonth.month - 1]} ${visibleMonth.year}`}
          </div>
          <button
            type="button"
            className="vpg-calendar-nav"
            aria-label={nextMonthLabel}
            aria-disabled={!hasNextMonth || undefined}
            onClick={() => {
              if (hasNextMonth) setMonth(visibleMonth.plusMonths(1));
            }}
          >
            <ChevronRight className="vpg-calendar-nav-icon" aria-hidden="true" />
          </button>
        </div>
        {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the grid pattern on a table keeps the row and column semantics a screen reader announces a day's weekday by */}
        <table role="grid" className="vpg-calendar-grid" aria-labelledby={headingId}>
          <thead>
            <tr>
              {weekdays.map((weekday) => (
                <th key={weekday.long} scope="col" className="vpg-calendar-weekday" aria-label={weekday.long}>
                  {weekday.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => (
              <tr key={week.key} aria-hidden={week.blank || undefined}>
                {week.cells.map(({ key, date }) => {
                  if (date === undefined) return <td key={key} className="vpg-calendar-blank" aria-hidden="true" />;
                  return (
                    <td
                      key={key}
                      ref={(node) => {
                        cellsRef.current.set(key, node as HTMLElement);
                        return () => {
                          cellsRef.current.delete(key);
                        };
                      }}
                      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: a day is a grid's focusable, selectable cell, which a plain table's cell is not
                      role="gridcell"
                      className="vpg-calendar-day"
                      tabIndex={date.equals(active) ? 0 : -1}
                      aria-label={date.format(locale)}
                      aria-selected={selected?.equals(date) || undefined}
                      aria-current={date.equals(today) ? "date" : undefined}
                      aria-disabled={isDayDisabled(date, min, max, isDateDisabled) || undefined}
                      onClick={() => select(date)}
                      onFocus={() => setFocusedDate(date)}
                      onKeyDown={(event) => handleDayKeyDown(event, date)}
                    >
                      {date.day}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {clearable ? (
          <div className="vpg-calendar-footer">
            <button type="button" className="vpg-calendar-clear" aria-disabled={selected === undefined || undefined} onClick={clear}>
              {clearLabel}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
