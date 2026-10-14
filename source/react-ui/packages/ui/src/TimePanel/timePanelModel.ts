import { type Locale, LocalTime } from "@vipengele/ts";
import { type TimeLayout, timeLayout } from "../TimeField/timeSegments.js";

/** One of a time panel's option strips. */
export type TimeStripKind = "hour" | "minute" | "dayPeriod";

/** The value of the day period strip's AM option; PM is `1`, as in `displaySegments`. */
const AM = 0;

/**
 * One option of a strip. `value` is the clock hour (1-12 on a 12-hour layout, 0-23 otherwise),
 * the minute, or the day period, `0` for AM and `1` for PM.
 */
export interface TimeStripOption {
  readonly value: number;
  readonly label: string;
  readonly selected: boolean;
  /** Whether no allowed time uses this option while the other strips keep their selections. */
  readonly disabled: boolean;
}

/** A strip and its options in the order they are shown. */
export interface TimeStrip {
  readonly kind: TimeStripKind;
  readonly options: readonly TimeStripOption[];
}

/** What, besides the value and the layout, decides a panel's options. */
export interface TimePanelSettings {
  /** The minutes between two adjacent minute options, a positive integer. */
  readonly minuteStep: number;
  /** Whether `time` may not be picked. Every time is allowed when it is absent. */
  readonly isTimeDisabled?: ((time: LocalTime) => boolean) | undefined;
}

/** The strips' selections; each is `undefined` while the panel has no value. */
interface Selection {
  readonly hour: number | undefined;
  readonly minute: number | undefined;
  readonly dayPeriod: number | undefined;
}

/** One value per strip, the day period ignored on a 24-hour layout. */
type Choice = Record<TimeStripKind, number>;

const KINDS: readonly TimeStripKind[] = ["hour", "minute", "dayPeriod"];

/**
 * The layout a time panel reads in `locale`. Whether the locale counts hours 1-12 comes from the
 * segments it writes a time with, not from its hour cycle, which also distinguishes h11 and h24
 * clocks that the panel shows the same way.
 */
export function timePanelLayout(locale: Locale): TimeLayout {
  return timeLayout(locale, false);
}

/** The hour options: 12, 1 … 11 on a 12-hour layout, 0 … 23 otherwise. */
function hourValues(layout: TimeLayout): number[] {
  return Array.from({ length: layout.twelveHour ? 12 : 24 }, (_, index) => (layout.twelveHour ? index || 12 : index));
}

/**
 * The minute options: every multiple of `minuteStep` below 60, plus `value`'s minute in order when
 * it is off that grid, so a typed minute stays selected.
 */
function minuteValues(minuteStep: number, value: LocalTime | undefined): number[] {
  if (!Number.isInteger(minuteStep) || minuteStep < 1) {
    throw new RangeError(`minuteStep must be a positive integer, got ${minuteStep}`);
  }
  const minutes: number[] = [];
  for (let minute = 0; minute < 60; minute += minuteStep) minutes.push(minute);
  if (value !== undefined && !minutes.includes(value.minute)) {
    minutes.push(value.minute);
    minutes.sort((a, b) => a - b);
  }
  return minutes;
}

/** Each strip's option values; a 24-hour layout has no day period strip. */
function stripValues(layout: TimeLayout, value: LocalTime | undefined, settings: TimePanelSettings): Record<TimeStripKind, number[]> {
  return {
    hour: hourValues(layout),
    minute: minuteValues(settings.minuteStep, value),
    dayPeriod: layout.twelveHour ? [AM, 1] : [],
  };
}

function selectionOf(layout: TimeLayout, value: LocalTime | undefined): Selection {
  if (value === undefined) return { hour: undefined, minute: undefined, dayPeriod: undefined };
  return {
    hour: layout.twelveHour ? value.hour % 12 || 12 : value.hour,
    minute: value.minute,
    dayPeriod: layout.twelveHour ? (value.hour < 12 ? AM : 1) : undefined,
  };
}

/** The time `choice` spells, with zero seconds. */
function timeOf(layout: TimeLayout, choice: Choice): LocalTime {
  const hour = layout.twelveHour ? (choice.hour % 12) + (choice.dayPeriod === AM ? 0 : 12) : choice.hour;
  return LocalTime.of(hour, choice.minute);
}

function isAllowed(settings: TimePanelSettings, time: LocalTime): boolean {
  return settings.isTimeDisabled === undefined || !settings.isTimeDisabled(time);
}

