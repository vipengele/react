import { Calendar as CalendarIcon, X } from "@vipengele/react-icons";
import { useLocale } from "@vipengele/react-tokens";
import { type Locale, LocalDate } from "@vipengele/ts";
import {
  type FocusEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useId,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { type DateConstraints, formatHint, segmentAt, withSeparator } from "../DateField/dateFieldEditing.js";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { openingMonth, useCalendarPopup, type CalendarPopup } from "../internal/useCalendarPopup.js";
import { useClearRejectedOnExternalChange } from "../internal/useClearRejectedOnExternalChange.js";
import type { DateRange } from "../internal/localRange.js";
import { Popover } from "../Popover/Popover.js";
import { RangeCalendar } from "../RangeCalendar/RangeCalendar.js";
import { dateRangeFieldStylesheet } from "./DateRangeField.stylesheet.js";
import {
  committedInvalidEnds,
  decideRange,
  formatDescription,
  formatRange,
  invalidEnds,
  type RangeDrafts,
  type RangeEnd,
  type RangeIssue,
  rangeAnchor,
  rangeKey,
  sameDrafts,
  stepDraft,
} from "./dateRangeFieldModel.js";

export interface DateRangeFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "role" | "children" | "name"> {
  /** A ref to the `role="group"` element holding the two editors — the element `FormField` labels.
   * The hidden inputs that carry the form values are not reachable through it. `HTMLAttributes`
   * carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLDivElement>;
  /** The controlled range. Passing the prop at all makes the field controlled, so
   * `value={undefined}` is a controlled, empty field. While focus is in the field an update to it
   * does not reach the editors: the edit in progress wins until the user commits. */
  value?: DateRange;
  /** The initial range of an uncontrolled field. */
  defaultValue?: DateRange;
  /** Called on **commit** only — an editor's blur, Enter, an arrow-key step, the calendar's second
   * pick or the clear button — and only when both ends read as accepted dates with the start not
   * after the end, or when both editors are empty, for `undefined`. One empty editor, text that
   * reads as no accepted date, or an end before the start reports nothing and stays on screen,
   * flagged through `aria-invalid`. */
  onChange?: (range: DateRange | undefined) => void;
  /** The earliest date either end may be, inclusive. A step stops at it. */
  min?: LocalDate;
  /** The latest date either end may be, inclusive. A step stops at it. */
  max?: LocalDate;
  /** Reports a date that cannot be an end of the range. A range may still run across it. */
  isDateDisabled?: (date: LocalDate) => boolean;
  /** The locale dates are written and read in. Defaults to the nearest `LocaleProvider`'s, then
   * the runtime's own. */
  locale?: Locale;
  /** The date an arrow key in an empty editor steps onto. Defaults to `LocalDate.now()`. */
  today?: LocalDate;
  /** Disables both editors and both buttons, and leaves the field out of a submitted form. */
  disabled?: boolean;
  /** Makes both editors read-only: no step, no clear button and no calendar. */
  readOnly?: boolean;
  /** Marks both editors as required, so a form's own validation asks for both ends. */
  required?: boolean;
  /** The form field name of a hidden input carrying the committed start as an ISO 8601 date.
   * Absent, no input is rendered for the start. */
  startName?: string;
  /** The form field name of a hidden input carrying the committed end as an ISO 8601 date. Absent,
   * no input is rendered for the end. */
  endName?: string;
  /** The start editor's own name, read after the field's label. Defaults to `"Start"`. */
  startLabel?: string;
  /** The end editor's own name, read after the field's label. Defaults to `"End"`. */
  endLabel?: string;
  /** The clear button's accessible name. Defaults to `"Clear dates"`. */
  clearLabel?: string;
  /** Controls the calendar pop-up. Supplying it hands the state to the caller: the pop-up then
   * opens and closes only when this prop changes, and reports every request through
   * `onOpenChange`. A disabled or read-only field shows no pop-up whatever this says. */
  open?: boolean;
  /** Seeds the uncontrolled state of the calendar pop-up. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every request to open or close the calendar pop-up — the calendar button, a
   * completing pick, an outside press, `Escape` — in both the controlled and the uncontrolled
   * form. A disabled or read-only field requests no opening. */
  onOpenChange?: (open: boolean) => void;
  /** The calendar button's accessible name. Defaults to `"Choose dates"`. */
  openCalendarLabel?: string;
  /** The calendar's previous-month button's accessible name. Defaults to `"Previous month"`. */
  previousMonthLabel?: string;
  /** The calendar's next-month button's accessible name. Defaults to `"Next month"`. */
  nextMonthLabel?: string;
}

/** The arrow keys that step the segment under the caret, and the direction each steps it in. */
const STEP_KEYS: Partial<Record<string, 1 | -1>> = { ArrowUp: 1, ArrowDown: -1 };

/**
 * What a key press asks of an editor: a step in one direction, a commit, or nothing. An `Enter`
 * that is confirming an IME composition asks for nothing, since it belongs to the composition, and
 * a read-only field steps nowhere.
 */
function keyIntent(event: KeyboardEvent<HTMLInputElement>, readOnly: boolean | undefined): 1 | -1 | "commit" | undefined {
  if (event.key === "Enter") return event.nativeEvent.isComposing ? undefined : "commit";
  return readOnly ? undefined : STEP_KEYS[event.key];
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
      className="vpg-date-range-field-clear"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClear}
    >
      <X className="vpg-date-range-field-clear-icon" aria-hidden="true" />
    </button>
  );
}

