import { createContext, type HTMLAttributes, type ReactNode, useContext, useId, useMemo, useState } from "react";
import { radioGroupStylesheet } from "./RadioGroup.stylesheet.js";

export interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

/**
 * Read by `RadioButton` to pick up a shared `name`, the group's selected value, and a change
 * handler. Unlike `Tabs`' context, `useContext` returning `null` is a normal, supported outcome
 * here — `RadioButton` is usable standalone outside any `RadioGroup`, so nothing reading this
 * context throws when it is absent.
 */
export const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export function useRadioGroupContext(): RadioGroupContextValue | null {
  return useContext(RadioGroupContext);
}

export interface RadioGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Makes the selection controlled; pair it with `onChange`. */
  value?: string;
  /** The initially selected value when the selection is uncontrolled. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** The shared `name` every child `RadioButton` receives through context. Auto-generated via
   * `useId` when omitted, so native radio grouping works without the consumer naming anything. */
  name?: string;
  /**
   * The group's accessible name. Required for `role="radiogroup"` to have one: a `<legend>` on
   * an ancestor `FieldSet` names the `<fieldset>` itself, not a `role="radiogroup"` element
   * nested inside it.
   */
  "aria-label"?: string;
  children?: ReactNode;
}

/**
 * A compound context provider grouping `RadioButton`s: `role="radiogroup"` on its own wrapper,
 * controlled through `value`/`onChange` or left to `RadioGroup` itself, seeded by
 * `defaultValue` — the same controlled/uncontrolled duality as `Tabs`. Every child `RadioButton`
 * reads its `name`, `checked`, and `onChange` from context, so native radio grouping and
 * browser-native arrow-key behavior work without any hand-written keyboard code.
 */
export function RadioGroup({ value, defaultValue, onChange, name, className, children, ...rest }: RadioGroupProps) {
  const generatedName = useId();
  const resolvedName = name ?? generatedName;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const controlled = value !== undefined;
  const selectedValue = controlled ? value : uncontrolledValue;

  const classes = ["vpg-radio-group", className].filter(Boolean).join(" ");

  const context = useMemo<RadioGroupContextValue>(
    () => ({
      name: resolvedName,
      value: selectedValue,
      onChange(next: string) {
        if (!controlled) {
          setUncontrolledValue(next);
        }
        onChange?.(next);
      },
    }),
    [resolvedName, selectedValue, controlled, onChange],
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N radio groups on a page inject one
        stylesheet.
      */}
      <style href="vpg-radio-group" precedence="vpg-radio-group">
        {radioGroupStylesheet}
      </style>
      <RadioGroupContext.Provider value={context}>
        <div {...rest} role="radiogroup" className={classes}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    </>
  );
}
