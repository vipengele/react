import { type KeyboardEvent, useLayoutEffect, useRef } from "react";
import { listenForSegmentInput, type SegmentInput } from "./timeFieldInput.js";
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
  /** Whether the segment is a `contenteditable` host, so that focusing it raises a virtual keyboard. */
  readonly editable: boolean;
  /** Whether this is the last segment in logical order, whose virtual Enter key reads "done". */
  readonly last: boolean;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  readonly onInput: (input: SegmentInput) => void;
  readonly segmentRef: (node: HTMLElement | null) => () => void;
}

/**
 * One editable segment of a `TimeField`: a `role="spinbutton"` showing the segment's text.
 *
 * When `editable`, it is a `contenteditable` host only so that focusing it raises a virtual
 * keyboard — a numeric keypad for the digits, a letter keyboard for AM/PM. The text stays React's:
 * every `beforeinput` is prevented and translated into the same transitions the keys drive, which is
 * also how a virtual keyboard's text arrives, since its `keydown` carries no usable `key`. `"true"`
 * rather than `"plaintext-only"`, which an engine that does not know it treats as not editable at
 * all.
 */
export function TimeFieldSegment({ part, disabled, editable, last, onKeyDown, onInput, segmentRef }: TimeFieldSegmentProps) {
  const text = part.text ?? EMPTY_TEXT;
  const node = useRef<HTMLElement | null>(null);
  const latest = useRef({ onInput, text });
  useLayoutEffect(() => {
    latest.current = { onInput, text };
  });
  // Attached once for the segment's life, because the listener tracks a composition across renders.
  useLayoutEffect(
    () =>
      listenForSegmentInput(
        node.current as HTMLElement,
        (input) => latest.current.onInput(input),
        () => latest.current.text,
      ),
    [],
  );
  const ref = (element: HTMLElement | null) => {
    node.current = element;
    return segmentRef(element);
  };
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
      contentEditable={editable}
      suppressContentEditableWarning
      inputMode={part.type === "dayPeriod" ? "text" : "numeric"}
      enterKeyHint={last ? "done" : "next"}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      // A pointer must not focus a disabled segment, which takes no input.
      onMouseDown={disabled ? (event) => event.preventDefault() : undefined}
      onKeyDown={onKeyDown}
      ref={ref}
    >
      {text}
    </span>
  );
}
