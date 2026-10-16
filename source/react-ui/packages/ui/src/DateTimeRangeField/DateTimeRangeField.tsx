import { Calendar as CalendarIcon, X } from "@vipengele/react-icons";
import { useLocale } from "@vipengele/react-tokens";
import { type Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import {
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "../Button/Button.js";
import { type DateBounds, dateBounds, formatDateTimeText, serialiseDateTime, timeBounds } from "../DateTimeField/dateTimeFieldModel.js";
import { FieldShell } from "../FieldShell/FieldShell.js";
import type { DateRange, DateTimeRange } from "../internal/localRange.js";
import { type CalendarPopup, openingMonth, useCalendarPopup } from "../internal/useCalendarPopup.js";
import { useClearRejectedOnExternalChange } from "../internal/useClearRejectedOnExternalChange.js";
import { Popover } from "../Popover/Popover.js";
import { RangeCalendar } from "../RangeCalendar/RangeCalendar.js";
import { TimePanel } from "../TimePanel/TimePanel.js";
import { dateTimeRangeFieldStylesheet } from "./DateTimeRangeField.stylesheet.js";
import {
  calendarSelection,
  committedInvalidEnds,
  type DateTimeConstraints,
  decideRange,
  type EndParts,
  endParts,
  formatDescription,
  formatHint,
  formatRange,
  invalidEnds,
  type PendingDays,
  placeDay,
  type RangeDrafts,
  type RangeEnd,
  type RangeIssue,
  rangeKey,
  sameDrafts,
} from "./dateTimeRangeFieldModel.js";

export interface DateTimeRangeFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "role" | "children" | "name"> {
  /** A ref to the `role="group"` element holding the two editors — the element `FormField` labels.
   * The hidden inputs that carry the form values are not reachable through it. `HTMLAttributes`
   * carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLDivElement>;
  /** The controlled range. Passing the prop at all makes the field controlled, so
   * `value={undefined}` is a controlled, empty field. While focus is in the field an update to it
   * does not reach the editors: the edit in progress wins until the user commits. */
  value?: DateTimeRange;
  /** The initial range of an uncontrolled field. */
  defaultValue?: DateTimeRange;
  /** Called on **commit** only — an editor's blur, Enter, a pick in the pop-up that leaves both
   * days and both times in place, or the clear button — and only when both ends read as accepted
   * date-times with the start not after the end, or when both editors are empty, for `undefined`.
   * One empty end, a picked day still waiting for its time, text that reads as no accepted
   * date-time, or an end before the start — a same-day end time before the start time included —
   * reports nothing and stays on screen, flagged through `aria-invalid`. */
  onChange?: (range: DateTimeRange | undefined) => void;
  /** The earliest date-time either end may be, inclusive. Its date bounds the calendar; its time
   * bounds a time panel only on that date. */
  min?: LocalDateTime;
  /** The latest date-time either end may be, inclusive, applied as `min` is. */
  max?: LocalDateTime;
  /** Reports a day that cannot be an end of the range. A range may still run across it. */
  isDateDisabled?: (date: LocalDate) => boolean;
  /** The locale the editors are written, read and clocked in. Defaults to the nearest
   * `LocaleProvider`'s, then the runtime's own. */
  locale?: Locale;
  /** The day the calendar marks as today and opens on in an empty field. Defaults to
   * `LocalDate.now()`. */
  today?: LocalDate;
  /** The minutes between two adjacent options of each time panel's minute strip. Defaults to `5`.
   * A minute off that grid is added to the strip and shown selected. */
  minuteStep?: number;
  /** Disables both editors and both buttons, and leaves the field out of a submitted form. */
  disabled?: boolean;
  /** Makes both editors read-only: no clear button and no pop-up. */
  readOnly?: boolean;
  /** Marks both editors as required, so a form's own validation asks for both ends. */
  required?: boolean;
  /** The form field name of a hidden input carrying the committed start as an ISO 8601 date-time.
   * Absent, no input is rendered for the start. */
  startName?: string;
  /** The form field name of a hidden input carrying the committed end as an ISO 8601 date-time.
   * Absent, no input is rendered for the end. */
  endName?: string;
  /** The start editor's own name, read after the field's label. Defaults to `"Start"`. */
  startLabel?: string;
  /** The end editor's own name, read after the field's label. Defaults to `"End"`. */
  endLabel?: string;
  /** The clear button's accessible name. Defaults to `"Clear dates and times"`. */
  clearLabel?: string;
  /** Controls the pop-up. Supplying it hands the state to the caller: the pop-up then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. A
   * disabled or read-only field shows no pop-up whatever this says. */
  open?: boolean;
  /** Seeds the uncontrolled state of the pop-up. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every request to open or close the pop-up — the calendar button, the Done button,
   * an outside press, `Escape` — in both the controlled and the uncontrolled form. A disabled or
   * read-only field requests no opening. */
  onOpenChange?: (open: boolean) => void;
  /** The calendar button's accessible name. Defaults to `"Choose dates and times"`. */
  openCalendarLabel?: string;
  /** The calendar's previous-month button's accessible name. Defaults to `"Previous month"`. */
  previousMonthLabel?: string;
  /** The calendar's next-month button's accessible name. Defaults to `"Next month"`. */
  nextMonthLabel?: string;
  /** The label of the time panel for the start. Defaults to `"Start time"`. */
  startTimeLabel?: string;
  /** The label of the time panel for the end. Defaults to `"End time"`. */
  endTimeLabel?: string;
  /** Each time panel's hour strip's accessible name. Defaults to `"Hour"`. */
  hourLabel?: string;
  /** Each time panel's minute strip's accessible name. Defaults to `"Minute"`. */
  minuteLabel?: string;
  /** Each time panel's AM/PM strip's accessible name. Defaults to `"AM/PM"`. */
  dayPeriodLabel?: string;
  /** The text of the button closing the pop-up. Defaults to `"Done"`. */
  doneLabel?: string;
}

const NO_PENDING: PendingDays = {};

/**
 * What a key press asks of an editor: a commit, or nothing. An `Enter` that is confirming an IME
 * composition belongs to the composition.
 */
function isCommitKey(event: KeyboardEvent<HTMLInputElement>): boolean {
  return event.key === "Enter" && !event.nativeEvent.isComposing;
}

/**
 * A time panel's `isTimeDisabled` for the bounds given as ISO times, or `undefined` when there are
 * none. Keyed by the ISO text so the function keeps its identity across renders, as the panel asks.
 */
function useTimeDisabled(min: string | undefined, max: string | undefined): ((time: LocalTime) => boolean) | undefined {
  return useMemo(() => {
    if (min === undefined && max === undefined) return undefined;
    const lower = min === undefined ? undefined : LocalTime.parse(min);
    const upper = max === undefined ? undefined : LocalTime.parse(max);
    return (time: LocalTime) =>
      (lower !== undefined && LocalTime.compare(time, lower) < 0) || (upper !== undefined && LocalTime.compare(time, upper) > 0);
  }, [min, max]);
}

/**
 * Whether focus has left the whole field — editors, buttons and pop-up — set as it leaves and
 * cleared when it comes back to any of them. The pop-up is portaled out of the shell, so React's
 * focus events reach the shell from it while the DOM does not nest it there; `panelRef` marks the
 * pop-up's box, and both boxes are checked for where focus went.
 */
function useFocusLeft() {
  const panelRef = useRef<HTMLDivElement>(null);
  const [focusLeft, setFocusLeft] = useState(false);

  const onFocus = () => setFocusLeft(false);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    const inside = next instanceof Node && (event.currentTarget.contains(next) || panelRef.current?.contains(next) === true);
    if (!inside) setFocusLeft(true);
  };

  return { panelRef, focusLeft, onFocus, onBlur };
}

interface ClearButtonProps {
  label: string;
  onClear: () => void;
}

/**
 * The control emptying both editors. Preventing the default of its mousedown keeps focus where it
 * is, so a press does not first blur an edit in progress into a commit that the clear would then
 * follow with a second `onChange`.
 */
function ClearButton({ label, onClear }: ClearButtonProps) {
  return (
    <button
      type="button"
      className="vpg-date-time-range-field-clear"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClear}
    >
      <X className="vpg-date-time-range-field-clear-icon" aria-hidden="true" />
    </button>
  );
}

