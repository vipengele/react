import { type ChangeEvent, type InputHTMLAttributes, type ReactNode, type Ref, useCallback, useRef, useState } from "react";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { assignRef } from "../internal/assignRef.js";
import { ClearButton } from "../internal/ClearButton.js";
import { textFieldStylesheet } from "./TextField.stylesheet.js";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** A ref to the native `<input>`. `InputHTMLAttributes` carries no `ref`, so the prop is declared
   * here. */
  ref?: Ref<HTMLInputElement>;
  /** The native input `type` — `"text"`, `"email"`, `"password"`, etc. Defaults to `"text"`. */
  type?: string;
  /** An adornment rendered before the input, inside the field's border — an icon, a prefix, a
   * currency symbol. Passed straight to `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the input, inside the field's border — a unit, a spinner, an
   * interactive button. Passed straight to `FieldShell`'s slot of the same name. */
  trailing?: ReactNode;
  /** Shows a button after the `trailing` adornment that empties the input, while the input holds
   * text and is neither disabled nor read-only. Clearing reaches `onChange` as an ordinary change
   * to `""` and returns focus to the input. Defaults to `false`. */
  clearable?: boolean;
  /** The clear button's accessible name. Defaults to `"Clear"`. */
  clearLabel?: string;
}

/**
 * A native `<input>` for free-text entry, wrapped in the `FieldShell` that draws the field's
 * chrome. No custom keyboard handling: the native element handles focus, typing and form
 * participation, and the shell reads focus, `aria-invalid` and disabledness off it, so a text
 * field and any other shell-composing control read as the same kind of control side by side in a
 * form.
 *
 * The one thing it tracks is whether the input holds text, which decides whether a `clearable`
 * field shows its clear button: a controlled field reads it off `value` on every render, and an
 * uncontrolled one keeps it in state from `defaultValue` and each change. The value itself stays
 * the input's or the caller's; clearing goes through the input exactly as typing does.
 *
 * `.vpg-text-field`, the caller's `className` and the prop spread all land on the `<input>`.
 * The border, background and states belong to the shell, so a `className` passed here cannot
 * restyle them — that is a rule on `.vpg-field-shell` (ADR-0011).
 */
export function TextField({
  className,
  type = "text",
  leading,
  trailing,
  clearable = false,
  clearLabel = "Clear",
  ref,
  onChange,
  ...rest
}: TextFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uncontrolledText, setUncontrolledText] = useState(() => String(rest.value ?? rest.defaultValue ?? ""));
  const text = rest.value === undefined ? uncontrolledText : String(rest.value);

  const setInput = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      assignRef(ref, node);
    },
    [ref],
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUncontrolledText(event.target.value);
    onChange?.(event);
  };

  const clear = () => {
    const input = inputRef.current;
    if (!input) {
      return;
    }
    // React keeps its own record of an input's value on the element and fires `onChange` only when
    // the DOM value differs from it. Writing through the prototype's setter leaves that record
    // holding the old text, so the `input` event that follows reads as a real change. The setter is
    // read off the element's own prototype at call time: the module touches no DOM global on
    // import, and an element from another window still resolves its own window's setter.
    const setValue = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
    if (setValue) {
      setValue.call(input, "");
    } else {
      input.value = "";
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  };

  const showClear = clearable && text !== "" && !rest.disabled && !rest.readOnly;
  // The clear button goes last so it stays against the field's trailing edge whatever the caller
  // put beside it.
  const trailingContent = showClear ? (
    <>
      {trailing}
      <ClearButton label={clearLabel} onClear={clear} />
    </>
  ) : (
    trailing
  );

  const classes = ["vpg-text-field", "vpg-field-shell-control", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N text fields on a page inject one
        stylesheet.
      */}
      <style href="vpg-text-field" precedence="vpg-text-field">
        {textFieldStylesheet}
      </style>
      <FieldShell leading={leading} trailing={trailingContent}>
        <input type={type} {...rest} ref={setInput} onChange={handleChange} className={classes} />
      </FieldShell>
    </>
  );
}
