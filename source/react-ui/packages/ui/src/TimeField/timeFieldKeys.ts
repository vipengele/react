import type { KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import {
  adjacentSegment,
  clearSegment,
  endEntry,
  enterDigit,
  selectDayPeriod,
  stepSegment,
  type TimeBounds,
  type TimeEditableSegment,
  type TimeFieldState,
  type TimeLayout,
} from "./timeSegments.js";

/** An edge of a time field: before its first segment, or after its last, in logical order. */
export type TimeFieldEdge = "start" | "end";

/** What a segment's key handler reads, and the field transitions it drives. */
export interface SegmentKeyContext {
  readonly layout: TimeLayout;
  /** The range a step of a filled field stays inside. */
  readonly bounds: TimeBounds;
  readonly state: TimeFieldState;
  readonly setState: (next: TimeFieldState) => void;
  /** Reconciles `next` with the committed value; `flagIncomplete` marks a partly filled field. A
   * filled field outside the bounds is marked rejected whatever `flagIncomplete` says. */
  readonly commit: (next: TimeFieldState, flagIncomplete: boolean) => void;
  /** Moves focus on from a full `segment`, or commits when it is the last one. */
  readonly completeSegment: (segment: TimeEditableSegment, next: TimeFieldState) => void;
  readonly focusSegment: (segment: TimeEditableSegment | undefined) => void;
  /** Called when an arrow key points past the first segment (`"start"`) or the last (`"end"`).
   * Absent, such an arrow moves focus nowhere. */
  readonly onExitPast?: ((edge: TimeFieldEdge) => void) | undefined;
}

/**
 * Interprets a key pressed in `segment`: Enter commits, the up and down arrows step the segment
 * (a step that would take a filled field out of its bounds does nothing), left and right move
 * focus in on-screen order, Backspace and Delete empty it, and any other key is typed into it — a
 * digit into a numeric segment, a letter into the AM/PM one.
 */
export function handleSegmentKeyDown(context: SegmentKeyContext, segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>): void {
  if (belongsToInputMethod(event.nativeEvent)) {
    return;
  }
  if (event.key === "Enter") {
    commitOnEnter(context);
    return;
  }
  if (handleEditingKey(context, segment, event)) {
    return;
  }
  typeIntoSegment(context, segment, event);
}

/**
 * Whether a key belongs to an IME composition or a virtual keyboard, which report no usable `key`
 * (`Unidentified`, key code 229). Such a key is neither a command nor prevented, so the text it
 * produces reaches the segment's `beforeinput` listener; an Enter confirming a composition belongs
 * to the composition.
 */
function belongsToInputMethod(event: globalThis.KeyboardEvent): boolean {
  return event.isComposing || event.key === "Unidentified" || event.keyCode === 229;
}

/**
 * No `preventDefault()`: whatever the page does with an Enter still happens. Anything that reads the
 * hidden input in this same tick — a native submit among them — runs before React would flush, so
 * the commit's state updates are forced through first.
 */
function commitOnEnter(context: SegmentKeyContext): void {
  flushSync(() => context.commit(endEntry(context.state), true));
}

/** Handles the arrows, Backspace and Delete, and reports whether `event` was one of them. */
function handleEditingKey(context: SegmentKeyContext, segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>): boolean {
  const { key } = event;
  if (key === "ArrowUp" || key === "ArrowDown") {
    event.preventDefault();
    context.setState(stepSegment(context.layout, context.state, segment, key === "ArrowUp" ? 1 : -1, context.bounds));
    return true;
  }
  if (key === "ArrowLeft" || key === "ArrowRight") {
    event.preventDefault();
    moveFocus(context, segment, event);
    return true;
  }
  if (key === "Backspace" || key === "Delete") {
    event.preventDefault();
    context.setState(clearSegment(context.state, segment));
    return true;
  }
  return false;
}

/**
 * The group's resolved direction, inherited from wherever the page set it, decides which arrow
 * points at the logically next segment. An arrow pointing past either end of the field is handed to
 * `onExitPast`, with the edge in logical order.
 */
function moveFocus(context: SegmentKeyContext, segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>): void {
  const rtl = getComputedStyle(event.currentTarget.parentElement as HTMLElement).direction === "rtl";
  const offset = (event.key === "ArrowRight") !== rtl ? 1 : -1;
  const target = adjacentSegment(context.layout, segment, offset);
  context.focusSegment(target);
  if (target === undefined) {
    context.onExitPast?.(offset > 0 ? "end" : "start");
  }
}

/** Types the key into `segment`; a key that spells nothing there is left to the page. */
function typeIntoSegment(context: SegmentKeyContext, segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>): void {
  // A chord is a shortcut for the page or the browser, not a character typed into the segment.
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return;
  }
  const { layout, state } = context;
  const next = segment === "dayPeriod" ? selectDayPeriod(layout, state, event.key) : enterDigit(layout, state, segment, event.key);
  if (next === undefined) {
    return;
  }
  event.preventDefault();
  if (!("advance" in next)) {
    context.completeSegment(segment, next);
  } else if (next.advance) {
    context.completeSegment(segment, next.state);
  } else {
    context.setState(next.state);
  }
}
