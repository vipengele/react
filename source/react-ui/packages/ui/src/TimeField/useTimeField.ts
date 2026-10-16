import { useLocale } from "@vipengele/react-tokens";
import type { Locale, LocalTime } from "@vipengele/ts";
import { type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useControllableState } from "../internal/useControllableState.js";
import { applySegmentInput, firstEmptySegment, pressesControlArea, type SegmentInput } from "./timeFieldInput.js";
import { handleSegmentKeyDown, type SegmentKeyContext, type TimeFieldEdge } from "./timeFieldKeys.js";
import {
  adjacentSegment,
  commitTimeState,
  endEntry,
  initialTimeState,
  isOutOfBounds,
  type TimeBounds,
  type TimeEditableSegment,
  type TimeFieldState,
  type TimeLayout,
  timeLayout,
} from "./timeSegments.js";

export interface TimeFieldOptions {
  /** Whether the caller passed a `value` prop at all, `undefined` included. */
  readonly controlled: boolean;
  readonly value: LocalTime | undefined;
  readonly defaultValue: LocalTime | undefined;
  readonly onChange: ((value: LocalTime | undefined) => void) | undefined;
  readonly locale: Locale | undefined;
  readonly seconds: boolean;
  /** The earliest time the field accepts, inclusive. */
  readonly min?: LocalTime | undefined;
  /** The latest time the field accepts, inclusive. Never before `min`. */
  readonly max?: LocalTime | undefined;
  readonly disabled: boolean | undefined;
  readonly onFocus: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  readonly onBlur: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  /**
   * Called when an arrow key points past the first segment (`"start"`) or the last (`"end"`), and
   * when filling the last segment moves entry past it (`"end"`), so a caller can carry focus on into
   * a neighbouring field. Filling the last segment commits first either way. Absent, such an arrow
   * moves focus nowhere and focus stays on a filled last segment.
   */
  readonly onExitPast?: ((edge: TimeFieldEdge) => void) | undefined;
}

/** What `TimeField` renders from: the layout, the segments' state, and the handlers that edit it. */
export interface TimeFieldModel {
  readonly layout: TimeLayout;
  readonly fieldState: TimeFieldState;
  /** The value the caller owns, which the hidden input carries. */
  readonly committed: LocalTime | undefined;
  /** Set when focus left, or Enter was pressed in, a partly filled field. */
  readonly incomplete: boolean;
  /**
   * Set when the last commit found every segment filled with a time outside `min` and `max`. The
   * segments keep that time and nothing is committed, until a later commit, a controlled update
   * that lands while focus is outside the field, or a change to `min` or `max` that brings the
   * time inside them, which commits it.
   */
  readonly rejected: boolean;
  /** Whether the committed value itself lies outside `min` and `max`. Such a value is shown as it
   * is and never corrected. */
  readonly committedRejected: boolean;
  readonly onFocus: (event: FocusEvent<HTMLDivElement>) => void;
  readonly onBlur: (event: FocusEvent<HTMLDivElement>) => void;
  readonly segmentKeyDown: (segment: TimeEditableSegment) => (event: KeyboardEvent<HTMLElement>) => void;
  /**
   * Whether the segments are `contenteditable` hosts, which is what raises a virtual keyboard when
   * one takes focus. They become so once a touch or a pen presses the field, and never while it is
   * disabled. A mouse and a physical keyboard need no editable host, and an editable host matches
   * `:focus-visible` however it was focused, so the field would ring on a mouse click.
   */
  readonly editable: boolean;
  /** Makes the segments editable when a touch or a pen presses the field. */
  readonly onShellPointerDown: (event: PointerEvent<HTMLElement>) => void;
  /** Applies what a segment's native `beforeinput` asks for. */
  readonly segmentInput: (segment: TimeEditableSegment) => (input: SegmentInput) => void;
  /** Keeps focus where it is when a press lands on the field outside every segment. */
  readonly onShellMouseDown: (event: MouseEvent<HTMLElement>) => void;
  /** Sends focus to the first empty segment, else the first, when a press lands on the field
   * outside every segment. Focus moved inside the press's own handler raises a virtual keyboard. */
  readonly onShellClick: (event: MouseEvent<HTMLElement>) => void;
  readonly segmentRef: (segment: TimeEditableSegment) => (node: HTMLElement | null) => () => void;
}

