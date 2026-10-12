import { Calendar as CalendarIcon, X } from "@vipengele/react-icons";
import { useLocale } from "@vipengele/react-tokens";
import { type Locale, LocalDate } from "@vipengele/ts";
import {
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Calendar } from "../Calendar/Calendar.js";
import { Dialog } from "../Dialog/Dialog.js";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { useControllableState } from "../internal/useControllableState.js";
import { NARROW_VIEWPORT_QUERY, useMediaQuery } from "../internal/useMediaQuery.js";
import { Popover } from "../Popover/Popover.js";
import { dateFieldStylesheet } from "./DateField.stylesheet.js";
import { type DateConstraints, parseDateInput, segmentAt, stepDate } from "./dateFieldEditing.js";

export interface DateFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "min" | "max" | "step"> {
  /** A ref to the visible `<input>` — the element a caller focuses and selects text in. The
   * hidden input that carries the form value is not reachable through it.
   * `InputHTMLAttributes` carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLInputElement>;
  /** The controlled value. Passing the prop at all makes the field controlled, so
   * `value={undefined}` is a controlled, empty field. While the input has focus an update to it
   * does not reach the box: the edit under the caret wins until the user commits. */
  value?: LocalDate;
  /** The initial value of an uncontrolled field. */
  defaultValue?: LocalDate;
  /** Called on **commit** only — blur, Enter, an arrow-key step or the clear button — never per
   * keystroke. An emptied field reports `undefined`; text that does not read as an accepted date
   * reports nothing and stays on screen, flagged through `aria-invalid`. */
  onChange?: (value: LocalDate | undefined) => void;
  /** The earliest date the field commits, inclusive. A step stops at it. */
  min?: LocalDate;
  /** The latest date the field commits, inclusive. A step stops at it. */
  max?: LocalDate;
  /** Reports a date the field does not commit. A step walks past it to the next enabled date. */
  isDateDisabled?: (date: LocalDate) => boolean;
  /** The locale dates are written and read in. Defaults to the nearest `LocaleProvider`'s, then
   * the runtime's own. */
  locale?: Locale;
  /** The date an arrow key in an empty field steps onto. Defaults to `LocalDate.now()`. */
  today?: LocalDate;
  /** The clear button's accessible name. Defaults to `"Clear date"`. */
  clearLabel?: string;
  /** Controls the calendar pop-up. Supplying it hands the state to the caller: the pop-up then
   * opens and closes only when this prop changes, and reports every request through
   * `onOpenChange`. A disabled or read-only field shows no pop-up whatever this says. */
  open?: boolean;
  /** Seeds the uncontrolled state of the calendar pop-up. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every request to open or close the calendar pop-up — the calendar button, a
   * picked date, an outside press, `Escape` — in both the controlled and the uncontrolled form. A
   * disabled or read-only field requests no opening. */
  onOpenChange?: (open: boolean) => void;
  /** The calendar button's accessible name. Defaults to `"Choose date"`. */
  openCalendarLabel?: string;
  /** The calendar's previous-month button's accessible name. Defaults to `"Previous month"`. */
  previousMonthLabel?: string;
  /** The calendar's next-month button's accessible name. Defaults to `"Next month"`. */
  nextMonthLabel?: string;
}

/** What each field of a date is called in the format description. */
const SEGMENT_LABELS = { year: "year", month: "month", day: "day" } as const;

/** Any date will do: the format description reads only the order of its fields. */
const SAMPLE_DATE = LocalDate.of(2000, 1, 1);

/** The arrow keys that step the segment under the caret, and the direction each steps it in. */
const STEP_KEYS: Partial<Record<string, 1 | -1>> = { ArrowUp: 1, ArrowDown: -1 };

function formatValue(date: LocalDate | undefined, locale: Locale): string {
  return date === undefined ? "" : date.format(locale);
}

/** The fields of `locale`'s date pattern in the order it writes them: `Format: month / day / year`. */
function formatDescription(locale: Locale): string {
  const fields = SAMPLE_DATE.segments(locale).flatMap((segment) => (segment.type === "literal" ? [] : [SEGMENT_LABELS[segment.type]]));
  return `Format: ${fields.join(" / ")}`;
}

/** Whether the field would commit `date` as written in `locale`: inside the bounds and not disabled. */
function isAccepted(date: LocalDate, locale: Locale, constraints: DateConstraints): boolean {
  return parseDateInput(date.format(locale), locale, constraints).status === "valid";
}