interface CalendarButtonProps {
  popup: CalendarPopup;
  label: string;
  disabled: boolean;
  /** What the pop-up holds. */
  content: ReactNode;
}

/**
 * The control opening the pop-up, and the non-modal `Popover` it opens: hanging below the whole
 * field, flush with its start edge. The button states its own `aria-expanded`; the panel is no
 * dialog, and a press on an editor closes it and lands in that editor. The button's mousedown is
 * left alone: pressing it moves focus out of an editor, and that blur commits the typed text before
 * the pop-up opens on it.
 */
function CalendarButton({ popup, label, disabled, content }: CalendarButtonProps) {
  return (
    <Popover
      content={content}
      className="vpg-date-time-range-field-panel"
      open={popup.isOpen}
      onOpenChange={popup.request}
      returnFocus={popup.returnFocus}
      modal={false}
      anchor={popup.fieldRef}
      placement="bottom-start"
    >
      <button
        ref={popup.buttonRef}
        type="button"
        className="vpg-date-time-range-field-calendar-toggle"
        aria-label={label}
        aria-expanded={popup.isOpen}
        disabled={disabled}
      >
        <CalendarIcon className="vpg-date-time-range-field-calendar-toggle-icon" aria-hidden="true" />
      </button>
    </Popover>
  );
}

