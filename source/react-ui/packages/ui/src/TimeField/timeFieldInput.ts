import type { SegmentKeyContext } from "./timeFieldKeys.js";
import {
  adjacentSegment,
  clearSegment,
  enterDigit,
  selectDayPeriod,
  type TimeDigitEntry,
  type TimeEditableSegment,
  type TimeFieldState,
  type TimeLayout,
} from "./timeSegments.js";

/**
 * What a native `beforeinput` asks of a segment: characters to type into it, emptying it, or
 * nothing at all. A virtual keyboard delivers its text this way, since its `keydown` carries no
 * usable `key`.
 */
export type SegmentInput = { readonly kind: "insert"; readonly text: string } | { readonly kind: "clear" } | { readonly kind: "ignore" };

const CLEAR: SegmentInput = { kind: "clear" };
const IGNORE: SegmentInput = { kind: "ignore" };

/** Input types that delete, which empty the segment as Backspace and Delete do. */
const DELETIONS = new Set(["deleteContentBackward", "deleteContentForward"]);

/** Input types whose `data` is the text that replaces the selection. */
const REPLACEMENTS = new Set(["insertText", "insertReplacementText"]);

function insertion(text: string): SegmentInput {
  return text === "" ? IGNORE : { kind: "insert", text };
}

/**
 * The part of a composition's `data` not yet typed. A composition reports its whole text so far on
 * every update, so only what it appended to `composed` is new; an update that rewrites or shortens
 * the composition types nothing.
 */
function appended(composed: string, data: string): string {
  return data.startsWith(composed) ? data.slice(composed.length) : "";
}

/**
 * Translates a `beforeinput` into a segment edit. `composed` is the text the composition in
 * progress, if any, has already typed. Every other input type — paste, drop, formatting, undo, a
 * line break — is ignored.
 */
export function segmentInput(inputType: string, data: string | null, composed: string): SegmentInput {
  if (DELETIONS.has(inputType)) return CLEAR;
  if (inputType === "insertCompositionText") return insertion(appended(composed, data ?? ""));
  return REPLACEMENTS.has(inputType) ? insertion(data ?? "") : IGNORE;
}

/**
 * Translates every `beforeinput` on `element` into `onInput` and prevents its default, so the
 * browser never edits the segment's text: React renders it. A composition's updates cannot be
 * prevented, so once one has edited the text anyway, `input` puts back the `text()` React last
 * rendered. Returns the function that stops listening.
 */
export function listenForSegmentInput(element: HTMLElement, onInput: (input: SegmentInput) => void, text: () => string): () => void {
  let composed = "";
  const beforeInput = (event: InputEvent) => {
    event.preventDefault();
    const input = segmentInput(event.inputType, event.data, composed);
    if (event.inputType === "insertCompositionText") {
      composed = event.data ?? "";
    }
    onInput(input);
  };
  const resetComposition = () => {
    composed = "";
  };
  const restore = () => {
    element.textContent = text();
  };
  element.addEventListener("beforeinput", beforeInput);
  element.addEventListener("compositionstart", resetComposition);
  element.addEventListener("compositionend", resetComposition);
  element.addEventListener("input", restore);
  return () => {
    element.removeEventListener("beforeinput", beforeInput);
    element.removeEventListener("compositionstart", resetComposition);
    element.removeEventListener("compositionend", resetComposition);
    element.removeEventListener("input", restore);
  };
}

/** Types one character into `segment`: a digit into a numeric one, a letter picking AM or PM. */
function typeCharacter(
  layout: TimeLayout,
  state: TimeFieldState,
  segment: TimeEditableSegment,
  character: string,
): TimeDigitEntry | undefined {
  if (segment !== "dayPeriod") {
    return enterDigit(layout, state, segment, character);
  }
  const next = selectDayPeriod(layout, state, character);
  return next === undefined ? undefined : { state: next, advance: true };
}

/** Where a run of typed characters leaves the field: its state, the segment entry continues in, and
 * whether the run filled the last segment. */
export interface TypedRun {
  readonly state: TimeFieldState;
  readonly segment: TimeEditableSegment;
  readonly complete: boolean;
}

/**
 * Types `text` into the field from `segment` on, a character at a time, as if each were a key
 * pressed in whichever segment holds focus by then: a full segment moves entry on to the next, and
 * filling the last one ends the run. A character the segment does not take is skipped. Returns
 * `undefined` when no character was taken.
 */
export function typeCharacters(
  layout: TimeLayout,
  state: TimeFieldState,
  segment: TimeEditableSegment,
  text: string,
): TypedRun | undefined {
  let run: TypedRun = { state, segment, complete: false };
  let typed = false;
  for (const character of text) {
    const entry = typeCharacter(layout, run.state, run.segment, character);
    if (entry === undefined) continue;
    typed = true;
    const following = entry.advance ? adjacentSegment(layout, run.segment, 1) : run.segment;
    if (following === undefined) {
      return { state: entry.state, segment: run.segment, complete: true };
    }
    run = { state: entry.state, segment: following, complete: false };
  }
  return typed ? run : undefined;
}

/** Applies a translated `beforeinput` to `segment`, through the same transitions as its keys. */
export function applySegmentInput(context: SegmentKeyContext, segment: TimeEditableSegment, input: SegmentInput): void {
  if (input.kind === "clear") {
    context.setState(clearSegment(context.state, segment));
  } else if (input.kind === "insert") {
    applyTypedRun(context, segment, typeCharacters(context.layout, context.state, segment, input.text));
  }
}

function applyTypedRun(context: SegmentKeyContext, segment: TimeEditableSegment, run: TypedRun | undefined): void {
  if (run === undefined) return;
  if (run.complete) {
    context.completeSegment(run.segment, run.state);
    return;
  }
  // Focus moves first: leaving a segment ends the entry in progress, and the run may have started
  // one in the segment it moves to, which the state set after it keeps.
  if (run.segment !== segment) {
    context.focusSegment(run.segment);
  }
  context.setState(run.state);
}

/** The first empty segment in logical order, else the first segment: where a press on the field
 * outside every segment sends focus. */
export function firstEmptySegment(layout: TimeLayout, state: TimeFieldState): TimeEditableSegment {
  return layout.editable.find((segment) => state[segment] === undefined) ?? (layout.editable[0] as TimeEditableSegment);
}

/** What takes a press itself: a segment, and either adornment slot. */
const PRESS_OWNERS = [".vpg-time-field-segment", ".vpg-field-shell-leading", ".vpg-field-shell-trailing"].join(", ");

/**
 * Whether a press at `target` lands on the field's own area — the group, a literal between two
 * segments, the shell's padding — rather than on a segment, which takes focus itself, or inside an
 * adornment, which is the caller's.
 */
export function pressesControlArea(target: EventTarget): boolean {
  return (target as Element).closest(PRESS_OWNERS) === null;
}
