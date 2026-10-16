import { ChevronLeft, ChevronRight } from "@vipengele/react-icons";
import { useLocale } from "@vipengele/react-tokens";
import { type Locale, LocalDate } from "@vipengele/ts";
import { type ComponentPropsWithRef, type DOMAttributes, type ReactNode, useId, useMemo } from "react";
import { useControllableState } from "../internal/useControllableState.js";
import { calendarStylesheet } from "./Calendar.stylesheet.js";
import { canGoToNextMonth, canGoToPreviousMonth, firstOfMonth, isDayDisabled, monthGrid, weekdaysFrom } from "./calendarGrid.js";
import { type CalendarFocus, useCalendarFocus } from "./useCalendarFocus.js";

/**
 * What a selection says about one day cell: `aria-selected`, `data-*` attributes a stylesheet keys
 * selection styling from (a range's endpoints, the days inside it, a previewed span), and pointer
 * handlers. The core's own attributes and handlers win over these, so a selection can neither
 * rename a day nor take its focus, click or key handling.
 */
export interface CalendarDayMarks extends Pick<DOMAttributes<HTMLTableCellElement>, "onPointerEnter" | "onPointerLeave"> {
  "aria-selected"?: boolean | undefined;
  [attribute: `data-${string}`]: string | boolean | undefined;
}

export interface CalendarCoreProps extends Omit<ComponentPropsWithRef<"div">, "children"> {
  /** The day the selection puts the tab stop on while it is visible, and the initially visible
   * month when `defaultMonth` is absent. */
  tabStopAnchor: LocalDate | undefined;
  /** The selection's marks for one day of the visible month. */
  dayMarks: (date: LocalDate) => CalendarDayMarks;
  /** Called with a day the user picked by click, Enter or Space. A disabled day is never picked. */
  onPick: (date: LocalDate) => void;
  /** The controlled visible month; any day of it will do. Pair it with `onMonthChange`. */
  month?: LocalDate | undefined;
  /** The initially visible month of an uncontrolled grid; any day of it will do. Defaults to
   * `tabStopAnchor`'s month, else today's. */
  defaultMonth?: LocalDate | undefined;
  /** Called with the first day of the month the user moved to, by a month button or a key. */
  onMonthChange?: ((month: LocalDate) => void) | undefined;
  /** Defaults to the nearest `LocaleProvider`'s, then the runtime's own. */
  locale?: Locale | undefined;
  /** The day marked as today. Defaults to `LocalDate.now()`. */
  today?: LocalDate | undefined;
  /** The earliest pickable day, inclusive. */
  min?: LocalDate | undefined;
  /** The latest pickable day, inclusive. */
  max?: LocalDate | undefined;
  /** Reports a day that cannot be picked. A disabled day stays focusable. */
  isDateDisabled?: ((date: LocalDate) => boolean) | undefined;
  /** The previous-month button's accessible name. Defaults to `"Previous month"`. */
  previousMonthLabel?: string | undefined;
  /** The next-month button's accessible name. Defaults to `"Next month"`. */
  nextMonthLabel?: string | undefined;
  /** Focuses the grid's tab-stop day on mount. */
  autoFocus?: boolean | undefined;
  /** Rendered below the grid, inside the root. */
  footer?: ReactNode;
}

interface CalendarHeaderProps {
  /** The first day of the visible month. */
  visibleMonth: LocalDate;
  setMonth: (month: LocalDate) => void;
  min: LocalDate | undefined;
  max: LocalDate | undefined;
  locale: Locale;
  /** The heading's id, which labels the grid. */
  headingId: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
}

/** The previous- and next-month buttons around the visible month's heading. */
function CalendarHeader({ visibleMonth, setMonth, min, max, locale, headingId, previousMonthLabel, nextMonthLabel }: CalendarHeaderProps) {
  // `Locale`'s name lists are fresh arrays on every call; the resolved locale is stable.
  const monthNames = useMemo(() => locale.monthNames("long"), [locale]);

  // The month buttons stay focusable at a bound, as Clear does while nothing is selected: a natively
  // disabled button drops the focus it holds to `body`, so a keyboard user stepping to `max` would
  // lose their place. A press at a bound is refused here instead.
  const hasPreviousMonth = canGoToPreviousMonth(visibleMonth, min);
  const hasNextMonth = canGoToNextMonth(visibleMonth, max);

  return (
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
  );
}

/** The grid's weekday column headers, in the locale's order from its first day of the week. */
function CalendarWeekdays({ locale }: { locale: Locale }) {
  // `Locale`'s name lists are fresh arrays on every call; the resolved locale is stable.
  const weekdays = useMemo(() => {
    const long = weekdaysFrom(locale.weekdayNames("long"), locale.firstDayOfWeek);
    const short = weekdaysFrom(locale.weekdayNames("short"), locale.firstDayOfWeek);
    return long.map((name, index) => ({ long: name, short: short[index] }));
  }, [locale]);

  return (
    <thead>
      <tr>
        {weekdays.map((weekday) => (
          <th key={weekday.long} scope="col" className="vpg-calendar-weekday" aria-label={weekday.long}>
            {weekday.short}
          </th>
        ))}
      </tr>
    </thead>
  );
}