interface TimeSectionProps extends Pick<DateTimeRangeFieldProps, "minuteStep" | "hourLabel" | "minuteLabel" | "dayPeriodLabel"> {
  /** The section's visible label, which names its time panel. */
  label: string;
  /** The day of this end, which the time panel puts a time on. */
  day: LocalDate | undefined;
  /** The time the time panel selects. */
  time: LocalTime | undefined;
  onTimePick: (time: LocalTime) => void;
  locale: Locale;
  constraints: DateTimeConstraints;
}

/**
 * One end's time: a label and a `TimePanel` it names, disabled until the end has a day and bounded
 * by the times allowed on that day.
 */
function TimeSection({
  label,
  day,
  time,
  onTimePick,
  locale,
  constraints,
  minuteStep,
  hourLabel,
  minuteLabel,
  dayPeriodLabel,
}: TimeSectionProps) {
  const labelId = useId();
  const times = timeBounds(day, constraints);
  const isTimeDisabled = useTimeDisabled(times.min?.toString(), times.max?.toString());
  return (
    <div className="vpg-date-time-range-field-time">
      <span id={labelId} className="vpg-date-time-range-field-time-label">
        {label}
      </span>
      <TimePanel
        role="group"
        aria-labelledby={labelId}
        value={time}
        onChange={onTimePick}
        locale={locale}
        minuteStep={minuteStep}
        isTimeDisabled={isTimeDisabled}
        disabled={day === undefined}
        hourLabel={hourLabel}
        minuteLabel={minuteLabel}
        dayPeriodLabel={dayPeriodLabel}
      />
    </div>
  );
}

interface DateTimeRangePickerProps
  extends Pick<
    DateTimeRangeFieldProps,
    "minuteStep" | "previousMonthLabel" | "nextMonthLabel" | "hourLabel" | "minuteLabel" | "dayPeriodLabel" | "isDateDisabled"
  > {
  /** The pop-up's own box, which focus may move into without leaving the field. */
  panelRef: RefObject<HTMLDivElement | null>;
  /** The days the calendar shows: a pending anchor, or a range. */
  anchor: LocalDate | undefined;
  days: DateRange | undefined;
  /** What each end shows in its time panel, and the day it puts a time on. */
  parts: Record<RangeEnd, EndParts>;
  onAnchorPick: (anchor: LocalDate | undefined) => void;
  onDaysPick: (days: DateRange | undefined) => void;
  onTimePick: (which: RangeEnd, time: LocalTime) => void;
  onDone: () => void;
  popup: CalendarPopup;
  locale: Locale;
  today: LocalDate;
  dates: DateBounds;
  constraints: DateTimeConstraints;
  startTimeLabel: string;
  endTimeLabel: string;
  doneLabel: string;
}

