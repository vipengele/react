import type { Locale, LocalDate } from "@vipengele/ts";
import { type FocusEvent, useState } from "react";
import { flushSync } from "react-dom";
import { type DateConstraints, segmentAt } from "../DateField/dateFieldEditing.js";
import type { DateRange } from "../internal/localRange.js";
import {
  decideRange,
  formatRange,
  type RangeDrafts,
  type RangeEnd,
  type RangeIssue,
  sameDrafts,
  stepDraft,
} from "./dateRangeFieldModel.js";

export interface DateRangeFieldStateOptions {
  /** Whether the caller passed a `value` prop at all, `undefined` included. */
  isControlled: boolean;
  value: DateRange | undefined;
  defaultValue: DateRange | undefined;
  onChange: ((range: DateRange | undefined) => void) | undefined;
  onFocus: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  onBlur: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  locale: Locale;
  today: LocalDate;
  constraints: DateConstraints;
}

/**
 * The editing state of a `DateRangeField` over its committed range: the texts in the two editors,
 * the texts of the last decision, what that decision found when it committed nothing, and whether
 * focus is on one of the editors. It turns typed text, an arrow-key step and the calendar's first
 * pick into decisions through the model's rules, and says what the editors show.
 */
export function useDateRangeFieldState({
  isControlled,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  locale,
  today,
  constraints,
}: DateRangeFieldStateOptions) {
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

  // The editors show the drafts while the user works on them, else the committed range.
  const live = focused || issue !== undefined;
  const display = live ? drafts : formatRange(committed, locale);

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
    live,
    issue,
    clearIssue: () => setIssue(undefined),
    focused,
    commit,
    decide,
    stepBy,
    pickStart,
    handleFocus,
    handleBlur,
  };
}
