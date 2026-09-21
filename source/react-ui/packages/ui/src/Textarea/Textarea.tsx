import type { CSSProperties, ReactNode, TextareaHTMLAttributes } from "react";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { textareaStylesheet } from "./Textarea.stylesheet.js";

interface TextareaBaseProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** The native `rows`, and the height the field starts at. Defaults to 3. */
  rows?: number;
  /** An adornment rendered before the textarea, inside the field's border — an icon, a prefix, a
   * currency symbol. Passed straight to `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the textarea, inside the field's border — a unit, a spinner, an
   * interactive button. Passed straight to `FieldShell`'s slot of the same name. */
  trailing?: ReactNode;
}

export interface TextareaFixedProps extends TextareaBaseProps {
  autoGrow?: false;
  /** A ceiling on growth only makes sense for a field that grows, so a fixed textarea takes no
   * `maxRows`: the height it has is the height `rows` names. */
  maxRows?: never;
}

export interface TextareaAutoGrowProps extends TextareaBaseProps {
  autoGrow: true;
  /** The tallest the field grows to, in rows; past it the text scrolls. Left unset, the field
   * grows with its content without limit. A `maxRows` below `rows` needs no guard — CSS resolves
   * a `min-height` over a `max-height`, so the field never renders shorter than `rows`. */
  maxRows?: number;
}

/**
 * A `Textarea` is fixed-height or auto-growing, and `maxRows` belongs to the second alone
 * (`Dropdown`'s single/multiple pair is the same shape).
 */
export type TextareaProps = TextareaFixedProps | TextareaAutoGrowProps;

/**
 * A native `<textarea>` for multi-line free-text entry, wrapped in the `FieldShell` that draws
 * the field's chrome. No custom keyboard handling and no state of its own: the native element
 * handles typing, focus and form participation, and the shell reads focus, `aria-invalid` and
 * disabledness off it, so a textarea and any other shell-composing control read as the same kind
 * of control side by side in a form.
 *
 * With `autoGrow`, the field tracks its content through CSS `field-sizing: content` — nothing is
 * measured in JS, so growth costs no layout read per keystroke. `rows` is inert under that
 * property, so the starting height travels as an inline `min-height` in `lh` instead, and
 * `maxRows` as a `max-height`. Both are plain lengths rather than `--vpg-*` properties, so
 * setting them inline shadows no theme value; a caller's own `style` is spread last and wins over
 * either. A browser without `field-sizing` renders the fixed-height, scrolling textarea `rows`
 * describes.
 *
 * `.vpg-textarea`, the caller's `className` and the prop spread all land on the `<textarea>`.
 * The border, background and states belong to the shell, so a `className` passed here cannot
 * restyle them — that is a rule on `.vpg-field-shell` (ADR-0011).
 */
export function Textarea({ className, rows = 3, autoGrow, maxRows, leading, trailing, style, ...rest }: TextareaProps) {
  const classes = ["vpg-textarea", "vpg-field-shell-control", className].filter(Boolean).join(" ");

  const bounds: CSSProperties | undefined = autoGrow
    ? {
        minHeight: `${rows}lh`,
        maxHeight: maxRows === undefined ? undefined : `${maxRows}lh`,
        ...style,
      }
    : style;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N textareas on a page inject one
        stylesheet.
      */}
      <style href="vpg-textarea" precedence="vpg-textarea">
        {textareaStylesheet}
      </style>
      <FieldShell leading={leading} trailing={trailing}>
        <textarea rows={rows} {...rest} className={classes} data-auto-grow={autoGrow ? "" : undefined} style={bounds} />
      </FieldShell>
    </>
  );
}