function sameTime(a: LocalTime | undefined, b: LocalTime | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.equals(b));
}

/**
 * The committed value, controlled or not. `undefined` is how a controlled field spells "empty", so
 * `null` stands for that empty value inside `useControllableState`, whose own `undefined` means
 * "uncontrolled".
 */
function useCommittedTime(options: TimeFieldOptions) {
  const { controlled, value, defaultValue, onChange } = options;
  const [current, setCurrent] = useControllableState<LocalTime | null>(
    controlled ? (value ?? null) : undefined,
    () => defaultValue ?? null,
    (next) => onChange?.(next ?? undefined),
  );
  return { committed: current ?? undefined, setCurrent };
}

/** The layout for the `locale` prop, else the nearest `LocaleProvider`'s, else the runtime's own. */
function useTimeLayout(localeProp: Locale | undefined, seconds: boolean) {
  const locale = useLocale(localeProp);
  // A `Locale` is its tag, so this names the layout whatever object identity the locale arrives
  // with — a `new Locale(...)` written inline in the caller's render is a new object every time.
  const layoutKey = `${locale.tag}|${seconds}`;
  // Keyed on the tag, not the object, so an inline `new Locale(...)` does not rebuild the layout on
  // every render.
  // biome-ignore lint/correctness/useExhaustiveDependencies: a Locale is determined by its tag
  const layout = useMemo(() => timeLayout(locale, seconds), [layoutKey]);
  return { layout, layoutKey };
}

/**
 * The segment state machine behind `TimeField`. The segments hold what the user is entering,
 * possibly half of it; the committed value is the `LocalTime | undefined` the caller owns, and the
 * two are reconciled on commit — focus leaving the field, Enter, or the last segment being filled.
 */
