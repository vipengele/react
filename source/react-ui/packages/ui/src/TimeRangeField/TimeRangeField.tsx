import type { Locale, LocalTime } from "@vipengele/ts";
import {
  type FocusEvent,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
  useId,
  useRef,
  useState,
} from "react";
import { FieldShell } from "../FieldShell/FieldShell.js";
import type { TimeRange } from "../internal/localRange.js";
import { timeFieldStylesheet } from "../TimeField/TimeField.stylesheet.js";
import { TimeFieldSegment } from "../TimeField/TimeFieldSegment.js";
import type { TimeFieldEdge } from "../TimeField/timeFieldKeys.js";
import { displaySegments, type TimeBounds } from "../TimeField/timeSegments.js";
import { type TimeFieldModel, useTimeField } from "../TimeField/useTimeField.js";
import { timeRangeFieldStylesheet } from "./TimeRangeField.stylesheet.js";
import {
  decideTimeRange,
  invalidEnds,
  isReversed,
  rangeKey,
  readEditor,
  type TimeRangeEnd,
  type TimeRangeIssue,
} from "./timeRangeFieldModel.js";

export interface TimeRangeFieldProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "role" | "children" | "name"> {
  /** A ref to the outer `role="group"` element holding the two editors — the element `FormField`
   * labels. The hidden inputs that carry the form values are not reachable through it.
   * `HTMLAttributes` carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLDivElement>;
  /** The locale the segments are ordered, labelled and clocked in: it decides 12- or 24-hour and
   * where the AM/PM segment sits. Defaults to the nearest `LocaleProvider`'s, then the runtime's
   * own. */
  locale?: Locale;
  /** The controlled range. Passing the prop at all makes the field controlled, so
   * `value={undefined}` is a controlled, empty field. While focus is in the field an update to it
   * does not reach the editors: the edit in progress wins until the user commits. */
  value?: TimeRange;
  /** The initial range of an uncontrolled field. */
  defaultValue?: TimeRange;
  /** Called on **commit** only — an editor losing focus, Enter, or an editor's last segment being
   * filled — and only when both editors hold accepted times with the start not after the end, or
   * when both are empty, for `undefined`. One empty editor, a partly filled editor, a time outside
   * `min` and `max`, or an end before the start reports nothing and stays on screen, flagged through
   * `aria-invalid`. A range never runs past midnight. */
  onChange?: (range: TimeRange | undefined) => void;
  /** Shows a `second` segment in both editors. Without it a value with non-zero seconds shows its
   * hour and minute, keeps its seconds while the user leaves that end alone, and commits it with
   * zero seconds once edited. */
  seconds?: boolean;
  /** The earliest time either end accepts, inclusive. An arrow step of a filled editor that would
   * go before it does nothing, and a filled time before it is rejected: the segments keep it, the
   * editor is `aria-invalid`, and `onChange` is not called. A `min` after `max` is unsupported. */
  min?: LocalTime;
  /** The latest time either end accepts, inclusive, enforced as `min` is. */
  max?: LocalTime;
  /** Takes every segment out of the tab order, ignores input, and leaves the field out of a
   * submitted form. */
  disabled?: boolean;
  /** The form field name of a hidden input carrying the committed start as an ISO 8601 time.
   * Absent, no input is rendered for the start. */
  startName?: string;
  /** The form field name of a hidden input carrying the committed end as an ISO 8601 time. Absent,
   * no input is rendered for the end. */
  endName?: string;
  /** The start editor's own name, read after the field's label. Defaults to `"Start"`. */
  startLabel?: string;
  /** The end editor's own name, read after the field's label. Defaults to `"End"`. */
  endLabel?: string;
  /** An adornment rendered before the editors, inside the field's border. Passed straight to
   * `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the editors, inside the field's border. Passed straight to
   * `FieldShell`'s slot of the same name. */
  trailing?: ReactNode;
}

type Ends = Readonly<Record<TimeRangeEnd, LocalTime | undefined>>;

function endsOf(range: TimeRange | undefined): Ends {
  return { start: range?.start, end: range?.end };
}

/** Focuses the first or the last segment of an editor. */
function focusEdgeSegment(editor: RefObject<HTMLDivElement | null>, edge: "first" | "last"): void {
  const segments = (editor.current as HTMLDivElement).querySelectorAll<HTMLElement>(".vpg-time-field-segment");
  (segments[edge === "first" ? 0 : segments.length - 1] as HTMLElement).focus();
}

