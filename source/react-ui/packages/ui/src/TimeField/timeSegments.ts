import { type Locale, LocalTime } from "@vipengele/ts";

/** A segment that holds digits the user types. */
export type TimeNumericSegment = "hour" | "minute" | "second";

/** A segment the user edits: the digits, and the AM/PM marker on a 12-hour clock. */
export type TimeEditableSegment = TimeNumericSegment | "dayPeriod";

/** The half of the day a 12-hour clock's marker names. */
export type DayPeriod = "am" | "pm";

/**
 * The fixed shape of a time field under one locale and seconds setting: which segments it has,
 * in what order, with which literals between them, and the locale's AM/PM labels. It holds no
 * time of its own, so it is computed once per locale and `seconds` and shared by every state.
 */
export interface TimeLayout {
  /** The locale's canonical tag, which typed letters are lower-cased in. */
  readonly tag: string;
  /** Whether the locale counts hours 1-12 with an AM/PM segment, rather than 00-23. */
  readonly twelveHour: boolean;
  /** Whether the field has a `second` segment. */
  readonly seconds: boolean;
  /** Every segment in the order the locale writes them, literals included. */
  readonly parts: readonly ({ readonly type: TimeEditableSegment } | { readonly type: "literal"; readonly text: string })[];
  /** The editable segments in logical (DOM) order. */
  readonly editable: readonly TimeEditableSegment[];
  /** The locale's markers for the two halves of the day. */
  readonly dayPeriods: { readonly am: string; readonly pm: string };
}

/**
 * What the user has entered so far. Each segment is `undefined` while empty. On a 12-hour layout
 * `hour` is the clock hour, 1-12, and `dayPeriod` says which half of the day it is in; on a
 * 24-hour layout `hour` is 0-23 and `dayPeriod` is not read. `second` is not read when the layout
 * has no `second` segment.
 */
export interface TimeFieldState {
  readonly hour: number | undefined;
  readonly minute: number | undefined;
  readonly second: number | undefined;
  readonly dayPeriod: DayPeriod | undefined;
  /**
   * The digits typed into one segment that may still take another: `1` in a 12-hour hour could
   * become `10`, `11` or `12`. The segment's value already holds what the digits spell where it is
   * in range. The next digit typed into a different segment, or {@link endEntry}, drops it.
   */
  readonly draft: { readonly segment: TimeNumericSegment; readonly text: string } | undefined;
  /**
   * Whether the user has changed anything since the state was seeded. An unedited state commits
   * nothing, which keeps a value's seconds intact in a field that does not show them.
   */
  readonly edited: boolean;
}

/** One rendered segment: a literal, or an editable segment with its text and range. */
export type TimeDisplaySegment =
  | { readonly type: "literal"; readonly text: string }
  | {
      readonly type: TimeEditableSegment;
      /** The text the segment shows, or `undefined` while it is empty. */
      readonly text: string | undefined;
      /** The segment's numeric value, `0` for AM and `1` for PM, or `undefined` while it is empty. */
      readonly value: number | undefined;
      readonly min: number;
      readonly max: number;
    };

/**
 * The inclusive range a field's time must fall in. Either end may be absent, and `min` is never
 * after `max`: a range that wraps past midnight is not expressible.
 */
export interface TimeBounds {
  readonly min?: LocalTime | undefined;
  readonly max?: LocalTime | undefined;
}

/**
 * What committing a state yields. `unchanged` means the user has not edited the field, so the
 * value it was seeded from stands as it is. `incomplete` means some segments are filled and some
 * are not, which has no value. `rejected` means every segment is filled with a time outside the
 * bounds, which is no value either. A filled field yields its time and an empty one `undefined`.
 */
export type TimeFieldCommit =
  | { readonly kind: "unchanged" }
  | { readonly kind: "incomplete" }
  | { readonly kind: "rejected" }
  | { readonly kind: "value"; readonly value: LocalTime | undefined };

/** The result of typing a digit: the new state, and whether the segment is full so focus moves on. */
export interface TimeDigitEntry {
  readonly state: TimeFieldState;
  readonly advance: boolean;
}

/** Any time with an hour of two digits on both clocks; only its segment order and literals are read. */
const REFERENCE_TIME = LocalTime.of(13, 30);

const ASCII_DIGIT = /^[0-9]$/;

/**
 * The layout of a time field in `locale`. The order and the literals come from
 * `LocalTime#segments` of a reference time, because the order depends on the locale alone; the
 * digits a field shows come from its state.
 */
