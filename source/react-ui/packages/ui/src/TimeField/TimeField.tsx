import { useLocale } from "@vipengele/react-tokens";
import type { Locale, LocalTime } from "@vipengele/ts";
import { type FocusEvent, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { useControllableState } from "../internal/useControllableState.js";
import { timeFieldStylesheet } from "./TimeField.stylesheet.js";
import {
  adjacentSegment,
  clearSegment,
  commitTimeState,
  displaySegments,
  endEntry,
  enterDigit,
  initialTimeState,
  selectDayPeriod,
  stepSegment,
  type TimeEditableSegment,
  type TimeFieldState,
  timeLayout,
} from "./timeSegments.js";

export interface TimeFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "role" | "children"> {
  /** A ref to the `role="group"` element holding the segments. The hidden input that carries the
   * form value is not reachable through it. `HTMLAttributes` carries no `ref`, so the prop is
   * declared here. */
  ref?: Ref<HTMLDivElement>;
  /** The locale the segments are ordered, labelled and clocked in: it decides 12- or 24-hour and
   * where the AM/PM segment sits. Defaults to the nearest `LocaleProvider`'s, then the runtime's
   * own. */
  locale?: Locale;
  /** The controlled value. While focus is inside the field an update to it does not reach the
   * segments: the edit in progress wins until the user commits (ADR-0025). */
  value?: LocalTime;
  /** The initial value of an uncontrolled field. */
  defaultValue?: LocalTime;
  /** Called on **commit** only — focus leaving the field, Enter, or the last segment being filled —
   * and only with every segment filled, or every segment empty for `undefined`. A partly filled
   * field reports nothing and is flagged through `aria-invalid` once focus leaves it. */
  onChange?: (value: LocalTime | undefined) => void;
  /** Shows a `second` segment. Without it a value with non-zero seconds shows its hour and minute,
   * keeps its seconds while the user leaves it alone, and commits with zero seconds once edited. */
  seconds?: boolean;
  /** The form field name, carried by a hidden input holding the ISO 8601 value (`14:30`, or
   * `14:30:15` when the value has seconds). */
  name?: string;
  /** Takes every segment out of the tab order, ignores input, and leaves the field out of a
   * submitted form. */
  disabled?: boolean;
  /** An adornment rendered before the segments, inside the field's border. Passed straight to
   * `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the segments, inside the field's border. Passed straight to
   * `FieldShell`'s slot of the same name. */
  trailing?: ReactNode;
}

/** Each segment's accessible name. The group's own label names the field; these name its parts. */
const SEGMENT_LABELS: Record<TimeEditableSegment, string> = {
  hour: "Hour",
  minute: "Minute",
  second: "Second",
  dayPeriod: "AM/PM",
};

/** What an empty segment shows in place of its digits. */
const EMPTY_TEXT = "––";

function sameTime(a: LocalTime | undefined, b: LocalTime | undefined): boolean {
  return a === b || (a !== undefined && b !== undefined && a.equals(b));
}

/**
 * A segmented time field: hour, minute, an optional second and, on a 12-hour locale, AM/PM, each a
 * `role="spinbutton"` inside one `role="group"`, inside the `FieldShell` that draws the field's
 * chrome. The group is the shell's marked control and the element `FormField` clones its `id`,
 * label, description and `aria-invalid` onto.
 *
 * Two values live here, as in `NumberInput`. The segments hold what the user is entering, possibly
 * half of it; the committed value is the `LocalTime | undefined` the caller owns. `onChange` fires
 * when the two are reconciled — focus leaving the field, Enter, or the last segment being filled —
 * and never for a field that is only partly filled. All of the segment arithmetic is the pure model
 * in `timeSegments.ts`; this component wires it to keys, focus and the form.
 *
 * Digits fill a segment and move focus on once it is full, the up and down arrows step it and wrap,
 * a typed letter picks AM or PM, and Backspace or Delete empties it. Left and right move between
 * segments in the direction they appear on screen, so in a right-to-left context the left arrow
 * moves to the segment logically after; the DOM, and so Tab, keeps the logical order. There is no
 * wheel handler.
 */
export function TimeField(props: TimeFieldProps) {
  const {
    locale: localeProp,
    value,
    defaultValue,
    onChange,
    seconds = false,
    name,
    disabled,
    leading,
    trailing,
    className,
    ref,
    onFocus,
    onBlur,
    "aria-invalid": ariaInvalid,
    ...rest
  } = props;

  // A controlled field is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled field spells "empty". `null` stands for that empty
  // value inside the hook, whose own `undefined` means "uncontrolled".
  const [current, setCurrent] = useControllableState<LocalTime | null>(
    "value" in props ? (value ?? null) : undefined,
    () => defaultValue ?? null,
    (next) => onChange?.(next ?? undefined),
  );
  const committed = current ?? undefined;

  // The `locale` prop, else the nearest `LocaleProvider`, else the runtime's own locale.
  const locale = useLocale(localeProp);
  const layout = useMemo(() => timeLayout(locale, seconds), [locale, seconds]);
  // A `Locale` is its tag, so this names the layout whatever object identity the locale arrives
  // with — a `new Locale(...)` written inline in the caller's render is a new object every time.
  const layoutKey = `${locale.tag}|${seconds}`;

  const [fieldState, setFieldState] = useState<TimeFieldState>(() => initialTimeState(layout, committed));
  // The value and layout the segments were last seeded from.
  const [seed, setSeed] = useState({ value: committed, layoutKey });
  const [focusWithin, setFocusWithin] = useState(false);
  // Set when focus left, or Enter was pressed in, a partly filled field. The digits stay on screen,
  // since erasing what the user entered is how they lose the evidence of their own mistake.
  const [incomplete, setIncomplete] = useState(false);
  const segmentRefs = useRef(new Map<TimeEditableSegment, HTMLElement>());

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

  const handleSegmentKeyDown = (segment: TimeEditableSegment, event: KeyboardEvent<HTMLElement>) => {
    if (disabled) {
      return;
    }
    const { key } = event;
    if (key === "Enter") {
      // No `preventDefault()`: whatever the page does with an Enter still happens. Anything that
      // reads the hidden input in this same tick — a native submit among them — runs before React
      // would flush, so the commit's state updates are forced through first. An Enter confirming an
      // IME composition belongs to the composition.
      if (!event.nativeEvent.isComposing) {
        flushSync(() => commit(endEntry(fieldState), true));
      }
      return;
    }
    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      setFieldState(stepSegment(layout, fieldState, segment, key === "ArrowUp" ? 1 : -1));
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowRight") {
      event.preventDefault();
      // The group's resolved direction, inherited from wherever the page set it, decides which
      // arrow points at the logically next segment.
      const rtl = getComputedStyle(event.currentTarget.parentElement as HTMLElement).direction === "rtl";
      focusSegment(adjacentSegment(layout, segment, (key === "ArrowRight") !== rtl ? 1 : -1));
      return;
    }
    if (key === "Backspace" || key === "Delete") {
      event.preventDefault();
      setFieldState(clearSegment(fieldState, segment));
      return;
    }
    // A chord is a shortcut for the page or the browser, not a character typed into the segment.
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const next = segment === "dayPeriod" ? selectDayPeriod(layout, fieldState, key) : enterDigit(layout, fieldState, segment, key);
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    if ("advance" in next) {
      if (next.advance) {
        completeSegment(segment, next.state);
      } else {
        setFieldState(next.state);
      }
    } else {
      completeSegment(segment, next);
    }
  };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    setFocusWithin(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      // Moving between segments ends the entry in the one left, so returning to it starts afresh.
      setFieldState(endEntry);
    } else {
      commit(endEntry(fieldState), true);
      setFocusWithin(false);
    }
    onBlur?.(event);
  };

  const classes = ["vpg-time-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");
  // At most one literal sits between two editable segments, so the segment before it names it.
  let previous = "start";

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N time fields on a page inject one
        stylesheet.
      */}
      <style href="vpg-time-field" precedence="vpg-time-field">
        {timeFieldStylesheet}
      </style>
      <FieldShell leading={leading} trailing={trailing}>
        {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> carries its own border, padding and min-content width inside the shell; a composite control is a plain role="group" */}
        <div
          {...rest}
          ref={ref}
          role="group"
          className={classes}
          aria-invalid={incomplete || ariaInvalid}
          aria-disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {displaySegments(layout, fieldState).map((part) => {
            if (part.type === "literal") {
              return (
                <span key={`after-${previous}`} className="vpg-time-field-literal" aria-hidden="true">
                  {part.text}
                </span>
              );
            }
            const segment = part.type;
            previous = segment;
            return (
              <span
                key={segment}
                role="spinbutton"
                className="vpg-time-field-segment"
                data-segment={segment}
                data-empty={part.text === undefined ? "" : undefined}
                tabIndex={disabled ? -1 : 0}
                aria-label={SEGMENT_LABELS[segment]}
                aria-valuemin={part.min}
                aria-valuemax={part.max}
                aria-valuenow={part.value}
                aria-valuetext={part.text}
                // A pointer must not focus a disabled segment, which takes no input.
                onMouseDown={disabled ? (event) => event.preventDefault() : undefined}
                onKeyDown={(event) => handleSegmentKeyDown(segment, event)}
                ref={(node) => {
                  segmentRefs.current.set(segment, node as HTMLElement);
                  return () => {
                    segmentRefs.current.delete(segment);
                  };
                }}
              >
                {part.text ?? EMPTY_TEXT}
              </span>
            );
          })}
        </div>
        {/*
          The form value, as ISO 8601. The segments carry no `name`, because what they show is the
          locale's formatting, and no server should have to parse that. Mirroring `disabled` keeps
          a disabled field out of the submission, as a disabled native control is.
        */}
        <input type="hidden" name={name} disabled={disabled} value={committed === undefined ? "" : committed.toString()} />
      </FieldShell>
    </>
  );
}
