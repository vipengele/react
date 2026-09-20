import { useState } from "react";
import { TextField, type TextFieldProps } from "../TextField/TextField.js";
import { passwordInputStylesheet } from "./PasswordInput.stylesheet.js";

export type PasswordInputProps = Omit<TextFieldProps, "type" | "trailing">;

/**
 * A `TextField` whose native `type` toggles between `"password"` and `"text"` from a reveal
 * button in the shell's trailing slot, so a consumer can check what they typed without retyping
 * it. Composes `TextField` rather than `FieldShell` directly, reusing the one definition of "an
 * input inside a shell" this package has (ADR-0011).
 *
 * Presentational only: no validation, no strength meter, no required indicator. The reveal
 * button is a real `<button type="button">`, so it is reachable by keyboard and never removed
 * from the accessibility tree, and toggling it never moves focus — the click handler only flips
 * state, so a keyboard user stays on the button across a toggle.
 */
export function PasswordInput({ className, disabled, ...rest }: PasswordInputProps) {
  const [revealed, setRevealed] = useState(false);
  const label = revealed ? "Hide password" : "Show password";

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N password inputs on a page inject
        one stylesheet.
      */}
      <style href="vpg-password-input" precedence="vpg-password-input">
        {passwordInputStylesheet}
      </style>
      <TextField
        {...rest}
        className={className}
        disabled={disabled}
        type={revealed ? "text" : "password"}
        trailing={
          <button
            type="button"
            className="vpg-password-input-toggle"
            aria-pressed={revealed}
            aria-label={label}
            disabled={disabled}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? "Hide" : "Show"}
          </button>
        }
      />
    </>
  );
}