export function useTimeField(options: TimeFieldOptions): TimeFieldModel {
  const { disabled, onFocus, onBlur, onExitPast } = options;
  const bounds: TimeBounds = { min: options.min, max: options.max };
  const { committed, setCurrent } = useCommittedTime(options);
  const { layout, layoutKey } = useTimeLayout(options.locale, options.seconds);

  const [fieldState, setFieldState] = useState<TimeFieldState>(() => initialTimeState(layout, committed));
  // The value and layout the segments were last seeded from.
  const [seed, setSeed] = useState({ value: committed, layoutKey });
  const [focusWithin, setFocusWithin] = useState(false);
  // The digits of a partly filled field stay on screen, since erasing what the user entered is how
  // they lose the evidence of their own mistake.
  const [incomplete, setIncomplete] = useState(false);
  // A filled time outside the bounds stays on screen too, for the same reason.
  const [rejected, setRejected] = useState(false);
  const segmentRefs = useRef(new Map<TimeEditableSegment, HTMLElement>());
  const [touched, setTouched] = useState(false);

  // The segments follow the committed value, except while focus is inside the field: a controlled
  // update that lands mid-edit waits until focus leaves, so it never replaces what the user is
  // entering (ADR-0025). A new layout always reseeds, since the old state may not fit it.
  if (seed.layoutKey !== layoutKey || (!focusWithin && !sameTime(seed.value, committed))) {
    setSeed({ value: committed, layoutKey });
    setFieldState(initialTimeState(layout, committed));
    setIncomplete(false);
    setRejected(false);
  }

  const focusSegment = (segment: TimeEditableSegment | undefined) => {
    if (segment !== undefined) {
      (segmentRefs.current.get(segment) as HTMLElement).focus();
    }
  };

  /**
   * Reconciles `next` with the committed value. A filled or emptied field commits and reseeds from
   * what it committed, so a later commit with no edit in between reports nothing again. Only an
   * explicit commit — focus leaving, or Enter — flags a partly filled field; filling the last
   * segment with others still empty is entry in progress. A filled field outside the bounds is
   * flagged rejected on every commit, filling the last segment included: no segment is left for
   * the entry to continue in, so the time on screen is the one the user means.
   */
  const commit = (next: TimeFieldState, flagIncomplete: boolean) => {
    const result = commitTimeState(layout, next, bounds);
    setRejected(result.kind === "rejected");
    if (result.kind === "value") {
      setFieldState(initialTimeState(layout, result.value));
      setSeed({ value: result.value, layoutKey });
      setIncomplete(false);
      setCurrent(result.value ?? null);
      return;
    }
    setFieldState(next);
    if (flagIncomplete || result.kind === "rejected") {
      setIncomplete(result.kind === "incomplete");
    }
  };

  // A segment that is full moves focus to the next one; the last one in logical order commits, and
  // hands entry on past the field when the caller takes it.
  const completeSegment = (segment: TimeEditableSegment, next: TimeFieldState) => {
    const following = adjacentSegment(layout, segment, 1);
    if (following !== undefined) {
      setFieldState(next);
      focusSegment(following);
    } else if (onExitPast === undefined) {
      commit(next, false);
    } else {
      // Flushed so the field has rendered the commit before focus leaves it. The blur that follows
      // commits the state it reads, and the state before the last keystroke would commit a second,
      // stale time.
      flushSync(() => commit(next, false));
      onExitPast("end");
    }
  };

  // A rejected time is judged again whenever `min` or `max` changes — `DateTimeField` moves them
  // with the chosen date — and commits once it falls inside them. Without this it stays flagged
  // and uncommitted until the user edits it, though nothing on screen is wrong any more. One still
  // outside the new bounds stays rejected. Keyed on the bounds' text, since a caller may pass an
  // equal `LocalTime` as a new object on every render.
  const boundsKey = `${options.min?.toString()}|${options.max?.toString()}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: the re-check runs on a change of bounds only, never on an edit
  useEffect(() => {
    if (rejected && commitTimeState(layout, fieldState, bounds).kind === "value") {
      commit(fieldState, false);
    }
  }, [boundsKey]);

  const keyContext: SegmentKeyContext = {
    layout,
    bounds,
    state: fieldState,
    setState: setFieldState,
    commit,
    completeSegment,
    focusSegment,
    onExitPast,
  };

  return {
    layout,
    fieldState,
    committed,
    incomplete,
    rejected,
    committedRejected: committed !== undefined && isOutOfBounds(committed, bounds),
    onFocus: (event) => {
      setFocusWithin(true);
      onFocus?.(event);
    },
    onBlur: (event) => {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
        // Moving between segments ends the entry in the one left, so returning to it starts afresh.
        setFieldState(endEntry);
      } else {
        commit(endEntry(fieldState), true);
        setFocusWithin(false);
      }
      onBlur?.(event);
    },
    segmentKeyDown: (segment) => (event) => {
      if (!disabled) {
        handleSegmentKeyDown(keyContext, segment, event);
      }
    },
    editable: touched && !disabled,
    onShellPointerDown: (event) => {
      if (event.pointerType !== "mouse") {
        setTouched(true);
      }
    },
    segmentInput: (segment) => (input) => {
      if (!disabled) {
        applySegmentInput(keyContext, segment, input);
      }
    },
    onShellMouseDown: (event) => {
      if (!disabled && pressesControlArea(event.target)) {
        event.preventDefault();
      }
    },
    onShellClick: (event) => {
      if (!disabled && pressesControlArea(event.target)) {
        focusSegment(firstEmptySegment(layout, fieldState));
      }
    },
    segmentRef: (segment) => (node) => {
      segmentRefs.current.set(segment, node as HTMLElement);
      return () => {
        segmentRefs.current.delete(segment);
      };
    },
  };
}
