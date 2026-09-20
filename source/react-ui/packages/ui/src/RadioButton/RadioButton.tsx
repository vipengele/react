import type { ChangeEvent, InputHTMLAttributes } from "react";
import { useRadioGroupContext } from "../RadioGroup/RadioGroup.js";
import { radioButtonStylesheet } from "./RadioButton.stylesheet.js";

export interface RadioButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value"> {
  /** This radio's own value. Compared against `RadioGroup`'s selected value when rendered inside
   * one; required for a `RadioGroup`-provided `checked`/`onChange` to do anything meaningful. */
  value?: string;
}

/**
 * A single styled native `<input type="radio">`. No custom keyboard or roving-tabindex code:
 * native radios sharing a `name` get browser-native grouping and arrow-key behavior for free.
 *
 * Usable standalone outside any `RadioGroup` — pass `name`/`checked`/`onChange` manually, the
 * same as a plain `<input type="radio">` — or nested inside one, where `name`, the selected
 * state, and the change handler come from context instead. An explicit `checked` prop always
 * wins over context, so a `RadioButton` inside a group can still be driven manually if a caller
 * needs that.
 */
export function RadioButton({ className, name, checked, onChange, value, ...rest }: RadioButtonProps) {
  const context = useRadioGroupContext();
  const manualChecked = checked !== undefined;

  const resolvedName = name ?? context?.name;
  const resolvedChecked = manualChecked ? checked : context ? value !== undefined && context.value === value : undefined;

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange?.(event);
    if (!manualChecked && context && value !== undefined) {
      context.onChange(value);
    }
  }

  const classes = ["tandiko-radio-button", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N radio buttons on a page inject
        one stylesheet.
      */}
      <style href="tandiko-radio-button" precedence="tandiko-radio-button">
        {radioButtonStylesheet}
      </style>
      <input
        {...rest}
        type="radio"
        name={resolvedName}
        value={value}
        checked={resolvedChecked}
        onChange={handleChange}
        className={classes}
      />
    </>
  );
}