/**
 * The date an arrow key at offset `caret` steps `text` onto: the segment under the caret moved one
 * step, or `today` when the text is empty. `undefined` when the text is neither empty nor a date
 * as the field writes one — the caret then names no segment — or when the step lands on a date the
 * field does not commit.
 */
function stepText(
  text: string,
  caret: number,
  direction: 1 | -1,
  locale: Locale,
  today: LocalDate,
  constraints: DateConstraints,
): LocalDate | undefined {
  const range = segmentAt(text, caret, locale);
  if (range === undefined && text.trim() !== "") return undefined;
  const base = range === undefined ? undefined : LocalDate.parseLocalized(text, locale);
  const next = stepDate(base, range?.segment ?? "day", direction, today, constraints);
  return next !== undefined && isAccepted(next, locale, constraints) ? next : undefined;
}

/**
 * What a key press asks of the field: a step in one direction, a commit, or nothing. An `Enter`
 * that is confirming an IME composition asks for nothing, since it belongs to the composition, and
 * a read-only field steps nowhere.
 */
function keyIntent(event: KeyboardEvent<HTMLInputElement>, readOnly: boolean | undefined): 1 | -1 | "commit" | undefined {
  if (event.key === "Enter") return event.nativeEvent.isComposing ? undefined : "commit";
  return readOnly ? undefined : STEP_KEYS[event.key];
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
 * Clears the rejected flag when a controlled `value` moves on without the user touching the box.
 * A parent moving `value` on is not visible to `commit()`, so it is caught by comparing against the
 * `value` last acted on, on every unfocused render — deliberately *not* updated while focused, so a
 * `value` that changes mid-edit is still caught once the field blurs rather than being consumed
 * here and missed there. Dates compare by their ISO string, so a parent that rebuilds the same
 * date on every render is not a change.
 */
function useClearRejectedOnExternalChange(
  isControlled: boolean,
  focused: boolean,
  iso: string | undefined,
  rejected: boolean,
  setRejected: (next: boolean) => void,
) {
  const [previousControlledIso, setPreviousControlledIso] = useState(iso);
  if (isControlled && !focused && iso !== previousControlledIso) {
    setPreviousControlledIso(iso);
    if (rejected) {
      setRejected(false);
    }
  }
}

interface ClearButtonProps {
  label: string;
  onClear: () => void;
}

/**
 * The control emptying the field. A real `<button>`, so it is a tab stop and carries its name into
 * the accessibility tree. Preventing the default of its mousedown keeps focus on the input, so a
 * press does not first blur the edit in progress into a commit that the clear would then follow
 * with a second `onChange`.
 */
function ClearButton({ label, onClear }: ClearButtonProps) {
  return (
    <button
      type="button"
      className="vpg-date-field-clear"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClear}
    >
      <X className="vpg-date-field-clear-icon" aria-hidden="true" />
    </button>
  );
}

/**
 * The month the calendar opens on: the committed date's, else today's. A today outside
 * `min`..`max` gives way to the bound it lies past, so a field whose every acceptable date lies in
 * the past or the future opens on the nearest month that holds one.
 */
function openingMonth(
  committed: LocalDate | undefined,
  today: LocalDate,
  min: LocalDate | undefined,
  max: LocalDate | undefined,
): LocalDate {
  if (committed !== undefined) return committed;
  if (min !== undefined && LocalDate.compare(today, min) < 0) return min;
  if (max !== undefined && LocalDate.compare(today, max) > 0) return max;
  return today;
}

/**
 * The month the open calendar shows: `opening()` each time the pop-up opens, then wherever the
 * user navigates while it stays open. The reset happens on the render that first sees the pop-up
 * open, so the calendar mounts on that month rather than showing the last one for a frame.
 */
function usePanelMonth(isOpen: boolean, opening: () => LocalDate): [LocalDate, (month: LocalDate) => void] {
  const [wasOpen, setWasOpen] = useState(false);
  const [month, setMonth] = useState(opening);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setMonth(opening());
  }
  return [month, setMonth];
}

interface CalendarPopupOptions {
  open: boolean | undefined;
  defaultOpen: boolean | undefined;
  onOpenChange: ((open: boolean) => void) | undefined;
  /** Whether the field takes edits. A disabled or read-only field shows no pop-up and requests no
   * opening. */
  editable: boolean;
  /** The month a fresh opening shows. */
  opening: () => LocalDate;
}