/**
 * What the pop-up holds: a `RangeCalendar` over the bounds' dates, a time panel for each end, and
 * the Done button.
 */
function DateTimeRangePicker({
  panelRef,
  anchor,
  days,
  parts,
  onAnchorPick,
  onDaysPick,
  onTimePick,
  onDone,
  popup,
  locale,
  today,
  dates,
  constraints,
  isDateDisabled,
  minuteStep,
  previousMonthLabel,
  nextMonthLabel,
  hourLabel,
  minuteLabel,
  dayPeriodLabel,
  startTimeLabel,
  endTimeLabel,
  doneLabel,
}: DateTimeRangePickerProps) {
  const strips = { minuteStep, hourLabel, minuteLabel, dayPeriodLabel };
  return (
    // `tabIndex={-1}` makes a press anywhere in the pop-up land focus inside it rather than on the
    // page, which would read as focus leaving the field.
    <div ref={panelRef} className="vpg-date-time-range-field-picker" tabIndex={-1}>
      <RangeCalendar
        value={days}
        onChange={onDaysPick}
        anchor={anchor}
        onAnchorChange={onAnchorPick}
        month={popup.month}
        onMonthChange={popup.setMonth}
        locale={locale}
        today={today}
        min={dates.min}
        max={dates.max}
        isDateDisabled={isDateDisabled}
        previousMonthLabel={previousMonthLabel}
        nextMonthLabel={nextMonthLabel}
        autoFocus
      />
      <TimeSection
        {...strips}
        label={startTimeLabel}
        day={parts.start.day}
        time={parts.start.time}
        onTimePick={(time) => onTimePick("start", time)}
        locale={locale}
        constraints={constraints}
      />
      <TimeSection
        {...strips}
        label={endTimeLabel}
        day={parts.end.day}
        time={parts.end.time}
        onTimePick={(time) => onTimePick("end", time)}
        locale={locale}
        constraints={constraints}
      />
      <div className="vpg-date-time-range-field-actions">
        <Button size="sm" onClick={onDone}>
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * A field for a range of date-times: a start editor and an end editor, each a text `<input>`
 * holding a date and a time as `DateTimeField`'s does (`10/15/2026 09:05 PM` in `en-US`), inside
 * one `role="group"` that is the `FieldShell`'s marked control (ADR-0052).
 *
 * The texts in the editors are what the user is writing; the committed value is the
 * `DateTimeRange | undefined` the caller owns. Each editor reads its text by `DateTimeField`'s
 * rules when it is committed — on blur or on Enter — and the two readings decide together: two
 * accepted date-times with the start not after the end commit the range, two empty editors commit
 * `undefined`, and anything else commits nothing. Text that reads as no accepted date-time, and an
 * end before the start — a same-day end time before the start time included — flag the editors at
 * fault through `aria-invalid` at once; the ends are never swapped. An empty end beside a filled
 * one is incomplete, flagged once focus has left the whole field, pop-up included. The texts stay
 * on screen and the committed range stands until the pair commits.
 *
 * The group takes the field's label — `aria-label`, `aria-labelledby`, or `FormField`'s, which is
 * cloned onto it with the rest of its attributes. Each editor is named by `aria-labelledby` as that
 * label followed by its own "Start" or "End" (`startLabel`, `endLabel`), so two range fields on one
 * page read apart.
 *
 * A button at the field's start opens a non-modal `Popover` below the field holding a
 * `RangeCalendar`, a time panel for the start, one for the end, and a Done button. The calendar's
 * first pick puts its day in the start editor and empties the end editor; its second pick puts the
 * two days in the editors, the earlier in the start. A picked day keeps the time its editor holds,
 * else the committed range's time for that end; with no time to keep, or one the bounds rule out on
 * that day, the day is pending — the editor shows it alone and its time panel waits for a time. Each
 * time panel is disabled until its end has a day. Nothing commits until both days and both times are
 * in place and in order; the pick that completes them commits the range. A start typed with the end
 * still empty is the calendar's pending anchor. Done closes the pop-up onto the end editor, and
 * `Escape` and an outside press close it with focus back on the button. A pending day flags its
 * editor only once focus has left the whole field.
 *
 * The editors carry no `name`. `startName` and `endName` each render a hidden input submitting that
 * end of the committed range as an ISO 8601 date-time (`2026-10-15T21:05`); the field has no `name`
 * of its own. `ref`, `className` and every other native attribute land on the group.
 */
export function DateTimeRangeField(props: DateTimeRangeFieldProps) {
  const {
    value,
    defaultValue,
    onChange,
    min,
    max,
    isDateDisabled,
    locale: localeProp,
    today: todayProp,
    minuteStep,
    disabled,
    readOnly,
    required,
    startName,
    endName,
    startLabel = "Start",
    endLabel = "End",
    clearLabel = "Clear dates and times",
    open,
    defaultOpen,
    onOpenChange,
    openCalendarLabel = "Choose dates and times",
    previousMonthLabel,
    nextMonthLabel,
    startTimeLabel = "Start time",
    endTimeLabel = "End time",
    hourLabel,
    minuteLabel,
    dayPeriodLabel,
    doneLabel = "Done",
    className,
    id,
    ref,
    onFocus,
    onBlur,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-invalid": ariaInvalid,
    ...rest
  } = props;

  // A controlled field is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled field spells "empty".
  const isControlled = "value" in props;

  // The `locale` prop, else the nearest `LocaleProvider`, else the runtime's own locale.
  const locale = useLocale(localeProp);
  // Both strings depend only on the locale, and typing re-renders the field on every keystroke.
  const [placeholder, description] = useMemo(() => [formatHint(locale), formatDescription(locale)], [locale]);
  const today = todayProp ?? LocalDate.now();
  const constraints: DateTimeConstraints = { min, max, isDateDisabled };
  const dates = dateBounds(constraints);

  const generatedId = useId();
  const groupId = id ?? generatedId;
  const startLabelId = `${generatedId}-start`;
  const endLabelId = `${generatedId}-end`;

  const inputRefs: Record<RangeEnd, RefObject<HTMLInputElement | null>> = {
    start: useRef<HTMLInputElement>(null),
    end: useRef<HTMLInputElement>(null),
  };
  const [uncontrolledValue, setUncontrolledValue] = useState<DateTimeRange | undefined>(defaultValue);
  const committed = isControlled ? value : uncontrolledValue;
  const [drafts, setDrafts] = useState<RangeDrafts>(() => formatRange(committed, locale));
  // The texts as they stood at the last decision. Deciding untouched texts again is a no-op, so
  // focus moving between the editors with no edit commits nothing.
  const [decided, setDecided] = useState<RangeDrafts>(drafts);
  // What the last decision found when it committed nothing. The texts stay on screen while it is
  // set — erasing what the user typed is how they lose the evidence of their own mistake.
  const [issue, setIssue] = useState<RangeIssue | undefined>(undefined);
  // The days picked in the calendar that wait for their times.
  const [pending, setPending] = useState<PendingDays>(NO_PENDING);
  // Whether focus is on one of the editors.
  const [focused, setFocused] = useState(false);
  const fieldFocus = useFocusLeft();

  const editable = !disabled && !readOnly;
  // The editors show the drafts while the user works on them, else the committed range.
  const live = focused || issue !== undefined;
  const display = live ? drafts : formatRange(committed, locale);
  const selection = calendarSelection(display, pending, locale);
  const popup = useCalendarPopup({
    open,
    defaultOpen,
    onOpenChange,
    editable,
    opening: () => openingMonth(selection.anchor ?? selection.value?.start, today, dates.min, dates.max),
  });
  // A controlled value moving on beneath an unfocused field replaces a rejected draft and a pending
  // day alike: both describe an edit of the range it moved away from.
  useClearRejectedOnExternalChange(isControlled, focused || popup.isOpen, rangeKey(committed), issue !== undefined, () => {
    setIssue(undefined);
    setPending(NO_PENDING);
  });

  /** Shows `texts` in the editors as the texts of the last decision, with nothing outstanding. */
  const settle = (texts: RangeDrafts) => {
    setDrafts(texts);
    setDecided(texts);
    setIssue(undefined);
    setPending(NO_PENDING);
  };

  const commit = (next: DateTimeRange | undefined) => {
    settle(formatRange(next, locale));
    setUncontrolledValue(next);
    onChange?.(next);
  };

  /** Decides `texts` with `days` pending: commits the range they make, or holds them with the issue found. */
  const apply = (texts: RangeDrafts, days: PendingDays) => {
    const decision = decideRange(texts, committed, days, locale, constraints);
    if (decision.status === "committed" || decision.status === "cleared") {
      const next = decision.status === "committed" ? decision.range : undefined;
      if (rangeKey(next) === rangeKey(committed)) {
        settle(formatRange(committed, locale));
      } else {
        commit(next);
      }
    } else {
      setDrafts(texts);
      setDecided(texts);
      setPending(days);
      setIssue(decision);
    }
  };

  const decide = (texts: RangeDrafts) => {
    if (!sameDrafts(texts, decided)) apply(texts, pending);
  };

  /** The time an end's day is picked onto: the time its editor holds, else the committed one. */
  const timeOf = (which: RangeEnd) => endParts(display[which], pending[which], locale).time ?? committed?.[which].time;

  // The calendar's first pick: the start editor takes the day and the end editor empties, which is
  // what makes the day the calendar's anchor until the second pick. The second pick reports the
  // range first and then clears the anchor, which leaves nothing for this handler to do.
  const pickAnchor = (day: LocalDate | undefined) => {
    if (day === undefined) return;
    const start = placeDay(day, timeOf("start"), locale, constraints);
    apply({ start: start.text, end: "" }, { start: start.pending });
  };

  // The calendar's second pick, its days in order. Each end keeps its own time, whichever day the
  // order put in which editor. The calendar is not clearable, so it reports a range on every pick.
  const pickDays = (days: DateRange | undefined) => {
    const { start: startDay, end: endDay } = days as DateRange;
    const start = placeDay(startDay, timeOf("start"), locale, constraints);
    const end = placeDay(endDay, timeOf("end"), locale, constraints);
    apply({ start: start.text, end: end.text }, { start: start.pending, end: end.pending });
  };

  // A time panel is disabled while its end has no day, so a pick always has a day to land on.
  const pickTime = (which: RangeEnd, time: LocalTime) => {
    const day = endParts(display[which], pending[which], locale).day as LocalDate;
    apply({ ...display, [which]: formatDateTimeText(LocalDateTime.of(day, time), locale) }, { ...pending, [which]: undefined });
  };

  // Focus moves first: focus entering the field adopts what is on screen as the drafts, and doing
  // that after the clear would adopt the text the clear just removed.
  const clear = () => {
    inputRefs.start.current?.focus();
    commit(undefined);
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    // The editors may be showing text the drafts do not hold — a controlled parent that declined
    // the last commit, for one. Adopting it as focus enters is what stops the text jumping.
    if (!live) {
      setDrafts(display);
      setDecided(display);
    }
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // No `preventDefault()` and no `requestSubmit()`: the browser's implicit-submission rules
    // decide whether this Enter submits. That native submit reads the hidden inputs in this same
    // tick, before React would flush, so the decision's state updates are forced through first.
    if (isCommitKey(event)) flushSync(() => decide(drafts));
  };

  const flagged = invalidEnds(issue, fieldFocus.focusLeft);
  const committedFlagged = committedInvalidEnds(committed, constraints);
  const invalid: Record<RangeEnd, boolean> = {
    start: flagged.start || committedFlagged.start,
    end: flagged.end || committedFlagged.end,
  };

  // The group's own label: the ids it is labelled by, else the group itself when it carries an
  // `aria-label`. Referencing a group that is labelled by other elements would name it from its
  // content instead, the editors' text included.
  const groupLabel = ariaLabelledBy ?? (ariaLabel === undefined ? undefined : groupId);
  const labelledBy = (own: string) => (groupLabel === undefined ? own : `${groupLabel} ${own}`);

  const editor = (which: RangeEnd, labelId: string) => (
    <input
      ref={inputRefs[which]}
      type="text"
      autoComplete="off"
      className="vpg-date-time-range-field-input"
      data-end={which}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      value={display[which]}
      placeholder={placeholder}
      aria-labelledby={labelledBy(labelId)}
      aria-description={description}
      aria-invalid={invalid[which] || undefined}
      onChange={(event) => setDrafts({ ...drafts, [which]: event.target.value })}
      onBlur={() => decide(drafts)}
      onKeyDown={handleKeyDown}
    />
  );

  const classes = ["vpg-date-time-range-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");
  const showClear = editable && (committed !== undefined || display.start !== "" || display.end !== "");

  const content = (
    <DateTimeRangePicker
      panelRef={fieldFocus.panelRef}
      anchor={selection.anchor}
      days={selection.value}
      parts={{ start: endParts(display.start, pending.start, locale), end: endParts(display.end, pending.end, locale) }}
      onAnchorPick={pickAnchor}
      onDaysPick={pickDays}
      onTimePick={pickTime}
      onDone={() => popup.closeOnto(inputRefs.end.current)}
      popup={popup}
      locale={locale}
      today={today}
      dates={dates}
      constraints={constraints}
      isDateDisabled={isDateDisabled}
      minuteStep={minuteStep}
      previousMonthLabel={previousMonthLabel}
      nextMonthLabel={nextMonthLabel}
      hourLabel={hourLabel}
      minuteLabel={minuteLabel}
      dayPeriodLabel={dayPeriodLabel}
      startTimeLabel={startTimeLabel}
      endTimeLabel={endTimeLabel}
      doneLabel={doneLabel}
    />
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N date-time range fields on a page
        inject one stylesheet.
      */}
      <style href="vpg-date-time-range-field" precedence="vpg-date-time-range-field">
        {dateTimeRangeFieldStylesheet}
      </style>
      <FieldShell
        ref={popup.fieldRef}
        onFocus={fieldFocus.onFocus}
        onBlur={fieldFocus.onBlur}
        leading={<CalendarButton popup={popup} label={openCalendarLabel} disabled={!editable} content={content} />}
        trailing={showClear ? <ClearButton label={clearLabel} onClear={clear} /> : undefined}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> carries its own border, padding and min-content width inside the shell; a composite control is a plain role="group" */}
        <div
          {...rest}
          ref={ref}
          id={groupId}
          role="group"
          className={classes}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-invalid={invalid.start || invalid.end || ariaInvalid || undefined}
          aria-disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {/* Each editor's own name, read after the group's. Hidden, it still names what references it. */}
          <span id={startLabelId} hidden>
            {startLabel}
          </span>
          <span id={endLabelId} hidden>
            {endLabel}
          </span>
          {editor("start", startLabelId)}
          <span className="vpg-date-time-range-field-separator" aria-hidden="true">
            –
          </span>
          {editor("end", endLabelId)}
        </div>
        {/*
          The form values as ISO 8601 date-times, one input per named end. The editors carry no
          `name`, because naming them would submit the locale-formatted text and no server should
          have to parse that. Mirroring `disabled` keeps a disabled field out of the submission, as
          a disabled native control is.
        */}
        {startName === undefined ? null : (
          <input type="hidden" name={startName} disabled={disabled} value={serialiseDateTime(committed?.start)} />
        )}
        {endName === undefined ? null : (
          <input type="hidden" name={endName} disabled={disabled} value={serialiseDateTime(committed?.end)} />
        )}
      </FieldShell>
    </>
  );
}
