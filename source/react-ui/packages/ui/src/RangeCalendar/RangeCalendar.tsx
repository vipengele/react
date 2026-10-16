import { type Locale, LocalDate } from "@vipengele/ts";
import { type ComponentPropsWithRef, type FocusEvent, useRef, useState } from "react";
import { CalendarCore } from "../Calendar/CalendarCore.js";
import type { DateRange } from "../internal/localRange.js";
import { rangeCalendarStylesheet } from "./RangeCalendar.stylesheet.js";
import { dayState, pickDay } from "./rangeSelection.js";

export interface RangeCalendarProps extends Omit<ComponentPropsWithRef<"div">, "children" | "defaultValue" | "onChange"> {
  /** The controlled range. Passing the prop at all makes the range controlled, so
   * `value={undefined}` is a controlled calendar with no range. */
  value?: DateRange;
  /** The initial range of an uncontrolled calendar. Absent, there is no range. */
  defaultValue?: DateRange;
  /** Called with the range each completing pick makes, start never after end, even when it
   * equals the current range. */
  onChange?: (range: DateRange | undefined) => void;
  /** The controlled pending start, drawn as an endpoint; the next pick completes a range from it.
   * Passing the prop at all makes the anchor controlled, so `anchor={undefined}` is a controlled
   * calendar with nothing pending. */
  anchor?: LocalDate;
  /** Called with the picked day when a pick anchors, and with `undefined` when a pick completes
   * the range and the anchor clears. */
  onAnchorChange?: (anchor: LocalDate | undefined) => void;
  /** The controlled visible month; any day of it will do. Pair it with `onMonthChange`. */
  month?: LocalDate;
  /** The initially visible month of an uncontrolled calendar; any day of it will do. Defaults to
   * the anchor's month, else the range start's, else today's. */
  defaultMonth?: LocalDate;
  /** Called with the first day of the month the user moved to, by a month button or a key. */
  onMonthChange?: (month: LocalDate) => void;
  /** The locale month and weekday names, day labels and the first day of the week come from.
   * Defaults to the nearest `LocaleProvider`'s, then the runtime's own. */
  locale?: Locale;
  /** The day marked as today. Defaults to `LocalDate.now()`. */
  today?: LocalDate;
  /** The earliest day an end of the range may be, inclusive. */
  min?: LocalDate;
  /** The latest day an end of the range may be, inclusive. */
  max?: LocalDate;
  /** Reports a day that cannot be an end of the range. A range may still run across it, and it
   * stays focusable, so arrow keys pass through it. */
  isDateDisabled?: (date: LocalDate) => boolean;
  /** The previous-month button's accessible name. Defaults to `"Previous month"`. */
  previousMonthLabel?: string;
  /** The next-month button's accessible name. Defaults to `"Next month"`. */
  nextMonthLabel?: string;
  /** Focuses the grid's tab-stop day on mount. */
  autoFocus?: boolean;
}

/** The day a focus event landed on, read off the cell's `data-date`; `undefined` off a day. */
function focusedDay(event: FocusEvent<HTMLDivElement>): LocalDate | undefined {
  const iso = (event.target as HTMLElement).getAttribute("data-date");
  return iso === null ? undefined : LocalDate.parse(iso);
}

/**
 * A month grid for picking a range of days. It is `Calendar`'s grid — the same structure, keymap,
 * roving tab stop, month buttons and locale handling — with a two-pick selection: the first pick
 * anchors, the second completes the range and clears the anchor. A second pick earlier than the
 * anchor swaps them, so a range always runs from its earlier day; picking the anchor again makes a
 * one-day range. A pick after a completed range anchors afresh. `onChange` fires on completion
 * only; `onAnchorChange` fires on anchoring and when completion clears the anchor, in that order
 * after `onChange`.
 *
 * Each end of the range, and the pending anchor, is `aria-selected`; `data-range-start`,
 * `data-range-end` and `data-in-range` mark the span for the stylesheet. While an anchor is
 * pending it replaces the committed range on screen, and the span from it to the day under the
 * pointer, or the day keyboard focus is on, whichever moved last, is drawn with `data-preview`, so
 * the range the next pick makes is in view before it is made.
 *
 * The tab stop is the day last focused while its month is visible, else the anchor, else the
 * range's start, else today, else the month's first enabled day. A day outside `min`..`max` or
 * reported by `isDateDisabled` is `aria-disabled` and is never an end of the range; a range may
 * cross it. Days of the neighbouring months are inert blanks, so the span is drawn only on the
 * visible month's days.
 *
 * The range and the anchor are each controlled exactly when their prop is passed; the visible
 * month is controlled when `month` is, and is never derived from the range after the first render.
 * The component opens nothing and handles no Escape. `ref` and any other native attribute land on
 * the root `<div>`.
 */
