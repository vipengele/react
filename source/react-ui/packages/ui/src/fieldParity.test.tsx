import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { type DateSegment, Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { describe, expect, it } from "vitest";
import { DateField } from "./DateField/DateField.js";
import { type DateFieldSegment, readDateRun, segmentRanges } from "./DateField/dateFieldEditing.js";
import { DateRangeField } from "./DateRangeField/DateRangeField.js";
import { DateTimeField } from "./DateTimeField/DateTimeField.js";
import { dateTimeSegmentRanges, dateTimeSegments } from "./DateTimeField/dateTimeFieldModel.js";
import { DateTimeRangeField } from "./DateTimeRangeField/DateTimeRangeField.js";
import { TimeField } from "./TimeField/TimeField.js";
import { type TimeEditableSegment, timeLayout } from "./TimeField/timeSegments.js";
import { TimeRangeField } from "./TimeRangeField/TimeRangeField.js";

/**
 * Every date types and steps the same and every time types and steps the same, in every field that
 * holds one. One script of logical keys runs through a reference field and through each field that
 * must agree with it, and the text each one shows is compared at every keystroke:
 *
 * - The date in `DateRangeField`'s editors and the date half of `DateTimeField` and
 *   `DateTimeRangeField` against `DateField`'s box.
 * - The time in `TimeRangeField`'s editors and the time half of `DateTimeField` and
 *   `DateTimeRangeField` against the text of `TimeField`'s rendered `displaySegments`.
 *
 * What is compared is the displayed text, never the committed value: the parsers read unpadded
 * digits and either letter case alike, so two fields showing different text can commit the same
 * value.
 */

const TODAY = LocalDate.of(2026, 10, 14);

/** The date-time whose layout splits a combined box into its halves, and whose date the time scripts type first. */
const SAMPLE = LocalDateTime.parse("2026-10-15T21:05");

/** The logical key for "the separator here", which each kind of field takes in its own way (see `dateSeparator`, `timeSeparator`). */
const SEPARATOR = "|";

/** The arrow keys every stepping block presses on each segment, in order. */
const STEPS = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowDown"] as const;

/** What one field shows after one logical key of a script. */
interface Shown {
  readonly key: string;
  readonly text: string;
}

/**
 * `text` with U+202F read as a plain space: ICU writes it before a 12-hour day period in some
 * versions and a plain space in others.
 */
function plain(text: string): string {
  return text.replace(/ /g, " ");
}

function plainAll(shown: readonly Shown[]): Shown[] {
  return shown.map(({ key, text }) => ({ key, text: plain(text) }));
}

/** Real focus, not a synthesised event: the fields adopt their drafts as focus lands. */
const focus = (element: HTMLElement) => act(() => element.focus());

/** Types each character of `chars` onto the end of `input`, one change event per character, as a keyboard does. */
function typeChars(input: HTMLInputElement, chars: string): void {
  for (const char of chars) {
    fireEvent.change(input, { target: { value: input.value + char } });
  }
}

/** Puts the caret at `offset` in `input` and presses `key` there. */
function pressAt(input: HTMLInputElement, offset: number, key: string): void {
  input.setSelectionRange(offset, offset);
  fireEvent.keyDown(input, { key });
}

const textbox = (name: string) => screen.getByRole("textbox", { name }) as HTMLInputElement;
const group = (name: string) => screen.getByRole("group", { name });

/**
 * The literal written right before (`-1`) or right after (`1`) the editable part at `at`, with
 * every literal that stands next to it on that side; empty when an editable part or either end is
 * there. `parts` holds each literal's text and `undefined` for each editable part.
 */
function adjacentLiteral(parts: readonly (string | undefined)[], at: number, direction: 1 | -1): string {
  let text = "";
  for (let index = at + direction; index >= 0 && index < parts.length; index += direction) {
    const part = parts[index];
    if (part === undefined) break;
    text = direction > 0 ? text + part : part + text;
  }
  return text;
}

/** The date's segments under `locale`, in the order `LocalDate#segments` writes them. */
function dateParts(locale: Locale): DateSegment[] {
  return SAMPLE.date.segments(locale);
}

/**
 * The combined box's layout under `locale`, from `dateTimeSegments`: the literal between the halves
 * and the text before the time half once the sample's date is complete. Every locale under test
 * writes the date first, which the layout block asserts.
 */
function combinedLayout(locale: Locale): { gap: string; timePrefix: string } {
  const segments = dateTimeSegments(SAMPLE, locale);
  const dateCount = dateParts(locale).length;
  return {
    gap: (segments[dateCount] as { value: string }).value,
    timePrefix: segments
      .slice(0, dateCount + 1)
      .map((segment) => segment.value)
      .join(""),
  };
}

/** The digits of the sample's date in the order `locale` writes them: what a user types to enter it. */
function dateDigits(locale: Locale): string {
  return dateParts(locale)
    .filter((segment) => segment.type !== "literal")
    .map((segment) => segment.value)
    .join("");
}

// ---------------------------------------------------------------------------------------------
// The date half
// ---------------------------------------------------------------------------------------------

/**
 * What the separator key types into a date box holding `text`. Every date field is a text box, so
 * the same characters reach all of them:
 *
 * - On a field holding digits, the literal the locale writes after it, as a user ends a field early
 *   (`1` then `/` in `en-US`). After the last field that is the date's own trailing literal
 *   (ko-KR's `.`), and nothing where the locale writes none.
 * - On an empty field, the last character of the literal before it, which the box already ends
 *   with: a user typing the separator the field appended.
 */
function dateSeparator(text: string, locale: Locale): string {
  const segments = dateParts(locale);
  const reading = readDateRun(text, segments, false);
  if (reading.status !== "inside") return "";
  const parts = segments.map((segment) => (segment.type === "literal" ? segment.value : undefined));
  const at = segments.findIndex((segment) => segment.type === reading.segment);
  return reading.digits === "" ? adjacentLiteral(parts, at, -1).slice(-1) : adjacentLiteral(parts, at, 1);
}

/** `DateField`'s box after each key of `script`, and the characters each key typed. */
function runDateField(locale: Locale, script: string): (Shown & { typed: string })[] {
  const { unmount } = render(<DateField aria-label="Reference" locale={locale} today={TODAY} />);
  const input = textbox("Reference");
  focus(input);
  const shown = [...script].map((key) => {
    const typed = key === SEPARATOR ? dateSeparator(input.value, locale) : key;
    typeChars(input, typed);
    return { key, typed, text: input.value };
  });
  unmount();
  return shown;
}

/**
 * A combined box's text split at the end of its date half, which `readDateRun` finds against the
 * date's segments. `rest` is what follows the date: nothing, or the literal before the time.
 */
function splitDateHalf(text: string, locale: Locale): { date: string; rest: string } {
  const reading = readDateRun(text, dateParts(locale), true);
  if (reading.status !== "past") return { date: text, rest: "" };
  return { date: text.slice(0, text.length - reading.rest.length), rest: reading.rest };
}

/**
 * The date half a combined box shows where `DateField` shows `text`. The time follows the date in
 * the combined box, so a digit completing the date's last field is followed there by the literals
 * after it (ko-KR's `.`), which `DateField` never writes after its last field. Everything else is
 * `DateField`'s text as it is.
 */
function dateHalfFor(text: string, locale: Locale): string {
  const segments = dateParts(locale);
  const reading = readDateRun(text, segments, false);
  if (reading.status !== "inside" || !reading.last || !reading.complete) return text;
  const parts = segments.map((segment) => (segment.type === "literal" ? segment.value : undefined));
  const at = segments.findIndex((segment) => segment.type === reading.segment);
  return text + adjacentLiteral(parts, at, 1);
}

interface DateSubject {
  readonly name: string;
  /** Whether the box holds a date and a time, so its date half is compared rather than its whole text. */
  readonly combined: boolean;
  /** Renders the field, empty or holding `value`, and returns the box to drive. */
  readonly mount: (locale: Locale, value: LocalDate | undefined) => HTMLInputElement;
}

const NOON = LocalTime.of(12, 0);

const DATE_SUBJECTS: readonly DateSubject[] = [
  {
    name: "DateRangeField start",
    combined: false,
    mount: (locale, value) => {
      render(
        <DateRangeField
          aria-label="Subject"
          locale={locale}
          today={TODAY}
          defaultValue={value === undefined ? undefined : { start: value, end: value }}
        />,
      );
      return textbox("Subject Start");
    },
  },
  {
    name: "DateRangeField end",
    combined: false,
    mount: (locale, value) => {
      render(
        <DateRangeField
          aria-label="Subject"
          locale={locale}
          today={TODAY}
          defaultValue={value === undefined ? undefined : { start: value, end: value }}
        />,
      );
      return textbox("Subject End");
    },
  },
  {
    name: "DateTimeField",
    combined: true,
    mount: (locale, value) => {
      render(
        <DateTimeField
          aria-label="Subject"
          locale={locale}
          today={TODAY}
          defaultValue={value === undefined ? undefined : LocalDateTime.of(value, NOON)}
        />,
      );
      return textbox("Subject");
    },
  },
  {
    name: "DateTimeRangeField start",
    combined: true,
    mount: (locale, value) => {
      const at = value === undefined ? undefined : LocalDateTime.of(value, NOON);
      render(
        <DateTimeRangeField
          aria-label="Subject"
          locale={locale}
          today={TODAY}
          defaultValue={at === undefined ? undefined : { start: at, end: at }}
        />,
      );
      return textbox("Subject Start");
    },
  },
  {
    name: "DateTimeRangeField end",
    combined: true,
    mount: (locale, value) => {
      const at = value === undefined ? undefined : LocalDateTime.of(value, NOON);
      render(
        <DateTimeRangeField
          aria-label="Subject"
          locale={locale}
          today={TODAY}
          defaultValue={at === undefined ? undefined : { start: at, end: at }}
        />,
      );
      return textbox("Subject End");
    },
  },
];

/**
 * The date `subject` shows in `input`, and what follows it: the whole box and nothing, or a combined
 * box's date half and the rest of its text.
 */
function shownDate(subject: DateSubject, input: HTMLInputElement, locale: Locale): { date: string; rest: string } {
  return subject.combined ? splitDateHalf(input.value, locale) : { date: input.value, rest: "" };
}

/** What `subject` must show where `DateField` shows `text`. */
function expectedDate(subject: DateSubject, text: string, locale: Locale): string {
  return subject.combined ? dateHalfFor(text, locale) : text;
}

/** Where the caret sits to step `segment` of a date box: the segment's start, from the box's own layout. */
function dateSegmentStart(subject: DateSubject | undefined, input: HTMLInputElement, segment: DateFieldSegment, locale: Locale): number {
  const ranges = subject?.combined ? dateTimeSegmentRanges(input.value, locale) : segmentRanges(input.value, locale);
  const range = ranges?.find((candidate) => candidate.segment === segment);
  if (range === undefined) throw new Error(`no ${segment} segment in ${JSON.stringify(input.value)}`);
  return range.start;
}

/** A date box after each arrow key of `STEPS` on each of its segments in turn. */
function stepDateBox(subject: DateSubject | undefined, input: HTMLInputElement, locale: Locale, read: () => string): Shown[] {
  focus(input);
  const shown: Shown[] = [];
  for (const segment of ["year", "month", "day"] as const) {
    for (const key of STEPS) {
      pressAt(input, dateSegmentStart(subject, input, segment, locale), key);
      shown.push({ key: `${segment} ${key}`, text: read() });
    }
  }
  return shown;
}

// ---------------------------------------------------------------------------------------------
// The time half
// ---------------------------------------------------------------------------------------------

/** One rendered part of a time editor: a literal's text, or a segment and the text it shows. */
type RenderedTimePart = { readonly literal: string } | { readonly segment: TimeEditableSegment; readonly text: string | undefined };

/** The parts a time editor renders from `displaySegments`, in order. An empty segment's text is `undefined`. */
function renderedTimeParts(editor: HTMLElement): RenderedTimePart[] {
  return [...editor.querySelectorAll<HTMLElement>(".vpg-time-field-literal, .vpg-time-field-segment")].map((element) =>
    element.classList.contains("vpg-time-field-literal")
      ? { literal: element.textContent ?? "" }
      : {
          segment: element.dataset.segment as TimeEditableSegment,
          text: element.hasAttribute("data-empty") ? undefined : (element.textContent ?? ""),
        },
  );
}

/** Whether a segment's text is a digit that may still take another: a completed numeric segment shows two. */
function isPending(text: string | undefined): boolean {
  return text !== undefined && /^\d$/.test(text);
}

/**
 * The text of a time editor's `displaySegments` joined, as a text box holds the same entry: each
 * segment up to the first empty one, a completed segment followed by the literals that lead to the
 * next segment, a pending digit by nothing, and the last segment by nothing.
 */
function joinedTimeText(editor: HTMLElement): string {
  let text = "";
  let literals = "";
  for (const part of renderedTimeParts(editor)) {
    if ("literal" in part) {
      literals += part.literal;
      continue;
    }
    if (part.text === undefined) return text + literals;
    text += literals + part.text;
    literals = "";
    if (isPending(part.text)) return text;
  }
  return text;
}

/** How a segment field takes one logical key: pressed as it is, as ArrowRight, or not at all. */
type SegmentAction = "key" | "ArrowRight" | "skip";

/** One key of a time script as `TimeField` took it. */
interface TimeKey extends Shown {
  /** The segment that held focus when the key arrived. */
  readonly segment: TimeEditableSegment;
  readonly action: SegmentAction;
  /** The characters the key types into a text box. */
  readonly typed: string;
}

/**
 * How the separator key reaches each kind of field, given the segment that holds focus in
 * `TimeField` and the text it shows. `TimeField` takes no separator character: it ignores `:`.
 *
 * - On a pending digit, a text box takes the literal after the segment and pads the digit
 *   (`1` then `:` reads `01:`). `TimeField` moves on with ArrowRight, which ends the entry and pads
 *   the digit the same way.
 * - On an empty segment, a text box takes the last character of the literal before it, which it
 *   already ends with, and drops it. `TimeField`, already on that segment, takes nothing.
 * - On a completed segment, which only the last segment stays focused as, there is no literal
 *   after it and neither field takes anything.
 */
function timeSeparator(locale: Locale, segment: TimeEditableSegment, text: string | undefined): { action: SegmentAction; typed: string } {
  const layout = timeLayout(locale, false);
  const parts = layout.parts.map((part) => (part.type === "literal" ? part.text : undefined));
  const at = layout.parts.findIndex((part) => part.type === segment);
  if (text === undefined) return { action: "skip", typed: adjacentLiteral(parts, at, -1).slice(-1) };
  return { action: isPending(text) ? "ArrowRight" : "skip", typed: adjacentLiteral(parts, at, 1) };
}

/** `TimeField` after each key of `script`, pressed on whichever segment holds focus when it arrives. */
function runTimeField(locale: Locale, script: string): TimeKey[] {
  const { unmount } = render(<TimeField aria-label="Reference" locale={locale} />);
  const editor = group("Reference");
  focus(within(editor).getAllByRole("spinbutton")[0] as HTMLElement);
  const keys = [...script].map((key) => {
    const active = document.activeElement as HTMLElement;
    const segment = active.dataset.segment as TimeEditableSegment;
    const text = active.hasAttribute("data-empty") ? undefined : (active.textContent ?? "");
    const { action, typed } = key === SEPARATOR ? timeSeparator(locale, segment, text) : { action: "key" as const, typed: key };
    if (action !== "skip") fireEvent.keyDown(active, { key: action === "key" ? key : action });
    return { key, segment, action, typed, text: joinedTimeText(editor) };
  });
  unmount();
  return keys;
}

interface TimeSubject {
  readonly name: string;
  /** Renders the field empty and runs `keys` through it, returning what it shows after each. */
  readonly type: (locale: Locale, keys: readonly TimeKey[]) => Shown[];
  /** Renders the field holding `value` and steps each segment through `STEPS`. */
  readonly step: (locale: Locale, value: LocalTime) => Shown[];
}

/** A `TimeRangeField` editor: a segment field, which takes each key on the segment `TimeField` took it on. */
function timeRangeSubject(end: "Start" | "End"): TimeSubject {
  const mount = (locale: Locale, value: LocalTime | undefined) => {
    render(
      <TimeRangeField aria-label="Subject" locale={locale} defaultValue={value === undefined ? undefined : { start: value, end: value }} />,
    );
    const editor = group(`Subject ${end}`);
    const segment = (name: TimeEditableSegment) => editor.querySelector<HTMLElement>(`[data-segment="${name}"]`) as HTMLElement;
    return { editor, segment };
  };
  return {
    name: `TimeRangeField ${end.toLowerCase()}`,
    type: (locale, keys) => {
      const { editor, segment } = mount(locale, undefined);
      return keys.map(({ key, segment: name, action }) => {
        if (action !== "skip") {
          const target = segment(name);
          if (document.activeElement !== target) focus(target);
          fireEvent.keyDown(target, { key: action === "key" ? key : action });
        }
        return { key, text: joinedTimeText(editor) };
      });
    },
    step: (locale, value) => {
      const { editor, segment } = mount(locale, value);
      return stepSegments(locale, segment, () => joinedTimeText(editor));
    },
  };
}

/** Steps each segment of a segment field through `STEPS`. */
function stepSegments(locale: Locale, segment: (name: TimeEditableSegment) => HTMLElement, read: () => string): Shown[] {
  const shown: Shown[] = [];
  for (const name of timeLayout(locale, false).editable) {
    focus(segment(name));
    for (const key of STEPS) {
      fireEvent.keyDown(segment(name), { key });
      shown.push({ key: `${name} ${key}`, text: read() });
    }
  }
  return shown;
}

/**
 * The time half of a combined box: the text after the complete date and the literal before the
 * time, as `dateTimeSegments` lays them out.
 */
function timeHalf(text: string, locale: Locale): string {
  const { timePrefix } = combinedLayout(locale);
  expect(plain(text.slice(0, timePrefix.length))).toBe(plain(timePrefix));
  return text.slice(timePrefix.length);
}

/** A combined box: a text field, which types the date first and then each key's characters. */
function combinedTimeSubject(name: string, mount: (locale: Locale, value: LocalDateTime | undefined) => HTMLInputElement): TimeSubject {
  return {
    name,
    type: (locale, keys) => {
      const input = mount(locale, undefined);
      focus(input);
      typeChars(input, dateDigits(locale));
      return keys.map(({ key, typed }) => {
        typeChars(input, typed);
        return { key, text: timeHalf(input.value, locale) };
      });
    },
    step: (locale, value) => {
      const input = mount(locale, LocalDateTime.of(SAMPLE.date, value));
      focus(input);
      const shown: Shown[] = [];
      for (const segment of timeLayout(locale, false).editable) {
        for (const key of STEPS) {
          const range = dateTimeSegmentRanges(input.value, locale)?.find((candidate) => candidate.segment === segment);
          if (range === undefined) throw new Error(`no ${segment} segment in ${JSON.stringify(input.value)}`);
          pressAt(input, range.start, key);
          shown.push({ key: `${segment} ${key}`, text: timeHalf(input.value, locale) });
        }
      }
      return shown;
    },
  };
}

const TIME_SUBJECTS: readonly TimeSubject[] = [
  timeRangeSubject("Start"),
  timeRangeSubject("End"),
  combinedTimeSubject("DateTimeField", (locale, value) => {
    render(<DateTimeField aria-label="Subject" locale={locale} today={TODAY} defaultValue={value} />);
    return textbox("Subject");
  }),
  combinedTimeSubject("DateTimeRangeField start", (locale, value) => {
    render(
      <DateTimeRangeField
        aria-label="Subject"
        locale={locale}
        today={TODAY}
        defaultValue={value === undefined ? undefined : { start: value, end: value }}
      />,
    );
    return textbox("Subject Start");
  }),
  combinedTimeSubject("DateTimeRangeField end", (locale, value) => {
    render(
      <DateTimeRangeField
        aria-label="Subject"
        locale={locale}
        today={TODAY}
        defaultValue={value === undefined ? undefined : { start: value, end: value }}
      />,
    );
    return textbox("Subject End");
  }),
];

/** `TimeField` holding `value`, after each arrow key of `STEPS` on each of its segments in turn. */
function stepTimeField(locale: Locale, value: LocalTime): Shown[] {
  const { unmount } = render(<TimeField aria-label="Reference" locale={locale} defaultValue={value} />);
  const editor = group("Reference");
  const segment = (name: TimeEditableSegment) => editor.querySelector<HTMLElement>(`[data-segment="${name}"]`) as HTMLElement;
  const shown = stepSegments(locale, segment, () => joinedTimeText(editor));
  unmount();
  return shown;
}

// ---------------------------------------------------------------------------------------------
// The scripts
// ---------------------------------------------------------------------------------------------

/**
 * The scripts each locale runs. A character is a key typed as it is and `|` the separator. A time
 * script types into the time alone; the combined boxes type the sample's date first.
 */
interface LocaleCase {
  readonly tag: string;
  readonly dates: readonly string[];
  readonly times: readonly string[];
  /** The date the stepping blocks start from: a month's last day, so a month step clamps it. */
  readonly stepDate: LocalDate;
  /** The times the stepping blocks start from: each wraps at the top of a segment. */
  readonly stepTimes: readonly LocalTime[];
  /** A date script and the text `DateField` shows after each of its keys, which pins the reference itself. */
  readonly dateAnchor: readonly [string, readonly string[]];
  /** A time script and the text `TimeField`'s segments show after each of its keys. */
  readonly timeAnchor: readonly [string, readonly string[]];
}

const CASES: readonly LocaleCase[] = [
  {
    tag: "en-US",
    dates: ["10152026", "1|5|2026", "10|15|2026", "12319999"],
    times: [
      // Full entry, and each day-period key in either case.
      "0905p",
      "0905P",
      "0905a",
      "0905A",
      // A day-period key replacing a completed period, and keys that pick out neither period.
      "0905pa",
      "0905Ap",
      "0905pm",
      "0905xp",
      // A 12-hour hour that cannot take a second digit is padded; `1` then `9` starts it again.
      "305p",
      "205a",
      "1905p",
      "1205a",
      // A second `0` in a 12-hour hour is swallowed.
      "00905p",
      // A minute of `6` to `9` cannot take a second digit and is padded.
      "076a",
      "077p",
      "078p",
      "079p",
      // A letter in a numeric segment is swallowed.
      "0x9a05p",
      // A separator on a pending digit pads it; one repeating an appended literal is dropped.
      "1|5|p",
      "09|05|p",
    ],
    stepDate: LocalDate.of(2026, 1, 31),
    stepTimes: [LocalTime.of(23, 59), LocalTime.of(12, 0), LocalTime.of(0, 0)],
    dateAnchor: ["1|5|2026", ["1", "1/", "1/5", "1/5/", "1/5/2", "1/5/20", "1/5/202", "1/5/2026"]],
    timeAnchor: ["1|5|p", ["1", "01:", "01:5", "01:05 ", "01:05 PM"]],
  },
  {
    tag: "de-DE",
    dates: ["15102026", "1|1|2026", "15|10|2026", "31129999"],
    times: [
      "2105",
      // A 24-hour hour of `3` cannot take a second digit and is padded; `2` then `4` starts it again.
      "305",
      "2405",
      "1305",
      "0000",
      // A minute of `6` to `9` is padded.
      "216",
      "219",
      // Letters are swallowed on a 24-hour clock.
      "2a1p05",
      "9|5",
      "21|05",
    ],
    stepDate: LocalDate.of(2026, 1, 31),
    stepTimes: [LocalTime.of(23, 59), LocalTime.of(0, 0)],
    dateAnchor: ["15102026", ["1", "15.", "15.1", "15.10.", "15.10.2", "15.10.20", "15.10.202", "15.10.2026"]],
    timeAnchor: ["2405", ["2", "04:", "04:0", "04:05"]],
  },
  {
    tag: "ko-KR",
    dates: ["20261015", "20261015|", "2026|1|5|", "99991231"],
    times: [
      // The day period comes first and is picked by its second syllable.
      "후0905",
      "전0905",
      // A Latin letter picks out neither period, and a period key on the hour is swallowed.
      "p후0905",
      "a전0905",
      "후전0905",
      "후1905",
      "후305",
      "후00905",
      "후076",
      "후|1|5",
      "후09|05",
    ],
    stepDate: LocalDate.of(2026, 1, 31),
    stepTimes: [LocalTime.of(23, 59), LocalTime.of(12, 0), LocalTime.of(0, 0)],
    dateAnchor: ["20261015|", ["2", "20", "202", "2026. ", "2026. 1", "2026. 10. ", "2026. 10. 1", "2026. 10. 15", "2026. 10. 15."]],
    timeAnchor: ["후|1|5|", ["오후 ", "오후 ", "오후 1", "오후 01:", "오후 01:5", "오후 01:5"]],
  },
];

// ---------------------------------------------------------------------------------------------
// The tests
// ---------------------------------------------------------------------------------------------

describe.each(CASES)("$tag", ({ tag, dates, times, stepDate, stepTimes, dateAnchor, timeAnchor }) => {
  const locale = new Locale(tag);

  it("drives DateField and TimeField through a script to the text each shows on its own", () => {
    const [dateScript, dateTexts] = dateAnchor;
    expect(runDateField(locale, dateScript).map(({ text }) => text)).toEqual(dateTexts);
    const [timeScript, timeTexts] = timeAnchor;
    expect(runTimeField(locale, timeScript).map(({ text }) => plain(text))).toEqual(timeTexts);
  });

  it("writes the date first, then one literal, then the time, so the combined box splits into halves", () => {
    const segments = dateTimeSegments(SAMPLE, locale);
    const dateCount = dateParts(locale).length;
    expect(segments.slice(0, dateCount)).toEqual(dateParts(locale));
    expect(segments[dateCount]?.type).toBe("literal");
    expect(segments.slice(dateCount + 1)).toEqual(SAMPLE.time.segments(locale));
  });

  describe.each(DATE_SUBJECTS)("the date in $name", (subject) => {
    it.each(dates)("shows DateField's text at every keystroke of %s", (script) => {
      const reference = runDateField(locale, script);
      const input = subject.mount(locale, undefined);
      focus(input);
      const shown = reference.map(({ key, typed }) => {
        typeChars(input, typed);
        const { date, rest } = shownDate(subject, input, locale);
        // Nothing but the literal before the time ever follows a date typed on its own.
        expect(["", plain(combinedLayout(locale).gap)]).toContain(plain(rest));
        return { key, text: date };
      });
      const expected = reference.map(({ key, text }) => ({ key, text: expectedDate(subject, text, locale) }));
      expect(plainAll(shown)).toEqual(plainAll(expected));
    });

    it("steps each segment to the text DateField steps it to", () => {
      const { unmount } = render(<DateField aria-label="Reference" locale={locale} today={TODAY} defaultValue={stepDate} />);
      const referenceBox = textbox("Reference");
      const reference = stepDateBox(undefined, referenceBox, locale, () => referenceBox.value);
      unmount();

      const input = subject.mount(locale, stepDate);
      const { rest } = shownDate(subject, input, locale);
      const shown = stepDateBox(subject, input, locale, () => {
        const half = shownDate(subject, input, locale);
        // A date step leaves the rest of the box, the time half included, as it was.
        expect(half.rest).toBe(rest);
        return half.date;
      });
      const expected = reference.map(({ key, text }) => ({ key, text: expectedDate(subject, text, locale) }));
      expect(plainAll(shown)).toEqual(plainAll(expected));
    });
  });

  describe.each(TIME_SUBJECTS)("the time in $name", (subject) => {
    it.each(times)("shows TimeField's segments at every keystroke of %s", (script) => {
      const reference = runTimeField(locale, script);
      const shown = subject.type(locale, reference);
      expect(plainAll(shown)).toEqual(plainAll(reference.map(({ key, text }) => ({ key, text }))));
    });

    it.each(stepTimes.map((value) => value.toString()))("steps each segment of %s to the text TimeField steps it to", (iso) => {
      const value = LocalTime.parse(iso);
      const reference = stepTimeField(locale, value);
      const shown = subject.step(locale, value);
      expect(plainAll(shown)).toEqual(plainAll(reference));
    });
  });
});