export function timeLayout(locale: Locale, seconds: boolean): TimeLayout {
  const parts: TimeLayout["parts"][number][] = [];
  const editable: TimeEditableSegment[] = [];
  for (const segment of REFERENCE_TIME.segments(locale, { seconds })) {
    if (segment.type === "literal") {
      parts.push({ type: "literal", text: segment.value });
    } else {
      parts.push({ type: segment.type });
      editable.push(segment.type);
    }
  }
  return {
    tag: locale.tag,
    twelveHour: editable.includes("dayPeriod"),
    seconds,
    parts,
    editable,
    dayPeriods: LocalTime.dayPeriods(locale),
  };
}

/** The range a numeric segment's value is held in. */
function rangeOf(layout: TimeLayout, segment: TimeNumericSegment): { min: number; max: number } {
  if (segment !== "hour") return { min: 0, max: 59 };
  return layout.twelveHour ? { min: 1, max: 12 } : { min: 0, max: 23 };
}

/**
 * The state a field shows for `time`, unedited. A field without a `second` segment leaves the
 * second out, so a time with non-zero seconds shows its hour and minute only.
 */
export function initialTimeState(layout: TimeLayout, time: LocalTime | undefined): TimeFieldState {
  if (time === undefined) {
    return { hour: undefined, minute: undefined, second: undefined, dayPeriod: undefined, draft: undefined, edited: false };
  }
  return {
    hour: layout.twelveHour ? time.hour % 12 || 12 : time.hour,
    minute: time.minute,
    second: layout.seconds ? time.second : undefined,
    dayPeriod: layout.twelveHour ? (time.hour < 12 ? "am" : "pm") : undefined,
    draft: undefined,
    edited: false,
  };
}

/** The segments to render, in the locale's order, with each one's text from `state`. */
export function displaySegments(layout: TimeLayout, state: TimeFieldState): TimeDisplaySegment[] {
  return layout.parts.map((part) => {
    if (part.type === "literal") return part;
    if (part.type === "dayPeriod") {
      const period = state.dayPeriod;
      return {
        type: "dayPeriod",
        text: period === undefined ? undefined : layout.dayPeriods[period],
        value: period === undefined ? undefined : period === "am" ? 0 : 1,
        min: 0,
        max: 1,
      };
    }
    const value = state[part.type];
    const draft = state.draft?.segment === part.type ? state.draft.text : undefined;
    return {
      type: part.type,
      text: draft ?? (value === undefined ? undefined : String(value).padStart(2, "0")),
      value,
      ...rangeOf(layout, part.type),
    };
  });
}

/** The editable segment `offset` places from `segment` in logical order, or `undefined` past either end. */
export function adjacentSegment(layout: TimeLayout, segment: TimeEditableSegment, offset: number): TimeEditableSegment | undefined {
  return layout.editable[layout.editable.indexOf(segment) + offset];
}

/** The state with no entry in progress, so the next digit starts a segment afresh. */
export function endEntry(state: TimeFieldState): TimeFieldState {
  return state.draft === undefined ? state : { ...state, draft: undefined };
}

/**
 * Types `key` into `segment`, or returns `undefined` when `key` is not an ASCII digit.
 *
 * The digit is appended to the segment's entry in progress. Two digits that spell an in-range
 * value fill the segment; two that do not start it again from the new digit. One digit fills the
 * segment when no second digit could follow it in range (`3` in a 24-hour hour, `2` in a 12-hour
 * one, `6` in a minute), and otherwise waits for one, holding its value meanwhile where that is in
 * range. A filled segment reports `advance`.
 */
export function enterDigit(
  layout: TimeLayout,
  state: TimeFieldState,
  segment: TimeNumericSegment,
  key: string,
): TimeDigitEntry | undefined {
  if (!ASCII_DIGIT.test(key)) return undefined;
  const { min, max } = rangeOf(layout, segment);
  const pending = state.draft?.segment === segment ? state.draft.text : "";
  const combined = Number(pending + key);
  if (pending !== "" && combined >= min && combined <= max) {
    return { state: { ...state, [segment]: combined, draft: undefined, edited: true }, advance: true };
  }
  const digit = Number(key);
  if (digit * 10 > max) {
    return { state: { ...state, [segment]: digit, draft: undefined, edited: true }, advance: true };
  }
  return {
    state: { ...state, [segment]: digit >= min ? digit : undefined, draft: { segment, text: key }, edited: true },
    advance: false,
  };
}

/** Whether `time` lies before `bounds.min` or after `bounds.max`. */
export function isOutOfBounds(time: LocalTime, { min, max }: TimeBounds): boolean {
  return (min !== undefined && LocalTime.compare(time, min) < 0) || (max !== undefined && LocalTime.compare(time, max) > 0);
}