interface CalendarDayProps {
  date: LocalDate;
  focus: CalendarFocus;
  marks: CalendarDayMarks;
  today: LocalDate;
  locale: Locale;
  /** Whether the day is out of range or reported by `isDateDisabled`. */
  disabled: boolean;
  pick: (date: LocalDate) => void;
}

/** One day of the visible month: a focusable grid cell that registers itself for DOM focus moves. */
function CalendarDay({ date, focus, marks, today, locale, disabled, pick }: CalendarDayProps) {
  const { active, cellsRef, setFocusedDate, handleDayKeyDown } = focus;
  const key = date.toString();
  return (
    <td
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
      {...marks}
      aria-current={date.equals(today) ? "date" : undefined}
      aria-disabled={disabled || undefined}
      onClick={() => pick(date)}
      onFocus={() => setFocusedDate(date)}
      onKeyDown={(event) => handleDayKeyDown(event, date)}
    >
      {date.day}
    </td>
  );
}

/**
 * The month grid a calendar wraps, holding everything but the selection: the header with its month
 * buttons, a `role="grid"` labelled by the visible month's heading, the weekday column headers in
 * the locale's order, six weeks of day cells with adjacent-month days as inert `aria-hidden`
 * blanks, the roving tab stop and the keymap of `useCalendarFocus`.
 *
 * The selection reaches it as three inputs: `tabStopAnchor`, the day the tab stop falls back to
 * after the last-focused one; `dayMarks`, each day's `aria-selected` and `data-*` attributes; and
 * `onPick`, which receives a click, Enter or Space on an enabled day. A disabled day is
 * `aria-disabled`, stays focusable and is never picked. The visible month is controlled when
 * `month` is passed and is never re-derived from `tabStopAnchor` after the first render.
 *
 * It renders `Calendar`'s stylesheet and a root `<div class="vpg-calendar">` that takes `ref`,
 * `className` and any other native attribute; `footer` renders below the grid inside it.
 */
export function CalendarCore(props: CalendarCoreProps) {
  const {
    tabStopAnchor,
    dayMarks,
    onPick,
    month,
    defaultMonth,
    onMonthChange,
    locale: localeProp,
    today: todayProp,
    min,
    max,
    isDateDisabled,
    previousMonthLabel = "Previous month",
    nextMonthLabel = "Next month",
    // Kept out of `rest`: React focuses a host element given `autoFocus` on mount, which here would
    // be the root `div` rather than the tab-stop day.
    autoFocus = false,
    footer,
    className,
    ...rest
  } = props;

  const locale = useLocale(localeProp);
  const today = todayProp ?? LocalDate.now();
  const firstDayOfWeek = locale.firstDayOfWeek;

  const [rawMonth, setMonth] = useControllableState(month, () => firstOfMonth(defaultMonth ?? tabStopAnchor ?? today), onMonthChange);
  const visibleMonth = firstOfMonth(rawMonth);
  const headingId = useId();

  function pick(date: LocalDate) {
    if (isDayDisabled(date, min, max, isDateDisabled)) return;
    onPick(date);
  }

  const focus = useCalendarFocus({
    visibleMonth,
    setMonth,
    anchor: tabStopAnchor,
    today,
    min,
    max,
    isDateDisabled,
    firstDayOfWeek,
    pick,
    autoFocus,
  });

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
        <CalendarHeader
          visibleMonth={visibleMonth}
          setMonth={setMonth}
          min={min}
          max={max}
          locale={locale}
          headingId={headingId}
          previousMonthLabel={previousMonthLabel}
          nextMonthLabel={nextMonthLabel}
        />
        {/* biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: the grid pattern on a table keeps the row and column semantics a screen reader announces a day's weekday by */}
        <table role="grid" className="vpg-calendar-grid" aria-labelledby={headingId}>
          <CalendarWeekdays locale={locale} />
          <tbody>
            {weeks.map((week) => (
              <tr key={week.key} aria-hidden={week.blank || undefined}>
                {week.cells.map(({ key, date }) =>
                  date === undefined ? (
                    <td key={key} className="vpg-calendar-blank" aria-hidden="true" />
                  ) : (
                    <CalendarDay
                      key={key}
                      date={date}
                      focus={focus}
                      marks={dayMarks(date)}
                      today={today}
                      locale={locale}
                      disabled={isDayDisabled(date, min, max, isDateDisabled)}
                      pick={pick}
                    />
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {footer}
      </div>
    </>
  );
}
