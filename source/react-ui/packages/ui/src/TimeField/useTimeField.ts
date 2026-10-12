import { useLocale } from "@vipengele/react-tokens";
import type { Locale, LocalTime } from "@vipengele/ts";
import { type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, useMemo, useRef, useState } from "react";
import { useControllableState } from "../internal/useControllableState.js";
import { applySegmentInput, firstEmptySegment, pressesControlArea, type SegmentInput } from "./timeFieldInput.js";
import { handleSegmentKeyDown, type SegmentKeyContext } from "./timeFieldKeys.js";
import {
  adjacentSegment,
  commitTimeState,
  endEntry,
  initialTimeState,
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
  readonly disabled: boolean | undefined;
  readonly onFocus: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  readonly onBlur: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
}

/** What `TimeField` renders from: the layout, the segments' state, and the handlers that edit it. */
export interface TimeFieldModel {
  readonly layout: TimeLayout;
  readonly fieldState: TimeFieldState;
  /** The value the caller owns, which the hidden input carries. */
  readonly committed: LocalTime | undefined;
  /** Set when focus left, or Enter was pressed in, a partly filled field. */
  readonly incomplete: boolean;
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
  const { disabled, onFocus, onBlur } = options;
  const { committed, setCurrent } = useCommittedTime(options);
  const { layout, layoutKey } = useTimeLayout(options.locale, options.seconds);

  const [fieldState, setFieldState] = useState<TimeFieldState>(() => initialTimeState(layout, committed));
  // The value and layout the segments were last seeded from.
  const [seed, setSeed] = useState({ value: committed, layoutKey });
  const [focusWithin, setFocusWithin] = useState(false);
  // The digits of a partly filled field stay on screen, since erasing what the user entered is how
  // they lose the evidence of their own mistake.
  const [incomplete, setIncomplete] = useState(false);
  const segmentRefs = useRef(new Map<TimeEditableSegment, HTMLElement>());
  const [touched, setTouched] = useState(false);

  // The segments follow the committed value, except while focus is inside the field: a controlled
  // update that lands mid-edit waits until focus leaves, so it never replaces what the user is
  // entering (ADR-0025). A new layout always reseeds, since the old state may not fit it.
  if (seed.layoutKey !== layoutKey || (!focusWithin && !sameTime(seed.value, committed))) {
    setSeed({ value: committed, layoutKey });
    setFieldState(initialTimeState(layout, committed));
    setIncomplete(false);
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
   * segment with others still empty is entry in progress.
   */
  const commit = (next: TimeFieldState, flagIncomplete: boolean) => {
    const result = commitTimeState(layout, next);
    if (result.kind === "value") {
      setFieldState(initialTimeState(layout, result.value));
      setSeed({ value: result.value, layoutKey });
      setIncomplete(false);
      setCurrent(result.value ?? null);
      return;
    }
    setFieldState(next);
    if (flagIncomplete) {
      setIncomplete(result.kind === "incomplete");
    }
  };

  // A segment that is full moves focus to the next one; the last one in logical order commits.
  const completeSegment = (segment: TimeEditableSegment, next: TimeFieldState) => {
    const following = adjacentSegment(layout, segment, 1);
    if (following === undefined) {
      commit(next, false);
    } else {
      setFieldState(next);
      focusSegment(following);
    }
  };

  const keyContext: SegmentKeyContext = { layout, state: fieldState, setState: setFieldState, commit, completeSegment, focusSegment };

  return {
    layout,
    fieldState,
    committed,
    incomplete,
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
