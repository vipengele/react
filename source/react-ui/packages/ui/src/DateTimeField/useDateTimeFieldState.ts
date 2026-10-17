import type { Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { type FocusEvent, useRef, useState } from "react";
import { useClearRejectedOnExternalChange } from "../internal/useClearRejectedOnExternalChange.js";
import {
  commitText,
  type DateTimeBounds,
  type DateTimeSegmentRange,
  formatDateTimeText,
  isOutOfBounds,
  isPendingFlagged,
  pickDate,
  pickTime,
  sameDateTime,
  stepDateTimeText,
} from "./dateTimeFieldModel.js";

function formatValue(value: LocalDateTime | undefined, locale: Locale): string {
  return value === undefined ? "" : formatDateTimeText(value, locale);
}

/**
 * Whether focus has left the whole field — input, buttons and pop-up — set as it leaves and
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

export interface DateTimeFieldStateOptions {
  /** Whether the caller controls the committed value. */
  isControlled: boolean;
  /** The committed value. */
  committed: LocalDateTime | undefined;
  /** Commits a value, reporting it to the caller. */
  setCommitted: (next: LocalDateTime | undefined) => void;
  locale: Locale;
  bounds: DateTimeBounds;
}

/**
 * The editing state of a `DateTimeField` over its committed value: the draft text in the box, the
 * rejected flag, the day picked in the calendar that waits for a time, and whether focus has left
 * the field. It turns typed text, an arrow-key step, a picked day and a picked time into commits
 * through the model's rules, and says what the box shows and whether the field is flagged invalid.
 */
export function useDateTimeFieldState({ isControlled, committed, setCommitted, locale, bounds }: DateTimeFieldStateOptions) {
  const [draft, setDraft] = useState(() => formatValue(committed, locale));
  const [focused, setFocused] = useState(false);
  // Set when the last commit found text that reads as no accepted date-time. The text stays on
  // screen — erasing what the user typed is how they lose the evidence of their own mistake.
  const [rejected, setRejected] = useState(false);
  // A day picked in the calendar that waits for a time before anything commits.
  const [pending, setPending] = useState<LocalDate | undefined>(undefined);
  const fieldFocus = useFocusLeft();
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
  const pickDay = (date: LocalDate | undefined) => {
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

  const pickTimeOfDay = (time: LocalTime) => {
    const result = pickTime(time, pending, committed, bounds);
    if (result.kind === "value") commit(result.value);
  };

  /**
   * Steps the field under the caret at `caret` one step in `direction` and commits the result at
   * once, returning where the stepped field sits in the new text. A refused step changes nothing
   * and returns `undefined`. A step back onto the committed value reports nothing.
   */
  const step = (caret: number, direction: 1 | -1, today: LocalDate): DateTimeSegmentRange | undefined => {
    const result = stepDateTimeText(display, caret, direction, locale, today, bounds);
    if (result.kind === "refused") return undefined;
    if (sameDateTime(result.value, committed)) {
      restore();
    } else {
      commit(result.value);
    }
    return result.range;
  };

  // The box may be showing text the draft state does not hold — a controlled parent that declined
  // the last commit, for one. Adopting it as focus lands is what stops the text jumping.
  const focus = () => {
    setDraft(display);
    committedDraft.current = display;
    setFocused(true);
  };

  const blur = () => {
    commitDraft();
    setFocused(false);
  };

  const committedRejected = committed !== undefined && isOutOfBounds(committed, bounds);

  return {
    display,
    setDraft,
    pending,
    /** The day the pop-up shows: the pending one, else the committed value's. */
    day: pending ?? committed?.date,
    /** Whether the field's own state flags it invalid. */
    invalid: rejected || committedRejected || isPendingFlagged(pending, fieldFocus.focusLeft),
    fieldFocus,
    commit,
    commitDraft,
    pickDay,
    pickTimeOfDay,
    step,
    focus,
    blur,
  };
}
