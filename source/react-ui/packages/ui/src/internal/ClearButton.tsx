import { X } from "@vipengele/react-icons";
import type { MouseEvent } from "react";
import { clearButtonStylesheet } from "./ClearButton.stylesheet.js";

export interface ClearButtonProps {
  /** The button's accessible name — what it clears, such as `"Clear selection"`. */
  label: string;
  /** Called when the button is activated, by pointer or keyboard. */
  onClear: () => void;
  disabled?: boolean;
}

// The press never takes focus: a pointer-down that moved focus would blur the field's input before
// the click lands, so the field would commit or close on the blur and only then be cleared.
function keepFocus(event: MouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

/**
 * The icon-only control that empties a field, placed in its trailing slot. A real `<button>`, so it
 * is a tab stop and carries its name into the accessibility tree; the icon is decorative and
 * hidden from it.
 */
export function ClearButton({ label, onClear, disabled }: ClearButtonProps) {
  return (
    <>
      {/* React 19 hoists and de-duplicates this by `href`, so every field on a page that renders a
          clear button injects it once. */}
      <style href="vpg-clear-button" precedence="vpg-clear-button">
        {clearButtonStylesheet}
      </style>
      <button type="button" className="vpg-clear-button" aria-label={label} disabled={disabled} onMouseDown={keepFocus} onClick={onClear}>
        <X className="vpg-clear-button-icon" aria-hidden="true" />
      </button>
    </>
  );
}