interface CalendarButtonProps {
  popup: CalendarPopup;
  label: string;
  disabled: boolean;
  /** What the pop-up holds. */
  calendar: ReactNode;
}

/**
 * The control opening the calendar, and the non-modal `Popover` it opens in, hanging below the
 * whole field and flush with its start edge. The button states its own `aria-expanded`; the panel
 * is no dialog, and a press on an editor closes it and lands in that editor.
 *
 * The button's mousedown is left alone: pressing it moves focus out of an editor, and that blur
 * commits the typed text before the press opens the calendar on it.
 */
function CalendarButton({ popup, label, disabled, calendar }: CalendarButtonProps) {
  return (
    <Popover
      content={calendar}
      className="vpg-date-range-field-panel"
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
        className="vpg-date-range-field-calendar-toggle"
        aria-label={label}
        aria-expanded={popup.isOpen}
        disabled={disabled}
      >
        <CalendarIcon className="vpg-date-range-field-calendar-toggle-icon" aria-hidden="true" />
      </button>
    </Popover>
  );
}

/**
 * A field for a range of dates: a start editor and an end editor, each a text `<input>` holding a
 * date in the locale's numeric pattern as `DateField`'s does, inside one `role="group"` that is the
 * `FieldShell`'s marked control (ADR-0052).
 *
 * The texts in the editors are what the user is writing; the committed value is the
 * `DateRange | undefined` the caller owns. Each editor reads its text by `DateField`'s rules when
 * it is committed — on blur, on Enter, on an arrow-key step — and the two readings decide together:
 * two accepted dates with the start not after the end commit the range, two empty editors commit
 * `undefined`, and anything else commits nothing. Text that reads as no accepted date, and an end
 * before the start, flag the editors at fault through `aria-invalid` at once; the ends are never
 * swapped. One empty editor is incomplete, flagged once focus has left the field. The texts stay
 * on screen and the committed range stands until the pair commits.
 *
 * The group takes the field's label — `aria-label`, `aria-labelledby`, or `FormField`'s, which is
 * cloned onto it with the rest of its attributes. Each editor is named by `aria-labelledby` as that
 * label followed by its own "Start" or "End" (`startLabel`, `endLabel`), so two range fields on one
 * page read apart.
 *
 * A button at the field's start opens a `RangeCalendar` in a non-modal `Popover` below the field.
 * Its first pick fills the start editor, empties the end editor and keeps the calendar open; its
 * second pick commits the range, closes the calendar and focuses the end editor. A start typed with
 * the end still empty is the calendar's pending anchor, so a pick completes the range from it.
 * `Escape` and an outside press close the calendar with focus back on the button.
 *
 * The editors carry no `name`. `startName` and `endName` each render a hidden input submitting that
 * end of the committed range as an ISO 8601 date; the field has no `name` of its own. `ref`,
 * `className` and every other native attribute land on the group.
 */