/**
 * A field for a range of times: a start editor and an end editor, each `TimeField`'s segmented
 * `role="group"` of `role="spinbutton"` segments, inside one outer `role="group"` that is the
 * `FieldShell`'s marked control (ADR-0052).
 *
 * Each editor runs `TimeField`'s own segment machine and commits its own time by `TimeField`'s
 * rules — losing focus, Enter, or its last segment filled. The two times then decide together: two
 * accepted times with the start not after the end commit the range, two empty editors commit
 * `undefined`, and anything else commits nothing. An end before the start flags both editors through
 * `aria-invalid` at once; the ends are never swapped, and a range never wraps past midnight. One
 * empty editor is incomplete, flagged once focus has left the field. The segments stay as the user
 * left them and the committed range stands until the pair commits.
 *
 * The left and right arrows move between segments across both editors: past the start's last
 * segment onto the end's first, and back. Filling the start's last segment moves entry on to the
 * end's first. Tab visits every segment in logical order.
 *
 * The outer group takes the field's label — `aria-label`, `aria-labelledby`, or `FormField`'s, which
 * is cloned onto it with the rest of its attributes. Each editor is named by `aria-labelledby` as
 * that label followed by its own "Start" or "End" (`startLabel`, `endLabel`), so two range fields on
 * one page read apart.
 *
 * The editors carry no `name`. `startName` and `endName` each render a hidden input submitting that
 * end of the committed range as an ISO 8601 time; the field has no `name` of its own. `ref`,
 * `className` and every other native attribute land on the outer group.
 */