export function RangeCalendar(props: RangeCalendarProps) {
  const {
    value,
    defaultValue,
    onChange,
    anchor: anchorProp,
    onAnchorChange,
    // Kept out of `rest` and handed to `CalendarCore` by name, which keeps it off the root `div`:
    // React focuses a host element given `autoFocus` on mount, rather than the tab-stop day.
    autoFocus = false,
    className,
    onFocus,
    onBlur,
    ...rest
  } = props;

  // A controlled range or anchor is one that was *given* its prop, which `!== undefined` cannot
  // detect: `undefined` is also how a controlled calendar spells "none".
  const isValueControlled = "value" in props;
  const isAnchorControlled = "anchor" in props;
  const [uncontrolledValue, setUncontrolledValue] = useState<DateRange | undefined>(defaultValue);
  const [uncontrolledAnchor, setUncontrolledAnchor] = useState<LocalDate | undefined>(undefined);
  const range = isValueControlled ? value : uncontrolledValue;
  const anchor = isAnchorControlled ? anchorProp : uncontrolledAnchor;

  // The preview reaches to whichever of the hovered and the focused day moved last; when one of
  // them goes away it falls back to the other.
  const [preview, setPreview] = useState<LocalDate | undefined>(undefined);
  const hoveredRef = useRef<LocalDate | undefined>(undefined);
  const focusedRef = useRef<LocalDate | undefined>(undefined);

  // `CalendarCore` never picks a disabled day, so every pick here may be an end of the range.
  function pick(date: LocalDate) {
    const result = pickDay(anchor, date);
    if (result.range === undefined) {
      if (!isAnchorControlled) setUncontrolledAnchor(result.anchor);
      onAnchorChange?.(result.anchor);
      return;
    }
    if (!isValueControlled) setUncontrolledValue(result.range);
    if (!isAnchorControlled) setUncontrolledAnchor(undefined);
    onChange?.(result.range);
    onAnchorChange?.(undefined);
  }

  const display = { range, anchor, preview };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N range calendars on a page inject one
        stylesheet.
      */}
      <style href="vpg-range-calendar" precedence="vpg-range-calendar">
        {rangeCalendarStylesheet}
      </style>
      <CalendarCore
        {...rest}
        className={["vpg-range-calendar", className].filter(Boolean).join(" ")}
        autoFocus={autoFocus}
        tabStopAnchor={anchor ?? range?.start}
        onPick={pick}
        onFocus={(event) => {
          focusedRef.current = focusedDay(event);
          setPreview(focusedRef.current ?? hoveredRef.current);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          focusedRef.current = undefined;
          setPreview(hoveredRef.current);
          onBlur?.(event);
        }}
        dayMarks={(date) => {
          const state = dayState(date, display);
          return {
            "aria-selected": state.selected || undefined,
            "data-date": date.toString(),
            "data-range-start": state.start || undefined,
            "data-range-end": state.end || undefined,
            "data-in-range": state.inRange || undefined,
            "data-preview": state.preview || undefined,
            onPointerEnter: () => {
              hoveredRef.current = date;
              setPreview(date);
            },
            onPointerLeave: () => {
              hoveredRef.current = undefined;
              setPreview(focusedRef.current);
            },
          };
        }}
      />
    </>
  );
}
