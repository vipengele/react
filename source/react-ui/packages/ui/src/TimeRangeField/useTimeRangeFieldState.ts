import type { LocalTime } from "@vipengele/ts";
import { type FocusEvent, useState } from "react";
import type { TimeRange } from "../internal/localRange.js";
import type { TimeBounds } from "../TimeField/timeSegments.js";
import type { TimeFieldModel } from "../TimeField/useTimeField.js";
import { decideTimeRange, rangeKey, readEditor, type TimeRangeEnd, type TimeRangeIssue } from "./timeRangeFieldModel.js";

type Ends = Readonly<Record<TimeRangeEnd, LocalTime | undefined>>;

function endsOf(range: TimeRange | undefined): Ends {
  return { start: range?.start, end: range?.end };
}

/** The editor across the pair from `which`. */
export function otherEnd(which: TimeRangeEnd): TimeRangeEnd {
  return which === "start" ? "end" : "start";
}

export interface TimeRangeFieldStateOptions {
  /** Whether the caller passed a `value` prop at all, `undefined` included. */
  isControlled: boolean;
  value: TimeRange | undefined;
  defaultValue: TimeRange | undefined;
  onChange: ((range: TimeRange | undefined) => void) | undefined;
  onFocus: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  onBlur: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  bounds: TimeBounds;
}

/**
 * The pair state of a `TimeRangeField` over its committed range: the time each editor last
 * committed on its own, what the last decision found when it committed nothing, and whether focus
 * is inside the field. It decides an editor's commit together with the other editor's reading, and
 * reseeds the editors from the committed range whenever focus is outside the field.
 */
export function useTimeRangeFieldState({
  isControlled,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  bounds,
}: TimeRangeFieldStateOptions) {
  const [uncontrolledValue, setUncontrolledValue] = useState<TimeRange | undefined>(defaultValue);
  const committed = isControlled ? value : uncontrolledValue;
  const committedKey = rangeKey(committed);

  // The time each editor last committed on its own. The editors show these, so an end the pair has
  // not committed — one half of an incomplete range, the two ends of a reversed one — stays on
  // screen.
  const [ends, setEnds] = useState<Ends>(() => endsOf(committed));
  // The committed range the editors were last seeded from, as its key.
  const [seed, setSeed] = useState(committedKey);
  // What the last decision found when it committed nothing.
  const [issue, setIssue] = useState<TimeRangeIssue | undefined>(undefined);
  // Whether focus is anywhere inside the field.
  const [focused, setFocused] = useState(false);

  // The editors follow the committed range, except while focus is inside the field: a controlled
  // update that lands mid-edit waits until focus leaves, so it never replaces what the user is
  // entering. A parent that declines a commit has its own range put back the same way.
  if (!focused && seed !== committedKey) {
    setSeed(committedKey);
    setEnds(endsOf(committed));
    setIssue(undefined);
  }

  // One editor has committed `time`; the other is read as it stands, so a partly filled or
  // out-of-bounds editor holds the pair back even though its last committed time is still in `ends`.
  const decide = (which: TimeRangeEnd, time: LocalTime | undefined, otherField: TimeFieldModel) => {
    setEnds({ ...ends, [which]: time });
    const otherReading = readEditor(otherField.layout, otherField.fieldState, bounds, ends[otherEnd(which)]);
    const decision = which === "start" ? decideTimeRange(time, otherReading) : decideTimeRange(otherReading, time);
    if (decision.status === "incomplete" || decision.status === "rejected") {
      setIssue(decision);
      return;
    }
    setIssue(undefined);
    const range = decision.status === "committed" ? decision.range : undefined;
    if (rangeKey(range) !== committedKey) {
      setUncontrolledValue(range);
      setSeed(rangeKey(range));
      onChange?.(range);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
    onBlur?.(event);
  };

  return { committed, ends, issue, focused, decide, handleFocus, handleBlur };
}
