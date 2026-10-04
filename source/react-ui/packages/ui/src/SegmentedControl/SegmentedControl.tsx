import type { IconComponent } from "@vipengele/react-icons";
import { type HTMLAttributes, type ReactNode, type Ref, useId, useState } from "react";
import { segmentedControlStylesheet } from "./SegmentedControl.stylesheet.js";

/** Shared with `Button`'s size scale, so a segmented control sits flush beside a button. */
export type SegmentedControlSize = "sm" | "md" | "lg";

/**
 * The segment's accessible name. A string label names the radio by itself; any other label — an
 * element, a fragment, an icon alone — carries no text the radio can be relied on to announce, so
 * the caller must name it with `aria-label`.
 */
type SegmentedControlOptionLabel =
  | {
      label: string;
      /** The segment's accessible name. Defaults to `label`. */
      "aria-label"?: string;
    }
  | {
      label?: ReactNode;
      /** The segment's accessible name. Required when `label` is not a string. */
      "aria-label": string;
    };

export type SegmentedControlOption = SegmentedControlOptionLabel & {
  /** The value `onChange` reports and the radio submits. Unique within one control. */
  value: string;
  /** Rendered before the label. Pass the component itself — `icon: Grid` — so a bundler only
   * ever sees the icons actually referenced. */
  icon?: IconComponent;
  /** Takes the segment out of selection and out of the arrow-key cycle. */
  disabled?: boolean;
};

export interface SegmentedControlProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "children" | "defaultValue"> {
  /** The segments, in order. */
  options: readonly SegmentedControlOption[];
  /** Makes the selection controlled; pair it with `onChange`. */
  value?: string;
  /** The initially selected value when the selection is uncontrolled. */
  defaultValue?: string;
  /** Called with the newly selected segment's value. */
  onChange?: (value: string) => void;
  /** The `name` every segment's radio shares, which is also the field a form submits. Generated
   * via `useId` when omitted, so the radios group natively without the caller naming anything. */
  name?: string;
  size?: SegmentedControlSize;
  /** Fills the container's width, with every segment taking an equal share of it. */
  fullWidth?: boolean;
  /** A ref to `.vpg-segmented-control`, the `role="radiogroup"` track. `HTMLAttributes` carries
   * no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLDivElement>;
}

/**
 * A row of mutually exclusive segments. Each segment is a `<label>` wrapping a visually hidden
 * native `<input type="radio">`, and the row is a `role="radiogroup"`, so focus, arrow-key
 * movement, form submission and the selected state are all the browser's own; the component
 * writes no keyboard code. Name the group with `aria-label` or `aria-labelledby`.
 *
 * The selection is controlled through `value`/`onChange` or held by the control itself, seeded
 * by `defaultValue` — the same duality as `RadioGroup` and `Tabs`.
 */
export function SegmentedControl({
  options,
  value,
  defaultValue,
  onChange,
  name,
  size = "md",
  fullWidth = false,
  className,
  ref,
  ...rest
}: SegmentedControlProps) {
  const generatedName = useId();
  const resolvedName = name ?? generatedName;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const controlled = value !== undefined;
  const selectedValue = controlled ? value : uncontrolledValue;

  function select(next: string) {
    if (!controlled) {
      setUncontrolledValue(next);
    }
    onChange?.(next);
  }

  const classes = [
    "vpg-segmented-control",
    `vpg-segmented-control-${size}`,
    fullWidth ? "vpg-segmented-control-full" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N segmented controls on a page
        inject one stylesheet.
      */}
      <style href="vpg-segmented-control" precedence="vpg-segmented-control">
        {segmentedControlStylesheet}
      </style>
      <div {...rest} ref={ref} role="radiogroup" className={classes}>
        {options.map((option) => {
          const SegmentIcon = option.icon;
          return (
            <label key={option.value} className="vpg-segmented-control-segment">
              <input
                type="radio"
                name={resolvedName}
                value={option.value}
                checked={selectedValue === option.value}
                disabled={option.disabled}
                aria-label={option["aria-label"]}
                onChange={() => select(option.value)}
              />
              {SegmentIcon ? <SegmentIcon className="vpg-segmented-control-segment-icon" aria-hidden="true" /> : null}
              {option.label}
            </label>
          );
        })}
      </div>
    </>
  );
}