interface CalendarPopup {
  isOpen: boolean;
  month: LocalDate;
  setMonth: (month: LocalDate) => void;
  /** Whether the pop-up is a `Dialog` rather than a `Popover`: the viewport is below the narrow
   * breakpoint. */
  narrow: boolean;
  /** Whether the `Dialog` holds the calendar. Always `false` while the pop-up is a `Popover`. */
  dialogReady: boolean;
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** Where focus goes when the pop-up closes: the calendar button, unless `closeOnto` names
   * another element for this one closing. */
  returnFocus: RefObject<HTMLElement | null>;
  /** Asks for the pop-up open or closed, the way the `Popover` around the button does. */
  request: (open: boolean) => void;
  /** Closes the pop-up and returns focus to `target` rather than to the calendar button. */
  closeOnto: (target: HTMLElement | null) => void;
}

/**
 * The two focus steps of the `Dialog` host, neither of which the native `<dialog>` takes the way
 * the field needs, and whether the dialog holds the calendar yet.
 *
 * A closed `<dialog>` lays nothing out, so nothing inside it takes focus, and `showModal()` then
 * focuses the dialog's first focusable descendant — the previous-month button, not a day. The
 * calendar therefore mounts only on the commit after the dialog opened: this effect runs after the
 * `Dialog`'s own, which calls `showModal()`, so the calendar's `autoFocus` lands on its day.
 *
 * `close()` restores focus to whatever held it before `showModal()`: the button for an opening
 * from it, a day of a since-unmounted popover for a dialog that took over on a breakpoint flip.
 * Focusing the return target here, after the `Dialog`'s effect closed the element, overrides that
 * restoration — the input after a pick, the button otherwise. A flip to the `Popover` while open
 * is not a close, and moves no focus.
 */
function useDialogHost(inDialog: boolean, isOpen: boolean, returnFocus: RefObject<HTMLElement | null>): boolean {
  const [ready, setReady] = useState(false);
  const wasInDialog = useRef(false);

  useEffect(() => {
    // Every opening aims the return target at the button, so it is set by the time a dialog that
    // was open closes.
    if (wasInDialog.current && !isOpen) (returnFocus.current as HTMLElement).focus();
    wasInDialog.current = inDialog;
    setReady(inDialog);
  }, [inDialog, isOpen, returnFocus]);

  return ready && inDialog;
}

/**
 * The calendar pop-up's open state, controlled or not, the host it opens in, the month it shows
 * and where focus lands when it closes. The return target is read by the `Popover` as the panel
 * closes, so `closeOnto` re-aims it just before asking for the close, and every opening aims it
 * back at the button — `Escape` and an outside press return there. A breakpoint flip mounts a new
 * button, so it re-aims the target too.
 *
 * The open state and the month live here, above the host, so a flip while open swaps the
 * `Popover` for the `Dialog` or back with the pop-up still open and on the same month.
 */
function useCalendarPopup({ open, defaultOpen, onOpenChange, editable, opening }: CalendarPopupOptions): CalendarPopup {
  const [requested, setRequested] = useControllableState(open, () => defaultOpen ?? false, onOpenChange);
  const isOpen = requested && editable;
  const narrow = useMediaQuery(NARROW_VIEWPORT_QUERY);
  const [month, setMonth] = usePanelMonth(isOpen, opening);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const dialogReady = useDialogHost(isOpen && narrow, isOpen, returnFocus);

  // biome-ignore lint/correctness/useExhaustiveDependencies: `narrow` is a dependency only so that a breakpoint flip, which mounts a new button, re-aims the return target at it
  useLayoutEffect(() => {
    if (isOpen) returnFocus.current = buttonRef.current;
  }, [isOpen, narrow]);

  const request = (next: boolean) => {
    if (editable || !next) setRequested(next);
  };

  const closeOnto = (target: HTMLElement | null) => {
    returnFocus.current = target;
    request(false);
  };

  return { isOpen, month, setMonth, narrow, dialogReady, buttonRef, returnFocus, request, closeOnto };
}

/** The calendar button's accessible name, and the calendar dialog's, when `openCalendarLabel` is
 * not given. */
const DEFAULT_OPEN_CALENDAR_LABEL = "Choose date";

interface ToggleButtonProps {
  popup: CalendarPopup;
  label: string;
  disabled: boolean;
  "aria-haspopup"?: "dialog";
  "aria-expanded"?: boolean;
  onClick?: () => void;
}

/** The `<button>` opening the calendar. Whatever host it opens supplies its `aria-haspopup`,
 * `aria-expanded` and, for the `Dialog`, its click handler. */
function ToggleButton({ popup, label, ...rest }: ToggleButtonProps) {
  return (
    <button {...rest} ref={popup.buttonRef} type="button" className="vpg-date-field-calendar-toggle" aria-label={label}>
      <CalendarIcon className="vpg-date-field-calendar-toggle-icon" aria-hidden="true" />
    </button>
  );
}

