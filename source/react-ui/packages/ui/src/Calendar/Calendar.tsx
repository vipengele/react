import type { Locale, LocalDate } from "@vipengele/ts";
import { type ComponentPropsWithRef, useState } from "react";
import { CalendarCore } from "./CalendarCore.js";

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

interface CalendarSelectionOptions {
  isControlled: boolean;
  value: LocalDate | undefined;
  defaultValue: LocalDate | undefined;
  onChange: ((value: LocalDate | undefined) => void) | undefined;
}

/** The selected day, controlled when `isControlled`, and the two ways the user changes it. */
function useCalendarSelection({ isControlled, value, defaultValue, onChange }: CalendarSelectionOptions) {
  const [uncontrolledValue, setUncontrolledValue] = useState<LocalDate | undefined>(defaultValue);
  const selected = isControlled ? value : uncontrolledValue;

  // `CalendarCore` never picks a disabled day, so only a pick of the selected day is refused here.
  function select(date: LocalDate) {
    if (selected?.equals(date)) return;
    if (!isControlled) setUncontrolledValue(date);
    onChange?.(date);
  }

  // The Clear button stays focusable while nothing is selected, so a press then has to be refused here.
  function clear() {
    if (selected === undefined) return;
    if (!isControlled) setUncontrolledValue(undefined);
    onChange?.(undefined);
  }

  return { selected, select, clear };
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
    clearable = false,
    clearLabel = "Clear",
    // Kept out of `rest` and handed to `CalendarCore` by name, which keeps it off the root `div`:
    // React focuses a host element given `autoFocus` on mount, rather than the tab-stop day.
    autoFocus = false,
    ...rest
  } = props;

  // A controlled selection is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled calendar spells "nothing selected".
  const { selected, select, clear } = useCalendarSelection({
    isControlled: "value" in props,
    value,
    defaultValue,
    onChange,
  });

  return (
    <CalendarCore
      {...rest}
      autoFocus={autoFocus}
      tabStopAnchor={selected}
      dayMarks={(date) => ({ "aria-selected": selected?.equals(date) || undefined })}
      onPick={select}
      footer={
        clearable ? (
          <div className="vpg-calendar-footer">
            <button type="button" className="vpg-calendar-clear" aria-disabled={selected === undefined || undefined} onClick={clear}>
              {clearLabel}
            </button>
          </div>
        ) : null
      }
    />
  );
}