/** Every choice drawing each strip's value from its domain. A 24-hour layout's empty period domain counts as AM. */
function* choices(domains: Record<TimeStripKind, readonly number[]>): Generator<Choice> {
  const periods = domains.dayPeriod.length === 0 ? [AM] : domains.dayPeriod;
  for (const hour of domains.hour) {
    for (const minute of domains.minute) {
      for (const dayPeriod of periods) yield { hour, minute, dayPeriod };
    }
  }
}

function label(layout: TimeLayout, kind: TimeStripKind, value: number): string {
  if (kind === "dayPeriod") return value === AM ? layout.dayPeriods.am : layout.dayPeriods.pm;
  return String(value).padStart(2, "0");
}

/**
 * The strips a panel shows for `value`: hour, minute, and on a 12-hour layout the day period. A
 * `value` of `undefined` selects no option. An option is disabled when no allowed time uses it with
 * the other strips held at their selections, an unset strip counting as any of its options.
 * Seconds are not read.
 */
export function timePanelStrips(layout: TimeLayout, value: LocalTime | undefined, settings: TimePanelSettings): TimeStrip[] {
  const values = stripValues(layout, value, settings);
  const selection = selectionOf(layout, value);
  return KINDS.filter((kind) => values[kind].length > 0).map((kind) => ({
    kind,
    options: values[kind].map((option) => ({
      value: option,
      label: label(layout, kind, option),
      selected: selection[kind] === option,
      disabled: !usesAllowedTime(layout, values, selection, settings, kind, option),
    })),
  }));
}

/** Whether some allowed time has `option` in `kind` and the other strips' selections, or any of their options where unset. */
function usesAllowedTime(
  layout: TimeLayout,
  values: Record<TimeStripKind, number[]>,
  selection: Selection,
  settings: TimePanelSettings,
  kind: TimeStripKind,
  option: number,
): boolean {
  if (settings.isTimeDisabled === undefined) return true;
  const domains = domainsAround(values, selection, kind, option, () => true);
  for (const choice of choices(domains)) {
    if (isAllowed(settings, timeOf(layout, choice))) return true;
  }
  return false;
}

/**
 * The values each strip may take with `kind` set to `option`: the picked option alone, each strip
 * that `fixed` names held at its selection, and every other strip free across its options.
 */
function domainsAround(
  values: Record<TimeStripKind, number[]>,
  selection: Selection,
  kind: TimeStripKind,
  option: number,
  fixed: (strip: TimeStripKind) => boolean,
): Record<TimeStripKind, readonly number[]> {
  const domainOf = (strip: TimeStripKind): readonly number[] => {
    if (strip === kind) return [option];
    const selected = selection[strip];
    return selected !== undefined && fixed(strip) ? [selected] : values[strip];
  };
  return { hour: domainOf("hour"), minute: domainOf("minute"), dayPeriod: domainOf("dayPeriod") };
}

function minuteOfDay(time: LocalTime): number {
  return time.hour * 60 + time.minute;
}

/**
 * The time picking `option` in `kind` commits, with zero seconds. The picked strip takes `option`
 * and the others keep their selections; on a panel with no value they take their first option, hour
 * 12 (or 0), minute 00 and AM.
 *
 * When that time is disallowed, the other strips move to the allowed time nearest it, the earlier of
 * two equally near. An hour pick never moves a selected day period, so stepping the hour of a
 * 12-hour clock stays in its half of the day. Returns `undefined` when no allowed time is reachable.
 */
export function pickTimeOption(
  layout: TimeLayout,
  value: LocalTime | undefined,
  kind: TimeStripKind,
  option: number,
  settings: TimePanelSettings,
): LocalTime | undefined {
  const values = stripValues(layout, value, settings);
  const selection = selectionOf(layout, value);
  const preferred = timeOf(layout, {
    hour: selection.hour ?? (values.hour[0] as number),
    minute: selection.minute ?? (values.minute[0] as number),
    dayPeriod: selection.dayPeriod ?? AM,
    [kind]: option,
  });
  if (isAllowed(settings, preferred)) return preferred;
  const domains = domainsAround(values, selection, kind, option, (strip) => kind === "hour" && strip === "dayPeriod");
  let nearest: LocalTime | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const choice of choices(domains)) {
    const time = timeOf(layout, choice);
    if (!isAllowed(settings, time)) continue;
    const distance = Math.abs(minuteOfDay(time) - minuteOfDay(preferred));
    if (distance < nearestDistance || (distance === nearestDistance && nearest !== undefined && LocalTime.compare(time, nearest) < 0)) {
      nearest = time;
      nearestDistance = distance;
    }
  }
  return nearest;
}