interface CalendarButtonProps {
  popup: CalendarPopup;
  label: string | undefined;
  disabled: boolean;
  /** What the pop-up holds. */
  calendar: ReactNode;
}

/**
 * The control opening the calendar, and the host the calendar opens in.
 *
 * At or above the narrow breakpoint the host is a `Popover` anchored to the button. The `<button>`
 * is the popover's direct child, so the popover merges its `aria-haspopup`/`aria-expanded`/
 * `aria-controls` onto the button itself.
 *
 * Below it the host is a modal `Dialog`, named like the button, beside the button in the leading
 * slot; it sits in the top layer, so where it renders does not move it. The button then states
 * its own `aria-haspopup` and `aria-expanded`. The `Dialog` holds the calendar only once
 * `useDialogHost` has seen it open.
 *
 * The button's mousedown is left alone in both: pressing it moves focus out of the input, and that
 * blur commits a typed date before the press opens the calendar on it.
 */
function CalendarButton({ popup, label = DEFAULT_OPEN_CALENDAR_LABEL, disabled, calendar }: CalendarButtonProps) {
  if (popup.narrow) {
    return (
      <>
        <ToggleButton
          popup={popup}
          label={label}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={popup.isOpen}
          onClick={() => popup.request(!popup.isOpen)}
        />
        <Dialog aria-label={label} className="vpg-date-field-dialog" open={popup.isOpen} onOpenChange={popup.request}>
          {popup.dialogReady ? calendar : null}
        </Dialog>
      </>
    );
  }
  return (
    <Popover
      content={calendar}
      className="vpg-date-field-panel"
      open={popup.isOpen}
      onOpenChange={popup.request}
      returnFocus={popup.returnFocus}
    >
      <ToggleButton popup={popup} label={label} disabled={disabled} />
    </Popover>
  );
}

/**
 * A locale-aware date field: one text `<input>` inside the `FieldShell` that draws the field's
 * chrome, holding a date in the locale's numeric pattern (`10/01/2026` in `en-US`, `01.10.2026` in
 * `de-DE`). There is no native `<input type="date">` underneath (ADR-0025).
 *
 * Two values live here, and they are not the same value. The text in the box is what the user is
 * writing, free-form and possibly half-typed; the committed value is the `LocalDate | undefined`
 * the caller owns. `onChange` fires when the two are reconciled — on blur, on Enter, on an
 * arrow-key step or on the clear button — never per keystroke. Typed text reads in the locale's
 * pattern or as ISO 8601; text that reads as no date, or as one outside `min`..`max` or reported by
 * `isDateDisabled`, stays on screen flagged through `aria-invalid` and commits nothing.
 *
 * ArrowUp and ArrowDown step the day, month or year under the caret, commit at once and leave that
 * segment selected; in an empty field they step onto `today`. A step stops at `min` and `max` and
 * walks past disabled dates. The input's `aria-description` states the locale's field order.
 *
 * A button at the field's start opens a `Calendar` in a `Popover`, or in a modal `Dialog` below
 * the narrow-viewport breakpoint; typing in the box never does. A breakpoint flip while it is open
 * swaps the host and keeps it open on the same month. Each opening shows the committed date's
 * month, else today's, else the month of the bound today lies past, and focuses the calendar's
 * grid. A pick commits like any other commit, closes the pop-up and focuses the input; `Escape`
 * and an outside press close it with focus back on the button. A disabled or read-only field's
 * button is disabled.
 *
 * The visible input carries no `name`: a sibling `<input type="hidden">` submits the committed
 * value as an ISO 8601 date (`2026-10-01`), so a server never parses a locale-formatted string.
 * `ref`, `className` and every other native attribute land on the visible input.
 */
