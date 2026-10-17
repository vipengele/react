import { Calendar as CalendarIcon, X } from "@vipengele/react-icons";
import { useLocale } from "@vipengele/react-tokens";
import { type DateTimeSegment, type Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import {
  type ChangeEvent,
  type CompositionEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useMemo,
  useRef,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "../Button/Button.js";
import { Calendar } from "../Calendar/Calendar.js";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { type CalendarPopup, openingMonth, useCalendarPopup } from "../internal/useCalendarPopup.js";
import { useControllableState } from "../internal/useControllableState.js";
import { Popover } from "../Popover/Popover.js";
import { TimePanel } from "../TimePanel/TimePanel.js";
import { dateTimeFieldStylesheet } from "./DateTimeField.stylesheet.js";
import {
  type DateBounds,
  type DateTimeBounds,
  dateBounds,
  dateTimeSegments,
  serialiseDateTime,
  timeBounds,
  typeDateTimeText,
} from "./dateTimeFieldModel.js";
import { useDateTimeFieldState } from "./useDateTimeFieldState.js";

export interface DateTimeFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> {
  /** A ref to the visible `<input>` — the element a caller focuses and selects text in. The
   * hidden input that carries the form value is not reachable through it.
   * `InputHTMLAttributes` carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLInputElement>;
  /** The controlled value. Passing the prop at all makes the field controlled, so
   * `value={undefined}` is a controlled, empty field. While the input has focus an update to it
   * does not reach the box: the edit under the caret wins until the user commits. */
  value?: LocalDateTime;
  /** The initial value of an uncontrolled field. */
  defaultValue?: LocalDateTime;
  /** Called on **commit** only — blur, Enter, a pick in the pop-up that names a whole date-time,
   * or the clear button — never per keystroke. An emptied field reports `undefined`; text that
   * reads as no accepted date-time reports nothing and stays on screen, flagged through
   * `aria-invalid`. A day picked with no time to go with it reports nothing either. */
  onChange?: (value: LocalDateTime | undefined) => void;
  /** The earliest date-time the field commits, inclusive. Its date bounds the calendar; its time
   * bounds the time panel only on that date. */
  min?: LocalDateTime;
  /** The latest date-time the field commits, inclusive, applied as `min` is. */
  max?: LocalDateTime;
  /** The locale the field is written, read and clocked in. Defaults to the nearest
   * `LocaleProvider`'s, then the runtime's own. */
  locale?: Locale;
  /** The day the calendar marks as today and opens on in an empty field. Defaults to
   * `LocalDate.now()`. */
  today?: LocalDate;
  /** The minutes between two adjacent options of the time panel's minute strip. Defaults to `5`.
   * A committed minute off that grid is added to the strip and shown selected. */
  minuteStep?: number;
  /** The clear button's accessible name. Defaults to `"Clear date and time"`. */
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
  /** The calendar button's accessible name. Defaults to `"Choose date and time"`. */
  openCalendarLabel?: string;
  /** The calendar's previous-month button's accessible name. Defaults to `"Previous month"`. */
  previousMonthLabel?: string;
  /** The calendar's next-month button's accessible name. Defaults to `"Next month"`. */
  nextMonthLabel?: string;
  /** The time panel's hour strip's accessible name. Defaults to `"Hour"`. */
  hourLabel?: string;
  /** The time panel's minute strip's accessible name. Defaults to `"Minute"`. */
  minuteLabel?: string;
  /** The time panel's AM/PM strip's accessible name. Defaults to `"AM/PM"`. */
  dayPeriodLabel?: string;
  /** The text of the button closing the pop-up. Defaults to `"Done"`. */
  doneLabel?: string;
}

/** What each field of a date-time is called in the format description. */
const SEGMENT_LABELS: Record<Exclude<DateTimeSegment["type"], "literal">, string> = {
  year: "year",
  month: "month",
  day: "day",
  hour: "hour",
  minute: "minute",
  second: "second",
  dayPeriod: "day period",
};

/** What each numeric field is called in the placeholder. */
const FIELD_HINTS: Partial<Record<DateTimeSegment["type"], string>> = { year: "yyyy", month: "mm", day: "dd", hour: "hh", minute: "mm" };

/** Any morning and evening will do: the hint reads the order of the fields and the day periods' names. */
const SAMPLE_MORNING = LocalDateTime.ofFields(2000, 1, 1, 9, 0);
const SAMPLE_EVENING = LocalDateTime.ofFields(2000, 1, 1, 21, 0);

function dayPeriodName(value: LocalDateTime, locale: Locale): string | undefined {
  return dateTimeSegments(value, locale).find((segment) => segment.type === "dayPeriod")?.value;
}

/**
 * The format `locale` writes the field's text in, spelled the way a placeholder shows it:
 * `mm/dd/yyyy hh:mm AM/PM` for `en-US`, `dd.mm.yyyy hh:mm` for `de-DE`. A day period is written
 * as the locale names its morning and its evening.
 */
function formatHint(locale: Locale): string {
  const periods = `${dayPeriodName(SAMPLE_MORNING, locale)}/${dayPeriodName(SAMPLE_EVENING, locale)}`;
  return dateTimeSegments(SAMPLE_MORNING, locale)
    .map((segment) => (segment.type === "dayPeriod" ? periods : (FIELD_HINTS[segment.type] ?? segment.value)))
    .join("");
}

/** The fields of the field's text in the order `locale` writes them: `Format: month / day / year / hour / minute / day period`. */
function formatDescription(locale: Locale): string {
  const fields = dateTimeSegments(SAMPLE_MORNING, locale).flatMap((segment) =>
    segment.type === "literal" ? [] : [SEGMENT_LABELS[segment.type]],
  );
  return `Format: ${fields.join(" / ")}`;
}

/**
 * The time panel's `isTimeDisabled` for the bounds given as ISO times, or `undefined` when there
 * are none. Keyed by the ISO text so the function keeps its identity across renders, as the panel
 * asks.
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
 * What a key press asks of the field: a commit, or nothing. An `Enter` that is confirming an IME
 * composition belongs to the composition.
 */
function isCommitKey(event: KeyboardEvent<HTMLInputElement>): boolean {
  return event.key === "Enter" && !event.nativeEvent.isComposing;
}

// A caller's ref is a function, an object, or absent; forwarding it by hand is what lets a
// component keep a ref of its own to the same element.
function assignRef<T>(ref: Ref<T> | undefined, node: T | null) {
  if (typeof ref === "function") {
    ref(node);
  } else if (ref) {
    ref.current = node;
  }
}

/**
 * The committed value, controlled or not. `undefined` is how a controlled field spells "empty", so
 * `null` stands for that empty value inside `useControllableState`, whose own `undefined` means
 * "uncontrolled".
 */
function useCommittedDateTime(props: DateTimeFieldProps) {
  const { value, defaultValue, onChange } = props;
  const [current, setCurrent] = useControllableState<LocalDateTime | null>(
    "value" in props ? (value ?? null) : undefined,
    () => defaultValue ?? null,
    (next) => onChange?.(next ?? undefined),
  );
  return { committed: current ?? undefined, setCommitted: (next: LocalDateTime | undefined) => setCurrent(next ?? null) };
}

interface ClearButtonProps {
  label: string;
  onClear: () => void;
}

/**
 * The control emptying the field. Preventing the default of its mousedown keeps focus on the
 * input, so a press does not first blur the edit in progress into a commit that the clear would
 * then follow with a second `onChange`.
 */
function ClearButton({ label, onClear }: ClearButtonProps) {
  return (
    <button
      type="button"
      className="vpg-date-time-field-clear"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClear}
    >
      <X className="vpg-date-time-field-clear-icon" aria-hidden="true" />
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
 * field, flush with its start edge. The page behind stays interactive, so a press on the input
 * closes the pop-up and lands in the input. The button's mousedown is left alone: pressing it
 * blurs the input, and that blur commits typed text before the pop-up opens on it.
 */
function CalendarButton({ popup, label, disabled, content }: CalendarButtonProps) {
  return (
    <Popover
      content={content}
      className="vpg-date-time-field-panel"
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
        className="vpg-date-time-field-calendar-toggle"
        aria-label={label}
        aria-expanded={popup.isOpen}
        disabled={disabled}
      >
        <CalendarIcon className="vpg-date-time-field-calendar-toggle-icon" aria-hidden="true" />
      </button>
    </Popover>
  );
}

interface DateTimePickerProps
  extends Pick<
    DateTimeFieldProps,
    "minuteStep" | "previousMonthLabel" | "nextMonthLabel" | "hourLabel" | "minuteLabel" | "dayPeriodLabel"
  > {
  /** The pop-up's own box, which focus may move into without leaving the field. */
  panelRef: RefObject<HTMLDivElement | null>;
  /** The day the calendar selects and the time panel puts a time on. */
  day: LocalDate | undefined;
  /** The time the time panel selects. */
  time: LocalTime | undefined;
  onDayPick: (date: LocalDate | undefined) => void;
  onTimePick: (time: LocalTime) => void;
  onDone: () => void;
  popup: CalendarPopup;
  locale: Locale;
  today: LocalDate;
  dates: DateBounds;
  bounds: DateTimeBounds;
  doneLabel: string;
}

/**
 * What the pop-up holds: a `Calendar` over the bounds' dates, a `TimePanel` disabled until there is
 * a day and bounded by the times allowed on it, and the Done button.
 */
function DateTimePicker({
  panelRef,
  day,
  time,
  onDayPick,
  onTimePick,
  onDone,
  popup,
  locale,
  today,
  dates,
  bounds,
  minuteStep,
  previousMonthLabel,
  nextMonthLabel,
  hourLabel,
  minuteLabel,
  dayPeriodLabel,
  doneLabel,
}: DateTimePickerProps) {
  const times = timeBounds(day, bounds);
  const isTimeDisabled = useTimeDisabled(times.min?.toString(), times.max?.toString());
  return (
    // `tabIndex={-1}` makes a press anywhere in the pop-up land focus inside it rather than on the
    // page, which would read as focus leaving the field.
    <div ref={panelRef} className="vpg-date-time-field-picker" tabIndex={-1}>
      <Calendar
        value={day}
        onChange={onDayPick}
        month={popup.month}
        onMonthChange={popup.setMonth}
        locale={locale}
        today={today}
        min={dates.min}
        max={dates.max}
        previousMonthLabel={previousMonthLabel}
        nextMonthLabel={nextMonthLabel}
        autoFocus
      />
      <TimePanel
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
      <div className="vpg-date-time-field-actions">
        <Button size="sm" onClick={onDone}>
          {doneLabel}
        </Button>
      </div>
    </div>
  );
}

/**
 * A locale-aware date-time field: one text `<input>` inside the `FieldShell` that draws the
 * field's chrome, holding a date and a time in the locale's own patterns and order
 * (`10/15/2026 09:05 PM` in `en-US`, `15.10.2026 21:05` in `de-DE`), with a calendar button at
 * its start and a clear button at its end.
 *
 * The text in the box is what the user is writing; the committed value is the
 * `LocalDateTime | undefined` the caller owns. Typed text commits on blur or Enter, never per
 * keystroke. Text that reads as no date-time, or as one outside `min`..`max`, stays on screen
 * flagged through `aria-invalid` and commits nothing. The box shows the locale's format as its
 * placeholder and states the order of its fields in its `aria-description`.
 *
 * The calendar button opens a non-modal `Popover` holding a `Calendar`, a `TimePanel` and a Done
 * button; Done closes it and focuses the input, and `Escape` and an outside press close it with
 * focus back on the button. A picked day takes the committed time and commits when that lands
 * inside the bounds. Otherwise — an empty field, or a committed time the bounds rule out on that
 * day — the day is pending: the box shows it, nothing commits, and a picked time commits the two
 * together. A pending day flags the field `aria-invalid` only once focus leaves the whole field,
 * pop-up included. The time panel stays disabled until there is a day to put a time on, and on
 * the bounds' own dates disables the times outside them.
 *
 * The visible input carries no `name`: a sibling `<input type="hidden">` submits the committed
 * value as ISO 8601 (`2026-10-15T21:05`). `ref`, `className` and every other native attribute land
 * on the visible input.
 */
export function DateTimeField(props: DateTimeFieldProps) {
  const {
    value: _value,
    defaultValue: _defaultValue,
    onChange: _onChange,
    min,
    max,
    locale: localeProp,
    today: todayProp,
    minuteStep,
    clearLabel = "Clear date and time",
    open,
    defaultOpen,
    onOpenChange,
    openCalendarLabel = "Choose date and time",
    previousMonthLabel,
    nextMonthLabel,
    hourLabel,
    minuteLabel,
    dayPeriodLabel,
    doneLabel = "Done",
    className,
    name,
    disabled,
    readOnly,
    placeholder,
    ref,
    onFocus,
    onBlur,
    onKeyDown,
    "aria-invalid": ariaInvalid,
    "aria-description": ariaDescription,
    ...rest
  } = props;

  const locale = useLocale(localeProp);
  // Both strings depend only on the locale, and typing re-renders the field on every keystroke.
  const [defaultPlaceholder, defaultDescription] = useMemo(() => [formatHint(locale), formatDescription(locale)], [locale]);
  const today = todayProp ?? LocalDate.now();
  const bounds: DateTimeBounds = { min, max };
  const { committed, setCommitted } = useCommittedDateTime(props);
  const field = useDateTimeFieldState({ isControlled: "value" in props, committed, setCommitted, locale, bounds });

  const inputRef = useRef<HTMLInputElement>(null);
  const editable = !disabled && !readOnly;
  const dates = dateBounds(bounds);
  const popup = useCalendarPopup({
    open,
    defaultOpen,
    onOpenChange,
    editable,
    opening: () => openingMonth(field.day, today, dates.min, dates.max),
  });

  // Focus moves first: focusing adopts what is on screen as the draft, and doing that after the
  // clear would adopt the text the clear just removed.
  const clear = () => {
    inputRef.current?.focus();
    field.commit(undefined);
  };

  // The text as it stood when a composition began. A composition replaces the text an IME shows
  // as it goes, so the typing rule runs once, at its end, against what was there before it: a
  // composed Hangul syllable then counts as one appended character, not a string of rewrites.
  const compositionStart = useRef<string | undefined>(undefined);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    const composing = (event.nativeEvent as InputEvent).isComposing;
    field.setDraft(composing ? text : typeDateTimeText(field.display, text, locale));
  };

  const handleCompositionStart = () => {
    compositionStart.current = field.display;
  };

  const handleCompositionEnd = (event: CompositionEvent<HTMLInputElement>) => {
    const previous = compositionStart.current ?? field.display;
    compositionStart.current = undefined;
    field.setDraft(typeDateTimeText(previous, event.currentTarget.value, locale));
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    field.focus();
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    field.blur();
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // No `preventDefault()` and no `requestSubmit()`: the browser's implicit-submission rules
    // decide whether this Enter submits. That native submit reads the hidden input in this same
    // tick, before React would flush, so the commit's state updates are forced through first.
    if (isCommitKey(event)) flushSync(field.commitDraft);
    onKeyDown?.(event);
  };

  const classes = ["vpg-date-time-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");
  const showClear = editable && (committed !== undefined || field.display !== "");

  const content = (
    <DateTimePicker
      panelRef={field.fieldFocus.panelRef}
      day={field.day}
      time={field.pending === undefined ? committed?.time : undefined}
      onDayPick={field.pickDay}
      onTimePick={field.pickTimeOfDay}
      onDone={() => popup.closeOnto(inputRef.current)}
      popup={popup}
      locale={locale}
      today={today}
      dates={dates}
      bounds={bounds}
      minuteStep={minuteStep}
      previousMonthLabel={previousMonthLabel}
      nextMonthLabel={nextMonthLabel}
      hourLabel={hourLabel}
      minuteLabel={minuteLabel}
      dayPeriodLabel={dayPeriodLabel}
      doneLabel={doneLabel}
    />
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N date-time fields on a page inject
        one stylesheet.
      */}
      <style href="vpg-date-time-field" precedence="vpg-date-time-field">
        {dateTimeFieldStylesheet}
      </style>
      <FieldShell
        ref={popup.fieldRef}
        onFocus={field.fieldFocus.onFocus}
        onBlur={field.fieldFocus.onBlur}
        leading={<CalendarButton popup={popup} label={openCalendarLabel} disabled={!editable} content={content} />}
        trailing={showClear ? <ClearButton label={clearLabel} onClear={clear} /> : undefined}
      >
        <input
          {...rest}
          type="text"
          autoComplete="off"
          className={classes}
          disabled={disabled}
          readOnly={readOnly}
          value={field.display}
          placeholder={placeholder ?? defaultPlaceholder}
          aria-description={ariaDescription ?? defaultDescription}
          aria-invalid={field.invalid || ariaInvalid}
          onChange={handleChange}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          ref={(node) => {
            inputRef.current = node;
            assignRef(ref, node);
          }}
        />
        {/*
          The form value as an ISO 8601 date-time. The visible input carries no `name`, because
          naming it would submit the locale-formatted text and no server should have to parse
          that. Mirroring `disabled` keeps a disabled field out of the submission, as a disabled
          native control is.
        */}
        <input type="hidden" name={name} disabled={disabled} value={serialiseDateTime(committed)} />
      </FieldShell>
    </>
  );
}
