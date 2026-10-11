import { Monitor, Moon, Sun } from "@vipengele/react-icons";
import { type ColorModePreference, useColorMode } from "@vipengele/react-tokens";
import { SegmentedControl, type SegmentedControlOption, type SegmentedControlProps } from "../SegmentedControl/SegmentedControl.js";

export interface ThemeToggleProps extends Omit<SegmentedControlProps, "options" | "value" | "defaultValue" | "onChange"> {
  /** Each segment's accessible name, per preference. Defaults to `"Light"`, `"Dark"` and
   * `"System"`. */
  labels?: Partial<Record<ColorModePreference, string>>;
}

/**
 * A light / dark / system switch for the nearest `ThemeProvider`. It is a `SegmentedControl` of
 * three icon segments over `useColorMode()`: the selected segment is the provider's preference
 * (`colorMode`), never the mode it resolves to, so `"system"` stays selected whichever mode the
 * page paints in, and choosing a segment calls `setColorMode`. Outside a `ThemeProvider`,
 * `useColorMode()` throws, because there is no preference to show or set.
 *
 * The group is named `"Color mode"` unless `aria-label` or `aria-labelledby` is passed.
 *
 * The three radios share `name`, which is also the field an enclosing form submits with the
 * selected preference (`"light"`, `"dark"` or `"system"`). `name` is forwarded to
 * `SegmentedControl` unchanged: omitted, it is that control's `useId`-generated name, so the
 * preference still travels with a submission but under a key no caller can predict. Pass `name`
 * to read it from the form data.
 */
export function ThemeToggle({ labels, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledBy, ...rest }: ThemeToggleProps) {
  const { colorMode, setColorMode } = useColorMode();

  const options: SegmentedControlOption[] = [
    { value: "light", icon: Sun, "aria-label": labels?.light ?? "Light" },
    { value: "dark", icon: Moon, "aria-label": labels?.dark ?? "Dark" },
    { value: "system", icon: Monitor, "aria-label": labels?.system ?? "System" },
  ];

  return (
    <SegmentedControl
      {...rest}
      aria-label={ariaLabel ?? (ariaLabelledBy === undefined ? "Color mode" : undefined)}
      aria-labelledby={ariaLabelledBy}
      options={options}
      value={colorMode}
      // The only values the segments report are the three preferences listed above.
      onChange={(value) => setColorMode(value as ColorModePreference)}
    />
  );
}
