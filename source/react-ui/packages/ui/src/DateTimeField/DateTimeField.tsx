import { Calendar as CalendarIcon, X } from "@vipengele/react-icons";
import { useLocale } from "@vipengele/react-tokens";
import { type DateTimeSegment, type Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Button } from "../Button/Button.js";
import { Calendar } from "../Calendar/Calendar.js";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { type CalendarPopup, openingMonth, useCalendarPopup } from "../internal/useCalendarPopup.js";
import { useClearRejectedOnExternalChange } from "../internal/useClearRejectedOnExternalChange.js";
import { useControllableState } from "../internal/useControllableState.js";
import { Popover } from "../Popover/Popover.js";
import { TimePanel } from "../TimePanel/TimePanel.js";
import { dateTimeFieldStylesheet } from "./DateTimeField.stylesheet.js";
import {
  commitText,
  type DateTimeBounds,
  dateBounds,
  dateTimeSegments,
  formatDateTimeText,
  isOutOfBounds,
  isPendingFlagged,
  pickDate,
  pickTime,
  serialiseDateTime,
  timeBounds,
} from "./dateTimeFieldModel.js";

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

function formatValue(value: LocalDateTime | undefined, locale: Locale): string {
  return value === undefined ? "" : formatDateTimeText(value, locale);
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

  const isControlled = "value" in props;
  const locale = useLocale(localeProp);
  const today = todayProp ?? LocalDate.now();
  const bounds: DateTimeBounds = { min, max };
  const { committed, setCommitted } = useCommittedDateTime(props);

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(() => formatValue(committed, locale));
  const [focused, setFocused] = useState(false);
  // Set when the last commit found text that reads as no accepted date-time. The text stays on
  // screen — erasing what the user typed is how they lose the evidence of their own mistake.
  const [rejected, setRejected] = useState(false);
  // A day picked in the calendar that waits for a time before anything commits.
  const [pending, setPending] = useState<LocalDate | undefined>(undefined);
  // Set once focus leaves the whole field — input, buttons and pop-up — and cleared when it
  // comes back to any of them.
  const [focusLeft, setFocusLeft] = useState(false);
  // The text as it stood at the last commit. Re-reading an untouched text is a no-op, so a blur
  // that follows no edit skips it.
  const committedDraft = useRef(draft);

  // A controlled value moving on beneath an unfocused field replaces a rejected draft and a
  // pending day alike: both describe an edit of the value it moved away from.
  useClearRejectedOnExternalChange(isControlled, focused, committed?.toString(), rejected || pending !== undefined, () => {
    setRejected(false);
    setPending(undefined);
  });

  const display = focused || rejected || pending !== undefined ? draft : formatValue(committed, locale);
  const editable = !disabled && !readOnly;
  const day = pending ?? committed?.date;
  const dates = dateBounds(bounds);
  const times = timeBounds(day, bounds);
  const isTimeDisabled = useTimeDisabled(times.min?.toString(), times.max?.toString());
  const popup = useCalendarPopup({
    open,
    defaultOpen,
    onOpenChange,
    editable,
    opening: () => openingMonth(day, today, dates.min, dates.max),
  });

  /** Shows `text` in the box as the text of the last commit. */
  const settle = (text: string) => {
    setDraft(text);
    committedDraft.current = text;
    setRejected(false);
  };

  const commit = (next: LocalDateTime | undefined) => {
    settle(formatValue(next, locale));
    setPending(undefined);
    setCommitted(next);
  };

  /** Drops a rejected draft and a pending day, showing the committed value again. */
  const restore = () => {
    settle(formatValue(committed, locale));
    setPending(undefined);
  };

  const commitDraft = () => {
    if (draft === committedDraft.current) return;
    const result = commitText(draft, committed, locale, bounds);
    if (result.kind === "value") {
      commit(result.value);
    } else if (result.kind === "unchanged") {
      restore();
    } else {
      setRejected(true);
      committedDraft.current = draft;
    }
  };

  // The calendar is not clearable, so it reports a date on every pick.
  const handleDayPick = (date: LocalDate | undefined) => {
    const pick = pickDate(date as LocalDate, committed, bounds);
    if (pick.kind === "pending") {
      settle(pick.date.format(locale));
      setPending(pick.date);
    } else if (pick.kind === "value") {
      commit(pick.value);
    } else {
      restore();
    }
  };

  const handleTimePick = (time: LocalTime) => {
    const result = pickTime(time, pending, committed, bounds);
    if (result.kind === "value") commit(result.value);
  };

  // Focus moves first: focusing adopts what is on screen as the draft, and doing that after the
  // clear would adopt the text the clear just removed.
  const clear = () => {
    inputRef.current?.focus();
    commit(undefined);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    // The box may be showing text the draft state does not hold — a controlled parent that
    // declined the last commit, for one. Adopting it here is what stops the text jumping as focus
    // lands.
    setDraft(display);
    committedDraft.current = display;
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
    commitDraft();
    setFocused(false);
    onBlur?.(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // No `preventDefault()` and no `requestSubmit()`: the browser's implicit-submission rules
    // decide whether this Enter submits. That native submit reads the hidden input in this same
    // tick, before React would flush, so the commit's state updates are forced through first.
    if (isCommitKey(event)) flushSync(commitDraft);
    onKeyDown?.(event);
  };

  // The pop-up is portaled out of the shell, so React's focus events reach the shell from it while
  // the DOM does not nest it there; both boxes are checked for where focus went.
  const handleFieldBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    const inside = next instanceof Node && (event.currentTarget.contains(next) || panelRef.current?.contains(next) === true);
    if (!inside) setFocusLeft(true);
  };

  const committedRejected = committed !== undefined && isOutOfBounds(committed, bounds);
  const invalid = rejected || committedRejected || isPendingFlagged(pending, focusLeft) || ariaInvalid;
  const classes = ["vpg-date-time-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");
  const showClear = editable && (committed !== undefined || display !== "");

  const content = (
    // `tabIndex={-1}` makes a press anywhere in the pop-up land focus inside it rather than on the
    // page, which would read as focus leaving the field.
    <div ref={panelRef} className="vpg-date-time-field-picker" tabIndex={-1}>
      <Calendar
        value={day}
        onChange={handleDayPick}
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
        value={pending === undefined ? committed?.time : undefined}
        onChange={handleTimePick}
        locale={locale}
        minuteStep={minuteStep}
        isTimeDisabled={isTimeDisabled}
        disabled={day === undefined}
        hourLabel={hourLabel}
        minuteLabel={minuteLabel}
        dayPeriodLabel={dayPeriodLabel}
      />
      <div className="vpg-date-time-field-actions">
        <Button size="sm" onClick={() => popup.closeOnto(inputRef.current)}>
          {doneLabel}
        </Button>
      </div>
    </div>
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
        onFocus={() => setFocusLeft(false)}
        onBlur={handleFieldBlur}
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
          value={display}
          placeholder={placeholder ?? formatHint(locale)}
          aria-description={ariaDescription ?? formatDescription(locale)}
          aria-invalid={invalid}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
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
