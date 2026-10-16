import { type Locale, type LocalDate, LocalDateTime, type LocalTime } from "@vipengele/ts";
import { type FocusEvent, useState } from "react";
import { formatDateTimeText } from "../DateTimeField/dateTimeFieldModel.js";
import type { DateRange, DateTimeRange } from "../internal/localRange.js";
import {
  type DateTimeConstraints,
  decideRange,
  endParts,
  formatRange,
  type PendingDays,
  placeDay,
  type RangeDrafts,
  type RangeEnd,
  type RangeIssue,
  rangeKey,
  sameDrafts,
} from "./dateTimeRangeFieldModel.js";

const NO_PENDING: PendingDays = {};

export interface DateTimeRangeFieldStateOptions {
  /** Whether the caller passed a `value` prop at all, `undefined` included. */
  isControlled: boolean;
  value: DateTimeRange | undefined;
  defaultValue: DateTimeRange | undefined;
  onChange: ((range: DateTimeRange | undefined) => void) | undefined;
  onFocus: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  onBlur: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  locale: Locale;
  constraints: DateTimeConstraints;
}

/**
 * The editing state of a `DateTimeRangeField` over its committed range: the texts in the two
 * editors, the texts of the last decision, what that decision found when it committed nothing, the
 * days picked in the calendar that wait for their times, and whether focus is on one of the
 * editors. It turns typed text and the pop-up's picks into decisions through the model's rules, and
 * says what the editors show.
 */
export function useDateTimeRangeFieldState({
  isControlled,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  locale,
  constraints,
}: DateTimeRangeFieldStateOptions) {
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

  // The editors show the drafts while the user works on them, else the committed range.
  const live = focused || issue !== undefined;
  const display = live ? drafts : formatRange(committed, locale);

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

  // A controlled value moving on beneath an unfocused field replaces a rejected draft and a pending
  // day alike: both describe an edit of the range it moved away from.
  const discardEdit = () => {
    setIssue(undefined);
    setPending(NO_PENDING);
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

  return {
    committed,
    drafts,
    setDrafts,
    display,
    issue,
    pending,
    focused,
    commit,
    decide,
    pickAnchor,
    pickDays,
    pickTime,
    discardEdit,
    handleFocus,
    handleBlur,
  };
}