export function DateField(props: DateFieldProps) {
  const {
    value,
    defaultValue,
    onChange,
    min,
    max,
    isDateDisabled,
    locale: localeProp,
    today: todayProp,
    clearLabel = "Clear date",
    open,
    defaultOpen,
    onOpenChange,
    openCalendarLabel,
    previousMonthLabel,
    nextMonthLabel,
    className,
    name,
    disabled,
    readOnly,
    ref,
    onFocus,
    onBlur,
    onKeyDown,
    "aria-invalid": ariaInvalid,
    "aria-description": ariaDescription,
    ...rest
  } = props;

  // A controlled field is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled field spells "empty".
  const isControlled = "value" in props;

  // The `locale` prop, else the nearest `LocaleProvider`, else the runtime's own locale.
  const locale = useLocale(localeProp);
  const today = todayProp ?? LocalDate.now();
  const constraints: DateConstraints = { min, max, isDateDisabled };

  const inputRef = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState<LocalDate | undefined>(defaultValue);
  const [draft, setDraft] = useState(() => formatValue(isControlled ? value : defaultValue, locale));
  const [focused, setFocused] = useState(false);
  // Set when the last commit found text that reads as no accepted date. The text stays on screen —
  // erasing what the user typed is how they lose the evidence of their own mistake.
  const [rejected, setRejected] = useState(false);
  // The text as it stood at the last commit. Re-reading an untouched text is a no-op, so a blur
  // that follows no edit skips it.
  const committedDraft = useRef(draft);

  const committed = isControlled ? value : uncontrolledValue;
  const iso = committed?.toString();
  useClearRejectedOnExternalChange(isControlled, focused, iso, rejected, setRejected);

  const display = focused || rejected ? draft : formatValue(committed, locale);
  const committedRejected = committed !== undefined && !isAccepted(committed, locale, constraints);
  const editable = !disabled && !readOnly;
  const popup = useCalendarPopup({ open, defaultOpen, onOpenChange, editable, opening: () => openingMonth(committed, today, min, max) });

  const commit = (next: LocalDate | undefined) => {
    const text = formatValue(next, locale);
    setUncontrolledValue(next);
    setDraft(text);
    setRejected(false);
    committedDraft.current = text;
    onChange?.(next);
  };

  const commitDraft = () => {
    if (draft === committedDraft.current) {
      return;
    }
    const result = parseDateInput(draft, locale, constraints);
    if (result.status === "rejected") {
      setRejected(true);
      committedDraft.current = draft;
      return;
    }
    commit(result.status === "valid" ? result.value : undefined);
  };

  const stepBy = (input: HTMLInputElement, direction: 1 | -1) => {
    // A text input always has a selection, so `selectionStart` is never null here.
    const caret = input.selectionStart as number;
    const next = stepText(display, caret, direction, locale, today, constraints);
    if (next === undefined) {
      return;
    }
    // Flushed so the input holds the stepped text before the selection is placed in it; React
    // writing the value afterwards would move the caret to the end.
    flushSync(() => commit(next));
    const range = segmentAt(input.value, caret, locale);
    if (range !== undefined) {
      input.setSelectionRange(range.start, range.end);
    }
  };

  // Focus moves first: focusing adopts what is on screen as the draft, and doing that after the
  // clear would adopt the text the clear just removed.
  const clear = () => {
    inputRef.current?.focus();
    commit(undefined);
  };

  // A pick replaces whatever the box holds, a rejected draft included, and hands focus to the input
  // rather than back to the calendar button.
  const pick = (next: LocalDate | undefined) => {
    commit(next);
    popup.closeOnto(inputRef.current);
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
    const intent = keyIntent(event, readOnly);
    if (intent === "commit") {
      // No `preventDefault()` and no `requestSubmit()`: the browser's implicit-submission rules
      // decide whether this Enter submits. That native submit reads the hidden input in this same
      // tick, before React would flush, so the commit's state updates are forced through first.
      flushSync(commitDraft);
    } else if (intent !== undefined) {
      event.preventDefault();
      stepBy(event.currentTarget, intent);
    }
    onKeyDown?.(event);
  };

  const classes = ["vpg-date-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");
  const showClear = editable && (committed !== undefined || display !== "");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N date fields on a page inject one
        stylesheet.
      */}
      <style href="vpg-date-field" precedence="vpg-date-field">
        {dateFieldStylesheet}
      </style>
      <FieldShell
        leading={
          <CalendarButton
            popup={popup}
            label={openCalendarLabel}
            disabled={!editable}
            calendar={
              <Calendar
                value={committed}
                onChange={pick}
                month={popup.month}
                onMonthChange={popup.setMonth}
                locale={locale}
                today={today}
                min={min}
                max={max}
                isDateDisabled={isDateDisabled}
                previousMonthLabel={previousMonthLabel}
                nextMonthLabel={nextMonthLabel}
                autoFocus
              />
            }
          />
        }
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
          aria-description={ariaDescription ?? formatDescription(locale)}
          aria-invalid={rejected || committedRejected || ariaInvalid}
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
          The form value as an ISO 8601 date. The visible input carries no `name`, because naming
          it would submit the locale-formatted text and no server should have to parse that.
          Mirroring `disabled` keeps a disabled field out of the submission, as a disabled native
          control is.
        */}
        <input type="hidden" name={name} disabled={disabled} value={iso ?? ""} />
      </FieldShell>
    </>
  );
}