export function TimeRangeField(props: TimeRangeFieldProps) {
  const {
    locale,
    value,
    defaultValue,
    onChange,
    seconds = false,
    min,
    max,
    disabled,
    startName,
    endName,
    startLabel = "Start",
    endLabel = "End",
    leading,
    trailing,
    className,
    id,
    ref,
    onFocus,
    onBlur,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-invalid": ariaInvalid,
    ...rest
  } = props;

  // A controlled field is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled field spells "empty".
  const isControlled = "value" in props;
  const [uncontrolledValue, setUncontrolledValue] = useState<TimeRange | undefined>(defaultValue);
  const committed = isControlled ? value : uncontrolledValue;
  const committedKey = rangeKey(committed);
  const bounds: TimeBounds = { min, max };

  const generatedId = useId();
  const groupId = id ?? generatedId;
  const startLabelId = `${generatedId}-start`;
  const endLabelId = `${generatedId}-end`;
  const editorRefs: Record<TimeRangeEnd, RefObject<HTMLDivElement | null>> = {
    start: useRef<HTMLDivElement>(null),
    end: useRef<HTMLDivElement>(null),
  };

  // The time each editor last committed on its own. The editors show these, so an end the pair has
  // not committed — one half of an incomplete range, the two ends of a reversed one — stays on
  // screen.
  const [ends, setEnds] = useState<Ends>(() => endsOf(committed));
  // The committed range the editors were last seeded from, as its key.
  const [seed, setSeed] = useState(committedKey);
  // What the last decision found when it committed nothing.
  const [issue, setIssue] = useState<TimeRangeIssue | undefined>(undefined);
  // Whether focus is anywhere inside the field.
  const [focused, setFocused] = useState(false);

  // The editors follow the committed range, except while focus is inside the field: a controlled
  // update that lands mid-edit waits until focus leaves, so it never replaces what the user is
  // entering. A parent that declines a commit has its own range put back the same way.
  if (!focused && seed !== committedKey) {
    setSeed(committedKey);
    setEnds(endsOf(committed));
    setIssue(undefined);
  }

  // One editor has committed `time`; the other is read as it stands, so a partly filled or
  // out-of-bounds editor holds the pair back even though its last committed time is still in `ends`.
  const decide = (which: TimeRangeEnd, time: LocalTime | undefined) => {
    setEnds({ ...ends, [which]: time });
    const other: TimeRangeEnd = which === "start" ? "end" : "start";
    const otherField = which === "start" ? endField : startField;
    const otherReading = readEditor(otherField.layout, otherField.fieldState, bounds, ends[other]);
    const decision = which === "start" ? decideTimeRange(time, otherReading) : decideTimeRange(otherReading, time);
    if (decision.status === "incomplete" || decision.status === "rejected") {
      setIssue(decision);
      return;
    }
    setIssue(undefined);
    const range = decision.status === "committed" ? decision.range : undefined;
    if (rangeKey(range) !== committedKey) {
      setUncontrolledValue(range);
      setSeed(rangeKey(range));
      onChange?.(range);
    }
  };

  // Entry crosses between the editors at the boundary they share; the field's outer edges lead
  // nowhere.
  const exitPast = (which: TimeRangeEnd) => (edge: TimeFieldEdge) => {
    if (which === "start" && edge === "end") {
      focusEdgeSegment(editorRefs.end, "first");
    } else if (which === "end" && edge === "start") {
      focusEdgeSegment(editorRefs.start, "last");
    }
  };

  const editorOptions = (which: TimeRangeEnd) => ({
    controlled: true,
    value: ends[which],
    defaultValue: undefined,
    onChange: (time: LocalTime | undefined) => decide(which, time),
    locale,
    seconds,
    min,
    max,
    disabled,
    onFocus: undefined,
    onBlur: undefined,
    onExitPast: exitPast(which),
  });
  const startField = useTimeField(editorOptions("start"));
  const endField = useTimeField(editorOptions("end"));
  const fields: Record<TimeRangeEnd, TimeFieldModel> = { start: startField, end: endField };

  const handleFocus = (event: FocusEvent<HTMLDivElement>) => {
    setFocused(true);
    onFocus?.(event);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
    onBlur?.(event);
  };

  // A press on the field outside every segment lands in the editor it falls in; one on the shell's
  // padding or between the editors lands in the start.
  const handleShellClick = (event: MouseEvent<HTMLElement>) => {
    const inEnd = (editorRefs.end.current as HTMLDivElement).contains(event.target as Node);
    (inEnd ? endField : startField).onShellClick(event);
  };

  const flagged = invalidEnds(issue, !focused);
  const reversed = isReversed(committed);
  const invalidOf = (which: TimeRangeEnd) => {
    const field = fields[which];
    return flagged[which] || reversed || field.incomplete || field.rejected || field.committedRejected;
  };
  const invalid: Record<TimeRangeEnd, boolean> = { start: invalidOf("start"), end: invalidOf("end") };

  // The outer group's own label: the ids it is labelled by, else the group itself when it carries
  // an `aria-label`. Referencing a group that is labelled by other elements would name it from its
  // content instead, the segments' text included.
  const groupLabel = ariaLabelledBy ?? (ariaLabel === undefined ? undefined : groupId);
  const labelledBy = (own: string) => (groupLabel === undefined ? own : `${groupLabel} ${own}`);

  const editor = (which: TimeRangeEnd, labelId: string) => {
    const field = fields[which];
    // At most one literal sits between two editable segments, so the segment before it names it.
    let previous = "start";
    return (
      // biome-ignore lint/a11y/useSemanticElements: a <fieldset> carries its own border, padding and min-content width inside the shell; a composite control is a plain role="group"
      <div
        ref={editorRefs[which]}
        role="group"
        className="vpg-time-range-field-editor"
        data-end={which}
        aria-labelledby={labelledBy(labelId)}
        aria-invalid={invalid[which] || undefined}
        aria-disabled={disabled}
        onFocus={field.onFocus}
        onBlur={field.onBlur}
      >
        {displaySegments(field.layout, field.fieldState).map((part) => {
          if (part.type === "literal") {
            return (
              <span key={`after-${previous}`} className="vpg-time-field-literal" aria-hidden="true">
                {part.text}
              </span>
            );
          }
          previous = part.type;
          return (
            <TimeFieldSegment
              key={part.type}
              part={part}
              disabled={disabled}
              editable={field.editable}
              last={which === "end" && part.type === field.layout.editable.at(-1)}
              onKeyDown={field.segmentKeyDown(part.type)}
              onInput={field.segmentInput(part.type)}
              segmentRef={field.segmentRef(part.type)}
            />
          );
        })}
      </div>
    );
  };

  const classes = ["vpg-time-range-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates these by `href`, so N time fields on a page inject each
        stylesheet once. The segments are `TimeField`'s and take its stylesheet.
      */}
      <style href="vpg-time-field" precedence="vpg-time-field">
        {timeFieldStylesheet}
      </style>
      <style href="vpg-time-range-field" precedence="vpg-time-range-field">
        {timeRangeFieldStylesheet}
      </style>
      {/*
        A touch or a pen pressing the field makes both editors' segments editable, so the segment
        that takes focus raises a virtual keyboard. A press on the field's own area focuses a
        segment, so tapping anywhere on the control does. The adornment slots are the caller's and
        are left alone.
      */}
      <FieldShell
        leading={leading}
        trailing={trailing}
        onPointerDown={(event) => {
          startField.onShellPointerDown(event);
          endField.onShellPointerDown(event);
        }}
        onMouseDown={startField.onShellMouseDown}
        onClick={handleShellClick}
      >
        {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> carries its own border, padding and min-content width inside the shell; a composite control is a plain role="group" */}
        <div
          {...rest}
          ref={ref}
          id={groupId}
          role="group"
          className={classes}
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          aria-invalid={invalid.start || invalid.end || ariaInvalid || undefined}
          aria-disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {/* Each editor's own name, read after the group's. Hidden, it still names what references it. */}
          <span id={startLabelId} hidden>
            {startLabel}
          </span>
          <span id={endLabelId} hidden>
            {endLabel}
          </span>
          {editor("start", startLabelId)}
          <span className="vpg-time-range-field-separator" aria-hidden="true">
            –
          </span>
          {editor("end", endLabelId)}
        </div>
        {/*
          The form values as ISO 8601 times, one input per named end. The segments carry no `name`,
          because what they show is the locale's formatting, and no server should have to parse
          that. Mirroring `disabled` keeps a disabled field out of the submission, as a disabled
          native control is.
        */}
        {startName === undefined ? null : (
          <input type="hidden" name={startName} disabled={disabled} value={committed?.start.toString() ?? ""} />
        )}
        {endName === undefined ? null : <input type="hidden" name={endName} disabled={disabled} value={committed?.end.toString() ?? ""} />}
      </FieldShell>
    </>
  );
}
