import { useLocale } from "@vipengele/react-tokens";
import type { Locale, LocalTime } from "@vipengele/ts";
import { type ComponentPropsWithRef, type FocusEvent, type KeyboardEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { timePanelStylesheet } from "./TimePanel.stylesheet.js";
import {
  pickTimeOption,
  type TimeStrip,
  type TimeStripKind,
  type TimeStripOption,
  timePanelLayout,
  timePanelStrips,
} from "./timePanelModel.js";

export interface TimePanelProps extends Omit<ComponentPropsWithRef<"div">, "children" | "defaultValue" | "onChange"> {
  /** The controlled time. Passing the prop at all makes the panel controlled, so
   * `value={undefined}` is a controlled panel with no option selected. Seconds are not shown. */
  value?: LocalTime;
  /** The initial time of an uncontrolled panel. Absent, no option is selected. */
  defaultValue?: LocalTime;
  /** Called with the time a pick commits, always with zero seconds. */
  onChange?: (value: LocalTime) => void;
  /** The locale that decides between a 12-hour clock with an AM/PM strip and a 24-hour one, and
   * names AM and PM. Defaults to the nearest `LocaleProvider`'s, then the runtime's own. */
  locale?: Locale;
  /** The minutes between two adjacent minute options, a positive integer. Defaults to `5`. A
   * value whose minute is off that grid adds its minute to the strip, in order. */
  minuteStep?: number;
  /** Reports a time that cannot be picked. An option no allowed time uses, with the other strips
   * held at their selections, is `aria-disabled` and stays focusable. The options are recomputed
   * whenever the function's identity changes, and an empty panel scans every combination of its
   * strips, so pass a stable function (module-level or memoised) rather than an inline arrow. */
  isTimeDisabled?: (time: LocalTime) => boolean;
  /** Marks every option `aria-disabled`, takes the panel out of the tab order and ignores picks. */
  disabled?: boolean;
  /** The hour strip's accessible name. Defaults to `"Hour"`. */
  hourLabel?: string;
  /** The minute strip's accessible name. Defaults to `"Minute"`. */
  minuteLabel?: string;
  /** The AM/PM strip's accessible name. Defaults to `"AM/PM"`. */
  dayPeriodLabel?: string;
}

/** One option of one strip. */
interface OptionKey {
  readonly kind: TimeStripKind;
  readonly value: number;
}

const keyOf = ({ kind, value }: OptionKey) => `${kind}:${value}`;

/** The option a strip is entered on: its selected option, else its first. */
function entryOption(strip: TimeStrip): OptionKey {
  const option = strip.options.find((candidate) => candidate.selected) ?? (strip.options[0] as TimeStripOption);
  return { kind: strip.kind, value: option.value };
}

function hasOption(strips: readonly TimeStrip[], key: OptionKey): boolean {
  return strips.some((strip) => strip.kind === key.kind && strip.options.some((option) => option.value === key.value));
}

/**
 * The panel's one tab stop: the option holding focus while focus is on the panel, else the entry
 * option of the strip focused last, else the first strip's.
 */
function tabStopOf(strips: readonly TimeStrip[], focused: OptionKey | undefined, lastStrip: TimeStripKind | undefined): OptionKey {
  if (focused !== undefined && hasOption(strips, focused)) return focused;
  const strip = strips.find((candidate) => candidate.kind === lastStrip) ?? (strips[0] as TimeStrip);
  return entryOption(strip);
}

/**
 * The option a key moves to from the option at `optionIndex` of the strip at `stripIndex`, or
 * `undefined` for a key the panel does not move on. Left and Right step within the strip, Home and
 * End jump to its ends, and Up and Down move to the adjacent strip's entry option. A move past an
 * end stays where it is.
 */
function keyTarget(key: string, strips: readonly TimeStrip[], stripIndex: number, optionIndex: number): OptionKey | undefined {
  const strip = strips[stripIndex] as TimeStrip;
  const at = (index: number): OptionKey => ({
    kind: strip.kind,
    value: (strip.options[Math.min(Math.max(index, 0), strip.options.length - 1)] as TimeStripOption).value,
  });
  const across = (index: number): OptionKey => {
    const adjacent = strips[index];
    return adjacent === undefined ? at(optionIndex) : entryOption(adjacent);
  };
  switch (key) {
    case "ArrowLeft":
      return at(optionIndex - 1);
    case "ArrowRight":
      return at(optionIndex + 1);
    case "Home":
      return at(0);
    case "End":
      return at(strip.options.length - 1);
    case "ArrowUp":
      return across(stripIndex - 1);
    case "ArrowDown":
      return across(stripIndex + 1);
    default:
      return undefined;
  }
}

const SCROLL_NEAREST: ScrollIntoViewOptions = { block: "nearest", inline: "nearest" };

/**
 * Hour, minute and, on a 12-hour locale, AM/PM option strips for picking a time of day, in that
 * order. Hours run 12, 1 … 11 on a 12-hour clock and 0 … 23 otherwise; minutes run from 00 in
 * steps of `minuteStep`. Each strip is a `role="radiogroup"` named by its label prop, and each
 * option a `role="radio"` whose `aria-checked` marks the selected one.
 *
 * A pick changes its own strip only, and an hour pick never flips AM/PM. On a panel with no time
 * the first pick fills the other strips with their first option, which then show as selected. A
 * pick that lands on a time `isTimeDisabled` reports moves the other strips to the nearest allowed
 * time. An `aria-disabled` option stays focusable, and a pick of it commits nothing; so does a pick
 * of the time already selected.
 *
 * The panel is one tab stop with a roving tabindex and real DOM focus: the option focused last
 * while focus is on the panel, else the selected option of the strip focused last, else the first
 * strip's selected or first option. Left and Right move within a strip, Home and End to its ends,
 * Up and Down to the adjacent strip's selected option, and Enter and Space pick. The focused option
 * is scrolled into view in its strip, and so is every strip's selected option on mount and
 * whenever the time changes.
 *
 * The selection is controlled exactly when `value` is passed. `ref` and any other native attribute
 * land on the root `<div>`.
 */
export function TimePanel(props: TimePanelProps) {
  const {
    value,
    defaultValue,
    onChange,
    locale: localeProp,
    minuteStep = 5,
    isTimeDisabled,
    disabled = false,
    hourLabel = "Hour",
    minuteLabel = "Minute",
    dayPeriodLabel = "AM/PM",
    className,
    ...rest
  } = props;

  // A controlled panel is one that was *given* a `value`, which `value !== undefined` cannot
  // detect: `undefined` is also how a controlled panel spells "no time".
  const isControlled = "value" in props;
  const [uncontrolledValue, setUncontrolledValue] = useState<LocalTime | undefined>(defaultValue);
  const selected = isControlled ? value : uncontrolledValue;

  const locale = useLocale(localeProp);
  const layout = useMemo(() => timePanelLayout(locale), [locale]);
  const strips = useMemo(
    () => timePanelStrips(layout, selected, { minuteStep, isTimeDisabled }),
    [layout, selected, minuteStep, isTimeDisabled],
  );

  /** The option holding DOM focus, cleared when focus leaves the panel's options. */
  const [focused, setFocused] = useState<OptionKey | undefined>(undefined);
  /** The strip focused last, whose selected option is the tab stop once focus has left. */
  const [lastStrip, setLastStrip] = useState<TimeStripKind | undefined>(undefined);
  const optionsRef = useRef(new Map<string, HTMLElement>());
  const tabStop = keyOf(tabStopOf(strips, focused, lastStrip));

  // Every strip shows its selected option when the panel mounts and whenever the time changes,
  // whoever changed it; the strip is a scroll container that would otherwise start at its first
  // option.
  const selectedKeys = strips.flatMap((strip) =>
    strip.options.filter((option) => option.selected).map((option) => keyOf({ kind: strip.kind, value: option.value })),
  );
  const selectedKey = selectedKeys.join(" ");
  useLayoutEffect(() => {
    if (selectedKey === "") return;
    for (const key of selectedKey.split(" ")) (optionsRef.current.get(key) as HTMLElement).scrollIntoView(SCROLL_NEAREST);
  }, [selectedKey]);

  function pick(kind: TimeStripKind, option: TimeStripOption) {
    if (disabled || option.disabled) return;
    const next = pickTimeOption(layout, selected, kind, option.value, { minuteStep, isTimeDisabled });
    if (next === undefined || (selected !== undefined && next.equals(selected))) return;
    if (!isControlled) setUncontrolledValue(next);
    onChange?.(next);
  }

  function handleFocus(key: OptionKey, element: HTMLElement) {
    setFocused(key);
    setLastStrip(key.kind);
    element.scrollIntoView(SCROLL_NEAREST);
  }

  // Focus moving to another option sets `focused` again on that option's own focus event, so only
  // a blur to somewhere else clears it, and the tab stop falls back to the strip's selected option.
  function handleBlur(event: FocusEvent<HTMLElement>) {
    const next = event.relatedTarget;
    if (next instanceof HTMLElement && [...optionsRef.current.values()].includes(next)) return;
    setFocused(undefined);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>, stripIndex: number, optionIndex: number) {
    const strip = strips[stripIndex] as TimeStrip;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pick(strip.kind, strip.options[optionIndex] as TimeStripOption);
      return;
    }
    const target = keyTarget(event.key, strips, stripIndex, optionIndex);
    if (target === undefined) return;
    event.preventDefault();
    (optionsRef.current.get(keyOf(target)) as HTMLElement).focus();
  }

  const labels: Record<TimeStripKind, string> = { hour: hourLabel, minute: minuteLabel, dayPeriod: dayPeriodLabel };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N panels on a page inject one
        stylesheet.
      */}
      <style href="vpg-time-panel" precedence="vpg-time-panel">
        {timePanelStylesheet}
      </style>
      <div {...rest} className={["vpg-time-panel", className].filter(Boolean).join(" ")}>
        {strips.map((strip, stripIndex) => (
          <div
            key={strip.kind}
            role="radiogroup"
            aria-label={labels[strip.kind]}
            aria-disabled={disabled || undefined}
            className="vpg-time-panel-strip"
            // Chromium makes a scroll container with no tabbable descendant a tab stop of its
            // own, which every strip but the one holding the panel's tab stop is. An explicit
            // tabindex keeps the strips out of the tab order.
            tabIndex={-1}
          >
            {strip.options.map((option, optionIndex) => {
              const key = keyOf({ kind: strip.kind, value: option.value });
              return (
                // biome-ignore lint/a11y/useSemanticElements: native radios make each strip its own tab stop and pick on every arrow key, where the panel is one tab stop and only Enter, Space or a click picks
                <span
                  key={key}
                  ref={(node) => {
                    optionsRef.current.set(key, node as HTMLElement);
                    return () => {
                      optionsRef.current.delete(key);
                    };
                  }}
                  role="radio"
                  className="vpg-time-panel-option"
                  tabIndex={!disabled && key === tabStop ? 0 : -1}
                  aria-checked={option.selected}
                  aria-disabled={disabled || option.disabled || undefined}
                  onClick={() => pick(strip.kind, option)}
                  onFocus={(event) => handleFocus({ kind: strip.kind, value: option.value }, event.currentTarget)}
                  onBlur={handleBlur}
                  onKeyDown={(event) => handleKeyDown(event, stripIndex, optionIndex)}
                >
                  {option.label}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}
