import type { InputHTMLAttributes, ReactNode } from "react";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { textFieldStylesheet } from "./TextField.stylesheet.js";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** The native input `type` — `"text"`, `"email"`, `"password"`, etc. Defaults to `"text"`. */
  type?: string;
  /** An adornment rendered before the input, inside the field's border — an icon, a prefix, a
   * currency symbol. Passed straight to `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the input, inside the field's border — a unit, a spinner, an
   * interactive button. Passed straight to `FieldShell`'s slot of the same name. */
  trailing?: ReactNode;
}

/**
 * A native `<input>` for free-text entry, wrapped in the `FieldShell` that draws the field's
 * chrome. No custom keyboard handling: the native element handles focus, typing and form
 * participation, and the shell reads focus, `aria-invalid` and disabledness off it, so a text
 * field and any other shell-composing control read as the same kind of control side by side in a
 * form.
 *
 * `.vpg-text-field`, the caller's `className` and the prop spread all land on the `<input>`.
 * The border, background and states belong to the shell, so a `className` passed here cannot
 * restyle them — that is a rule on `.vpg-field-shell` (ADR-0011).
 */
export function TextField({ className, type = "text", leading, trailing, ...rest }: TextFieldProps) {
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
      <FieldShell leading={leading} trailing={trailing}>
        <input type={type} {...rest} className={classes} />
      </FieldShell>
    </>
  );
}
