import type { KeyboardEvent } from "react";
import type { TimeDisplaySegment, TimeEditableSegment } from "./timeSegments.js";

/** Each segment's accessible name. The group's own label names the field; these name its parts. */
const SEGMENT_LABELS: Record<TimeEditableSegment, string> = {
  hour: "Hour",
  minute: "Minute",
  second: "Second",
  dayPeriod: "AM/PM",
};

/** What an empty segment shows in place of its digits. */
const EMPTY_TEXT = "––";

export interface TimeFieldSegmentProps {
  readonly part: Extract<TimeDisplaySegment, { readonly type: TimeEditableSegment }>;
  readonly disabled: boolean | undefined;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly segmentRef: (node: HTMLElement | null) => () => void;
}

/** One editable segment of a `TimeField`: a `role="spinbutton"` showing the segment's text. */
export function TimeFieldSegment({ part, disabled, onKeyDown, segmentRef }: TimeFieldSegmentProps) {
  return (
    <span
      role="spinbutton"
      className="vpg-time-field-segment"
      data-segment={part.type}
      data-empty={part.text === undefined ? "" : undefined}
      tabIndex={disabled ? -1 : 0}
      aria-label={SEGMENT_LABELS[part.type]}
      aria-valuemin={part.min}
      aria-valuemax={part.max}
      aria-valuenow={part.value}
      aria-valuetext={part.text}
      // A pointer must not focus a disabled segment, which takes no input.
      onMouseDown={disabled ? (event) => event.preventDefault() : undefined}
      onKeyDown={onKeyDown}
      ref={segmentRef}
    >
      {part.text ?? EMPTY_TEXT}
    </span>
  );
}
