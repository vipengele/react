import type { InputHTMLAttributes } from "react";
import { textFieldStylesheet } from "./TextField.stylesheet.js";

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** The native input `type` — `"text"`, `"email"`, `"password"`, etc. Defaults to `"text"`. */
  type?: string;
}

/**
 * A styled native `<input>` for free-text entry. No custom keyboard handling: the native
 * element handles focus, typing and form participation, and the `aria-invalid` styling hook
 * matches `Dropdown`'s so a text field and a dropdown trigger read as the same kind of control
 * when they sit side by side in a form.
 */
export function TextField({ className, type = "text", ...rest }: TextFieldProps) {
  const classes = ["tandiko-text-field", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N text fields on a page inject one
        stylesheet.
      */}
      <style href="tandiko-text-field" precedence="tandiko-text-field">
        {textFieldStylesheet}
      </style>
      <input type={type} {...rest} className={classes} />
    </>
  );
}