/**
 * Steps `segment` by `delta`, wrapping at either end of its range: a 24-hour hour from 23 to 00, a
 * 12-hour hour from 12 to 1, a minute from 59 to 00, and the day period between AM and PM. An
 * empty segment steps up to its lowest value and down to its highest.
 *
 * In a field whose every segment is filled, a step to a time outside `bounds` is refused and the
 * same state is returned. A field with an empty segment steps freely, since one segment alone does
 * not decide whether the time it ends up in is in bounds; the commit checks that.
 */
export function stepSegment(
  layout: TimeLayout,
  state: TimeFieldState,
  segment: TimeEditableSegment,
  delta: 1 | -1,
  bounds: TimeBounds = {},
): TimeFieldState {
  const next = steppedState(layout, state, segment, delta);
  if (toLocalTime(layout, state) === undefined) return next;
  // A full state stays full through a step, so the stepped time is defined.
  return isOutOfBounds(toLocalTime(layout, next) as LocalTime, bounds) ? state : next;
}

function steppedState(layout: TimeLayout, state: TimeFieldState, segment: TimeEditableSegment, delta: 1 | -1): TimeFieldState {
  if (segment === "dayPeriod") {
    const next: DayPeriod = state.dayPeriod === undefined ? (delta > 0 ? "am" : "pm") : state.dayPeriod === "am" ? "pm" : "am";
    return { ...state, dayPeriod: next, draft: undefined, edited: true };
  }
  const { min, max } = rangeOf(layout, segment);
  const current = state[segment];
  const span = max - min + 1;
  const next = current === undefined ? (delta > 0 ? min : max) : ((((current - min + delta) % span) + span) % span) + min;
  return { ...state, [segment]: next, draft: undefined, edited: true };
}

/**
 * Selects the day period whose label `key` picks out, or returns `undefined` when it picks out
 * neither. A key picks a label by the character at the first position where the two labels
 * differ, compared without regard to case: `a` and `p` for `AM` and `PM`, the second syllable for
 * `오전` and `오후`, which share their first.
 */
export function selectDayPeriod(layout: TimeLayout, state: TimeFieldState, key: string): TimeFieldState | undefined {
  const am = layout.dayPeriods.am.toLocaleLowerCase(layout.tag);
  const pm = layout.dayPeriods.pm.toLocaleLowerCase(layout.tag);
  const typed = key.toLocaleLowerCase(layout.tag);
  let at = 0;
  while (at < am.length && am[at] === pm[at]) at += 1;
  const period: DayPeriod | undefined = typed === am[at] ? "am" : typed === pm[at] ? "pm" : undefined;
  return period === undefined ? undefined : { ...state, dayPeriod: period, draft: undefined, edited: true };
}

/** Empties `segment`. */
export function clearSegment(state: TimeFieldState, segment: TimeEditableSegment): TimeFieldState {
  return { ...state, [segment]: undefined, draft: undefined, edited: true };
}

/** The time every segment of `layout` spells, or `undefined` while any of them is empty. */
export function toLocalTime(layout: TimeLayout, state: TimeFieldState): LocalTime | undefined {
  const { hour, minute, second, dayPeriod } = state;
  const shownSecond = layout.seconds ? second : 0;
  if (hour === undefined || minute === undefined || shownSecond === undefined) return undefined;
  if (layout.twelveHour && dayPeriod === undefined) return undefined;
  const hour24 = layout.twelveHour ? (hour % 12) + (dayPeriod === "pm" ? 12 : 0) : hour;
  return LocalTime.of(hour24, minute, shownSecond);
}

/** Whether every segment of `layout` is empty in `state`. */
function isEmpty(layout: TimeLayout, state: TimeFieldState): boolean {
  return layout.editable.every((segment) => state[segment] === undefined);
}

/**
 * The value committing `state` yields. A field without a `second` segment commits a time whose
 * second is zero, so the first edit of a value with non-zero seconds drops them; until that edit
 * the commit is `unchanged` and the value keeps them. A filled field whose time lies outside
 * `bounds` is `rejected`; an unedited one is `unchanged` whatever its time.
 */
export function commitTimeState(layout: TimeLayout, state: TimeFieldState, bounds: TimeBounds = {}): TimeFieldCommit {
  if (!state.edited) return { kind: "unchanged" };
  if (isEmpty(layout, state)) return { kind: "value", value: undefined };
  const value = toLocalTime(layout, state);
  if (value === undefined) return { kind: "incomplete" };
  return isOutOfBounds(value, bounds) ? { kind: "rejected" } : { kind: "value", value };
}