export function DateRangeField(props: DateRangeFieldProps) {
  const {
    value,
    defaultValue,
    onChange,
    min,
    max,
    isDateDisabled,
    locale: localeProp,
    today: todayProp,
    disabled,
    readOnly,
    required,
    startName,
    endName,
    startLabel = "Start",
    endLabel = "End",
    clearLabel = "Clear dates",
    open,
    defaultOpen,
    onOpenChange,
    openCalendarLabel = "Choose dates",
    previousMonthLabel,
    nextMonthLabel,
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
  const today = todayProp ?? LocalDate.now();
  const constraints: DateConstraints = { min, max, isDateDisabled };

  const generatedId = useId();
  const groupId = id ?? generatedId;
  const startLabelId = `${generatedId}-start`;
  const endLabelId = `${generatedId}-end`;

  const inputRefs: Record<RangeEnd, RefObject<HTMLInputElement | null>> = {
    start: useRef<HTMLInputElement>(null),
    end: useRef<HTMLInputElement>(null),
  };
  const [uncontrolledValue, setUncontrolledValue] = useState<DateRange | undefined>(defaultValue);
  const committed = isControlled ? value : uncontrolledValue;
  const [drafts, setDrafts] = useState<RangeDrafts>(() => formatRange(committed, locale));
  // The texts as they stood at the last decision. Deciding untouched texts again is a no-op, so
  // focus moving between the editors with no edit commits nothing.
  const [decided, setDecided] = useState<RangeDrafts>(drafts);
  // What the last decision found when it committed nothing. The texts stay on screen while it is
  // set — erasing what the user typed is how they lose the evidence of their own mistake.
  const [issue, setIssue] = useState<RangeIssue | undefined>(undefined);
  // Whether focus is on one of the editors.
  const [focused, setFocused] = useState(false);

  const editable = !disabled && !readOnly;
  // The editors show the drafts while the user works on them, else the committed range.
  const live = focused || issue !== undefined;
  const display = live ? drafts : formatRange(committed, locale);
  const anchor = live ? rangeAnchor(drafts, locale, constraints) : undefined;
  const popup = useCalendarPopup({
    open,
    defaultOpen,
    onOpenChange,
    editable,
    opening: () => openingMonth(anchor ?? committed?.start, today, min, max),
  });
  useClearRejectedOnExternalChange(isControlled, focused || popup.isOpen, rangeKey(committed), issue !== undefined, () =>
    setIssue(undefined),
  );

  const commit = (next: DateRange | undefined) => {
    const texts = formatRange(next, locale);
    setUncontrolledValue(next);
    setDrafts(texts);
    setDecided(texts);
    setIssue(undefined);
    onChange?.(next);
  };

  const decide = (texts: RangeDrafts) => {
    if (sameDrafts(texts, decided)) {
      return;
    }
    const decision = decideRange(texts, locale, constraints);
    if (decision.status === "committed") {
      commit(decision.range);
    } else if (decision.status === "cleared") {
      commit(undefined);
    } else {
      setDecided(texts);
      setIssue(decision);
    }
  };

  const stepBy = (which: RangeEnd, input: HTMLInputElement, direction: 1 | -1) => {
    // A text input always has a selection, so `selectionStart` is never null here.
    const caret = input.selectionStart as number;
    const next = stepDraft(display[which], caret, direction, locale, today, constraints);
    if (next === undefined) {
      return;
    }
    // Flushed so the input holds the stepped text before the selection is placed in it; React
    // writing the value afterwards would move the caret to the end.
    flushSync(() => {
      const texts = { ...display, [which]: next.format(locale) };
      setDrafts(texts);
      decide(texts);
    });
    const range = segmentAt(input.value, caret, locale);
    if (range !== undefined) {
      input.setSelectionRange(range.start, range.end);
    }
  };

  // Focus moves first: focus entering the field adopts what is on screen as the drafts, and doing
  // that after the clear would adopt the text the clear just removed.
  const clear = () => {
    inputRefs.start.current?.focus();
    commit(undefined);
  };

  // The calendar's first pick: the start editor takes the day and the end editor empties, which is
  // what makes the day the calendar's anchor until the second pick.
  const pickStart = (date: LocalDate | undefined) => {
    if (date === undefined) {
      return;
    }
    const texts = { start: date.format(locale), end: "" };
    setDrafts(texts);
    setDecided(texts);
    setIssue({ status: "incomplete", missing: "end" });
  };

  // The calendar's second pick replaces whatever the editors hold and hands focus to the end
  // editor rather than back to the calendar button.
  const pickRange = (range: DateRange | undefined) => {
    commit(range);
    popup.closeOnto(inputRefs.end.current);
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

  const handleKeyDown = (which: RangeEnd) => (event: KeyboardEvent<HTMLInputElement>) => {
    const intent = keyIntent(event, readOnly);
    if (intent === "commit") {
      // No `preventDefault()` and no `requestSubmit()`: the browser's implicit-submission rules
      // decide whether this Enter submits. That native submit reads the hidden inputs in this same
      // tick, before React would flush, so the decision's state updates are forced through first.
      flushSync(() => decide(drafts));
    } else if (intent !== undefined) {
      event.preventDefault();
      stepBy(which, event.currentTarget, intent);
    }
  };

  const flagged = invalidEnds(issue, !focused && !popup.isOpen);
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
  const description = formatDescription(locale);
  const placeholder = formatHint(locale);

  const editor = (which: RangeEnd, labelId: string) => (
    <input
      ref={inputRefs[which]}
      type="text"
      autoComplete="off"
      className="vpg-date-range-field-input"
      data-end={which}
      disabled={disabled}
      readOnly={readOnly}
      required={required}
      value={display[which]}
      placeholder={placeholder}
      aria-labelledby={labelledBy(labelId)}
      aria-description={description}
      aria-invalid={invalid[which] || undefined}
      onChange={(event) => setDrafts({ ...drafts, [which]: withSeparator(drafts[which], event.target.value, locale) })}
      onBlur={() => decide(drafts)}
      onKeyDown={handleKeyDown(which)}
    />
  );

  const classes = ["vpg-date-range-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");
  const showClear = editable && (committed !== undefined || display.start !== "" || display.end !== "");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N range fields on a page inject one
        stylesheet.
      */}
      <style href="vpg-date-range-field" precedence="vpg-date-range-field">
        {dateRangeFieldStylesheet}
      </style>
      <FieldShell
        ref={popup.fieldRef}
        leading={
          <CalendarButton
            popup={popup}
            label={openCalendarLabel}
            disabled={!editable}
            calendar={
              <RangeCalendar
                value={committed}
                onChange={pickRange}
                anchor={anchor}
                onAnchorChange={pickStart}
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
          <span className="vpg-date-range-field-separator" aria-hidden="true">
            –
          </span>
          {editor("end", endLabelId)}
        </div>
        {/*
          The form values as ISO 8601 dates, one input per named end. The editors carry no `name`,
          because naming them would submit the locale-formatted text and no server should have to
          parse that. Mirroring `disabled` keeps a disabled field out of the submission, as a
          disabled native control is.
        */}
        {startName === undefined ? null : (
          <input type="hidden" name={startName} disabled={disabled} value={committed?.start.toString() ?? ""} />
        )}
        {endName === undefined ? null : <input type="hidden" name={endName} disabled={disabled} value={committed?.end.toString() ?? ""} />}
      </FieldShell>
    </>
  );
}
