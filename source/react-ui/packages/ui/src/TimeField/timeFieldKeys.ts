import type { KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import {
  adjacentSegment,
  clearSegment,
  endEntry,
  enterDigit,
  selectDayPeriod,
  stepSegment,
  type TimeEditableSegment,
  type TimeFieldState,
  type TimeLayout,
} from "./timeSegments.js";

/** What a segment's key handler reads, and the field transitions it drives. */
export interface SegmentKeyContext {
  readonly layout: TimeLayout;
  readonly state: TimeFieldState;
  readonly setState: (next: TimeFieldState) => void;
  /** Reconciles `next` with the committed value; `flagIncomplete` marks a partly filled field. */
  readonly commit: (next: TimeFieldState, flagIncomplete: boolean) => void;
  /** Moves focus on from a full `segment`, or commits when it is the last one. */
  readonly completeSegment: (segment: TimeEditableSegment, next: TimeFieldState) => void;
  readonly focusSegment: (segment: TimeEditableSegment | undefined) => void;
}

/**
 * Interprets a key pressed in `segment`: Enter commits, the up and down arrows step the segment,
 * left and right move focus in on-screen order, Backspace and Delete empty it, and any other key is
 * typed into it — a digit into a numeric segment, a letter into the AM/PM one.
 */
export function handleSegmentKeyDown(context: SegmentKeyContext, segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>): void {
  if (event.key === "Enter") {
    commitOnEnter(context, event);
    return;
  }
  if (handleEditingKey(context, segment, event)) {
    return;
  }
  typeIntoSegment(context, segment, event);
}

/**
 * No `preventDefault()`: whatever the page does with an Enter still happens. Anything that reads the
 * hidden input in this same tick — a native submit among them — runs before React would flush, so
 * the commit's state updates are forced through first. An Enter confirming an IME composition
 * belongs to the composition.
 */
function commitOnEnter(context: SegmentKeyContext, event: KeyboardEvent<HTMLElement>): void {
  if (!event.nativeEvent.isComposing) {
    flushSync(() => context.commit(endEntry(context.state), true));
  }
}

/** Handles the arrows, Backspace and Delete, and reports whether `event` was one of them. */
function handleEditingKey(context: SegmentKeyContext, segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>): boolean {
  const { key } = event;
  if (key === "ArrowUp" || key === "ArrowDown") {
    event.preventDefault();
    context.setState(stepSegment(context.layout, context.state, segment, key === "ArrowUp" ? 1 : -1));
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
 * points at the logically next segment.
 */
function moveFocus(context: SegmentKeyContext, segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>): void {
  const rtl = getComputedStyle(event.currentTarget.parentElement as HTMLElement).direction === "rtl";
  context.focusSegment(adjacentSegment(context.layout, segment, (event.key === "ArrowRight") !== rtl ? 1 : -1));
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
