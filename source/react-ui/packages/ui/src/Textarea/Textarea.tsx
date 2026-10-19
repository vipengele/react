import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { FieldShell } from "../FieldShell/FieldShell.js";
import { assignRef } from "../internal/assignRef.js";
import { ClearButton } from "../internal/ClearButton.js";
import { textareaStylesheet } from "./Textarea.stylesheet.js";

interface TextareaBaseProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** A ref to the native `<textarea>`. `TextareaHTMLAttributes` carries no `ref`, so the prop is
   * declared here. */
  ref?: Ref<HTMLTextAreaElement>;
  /** The native `rows`, and the height the field starts at. Defaults to 3. */
  rows?: number;
  /** An adornment rendered before the textarea, inside the field's border — an icon, a prefix, a
   * currency symbol. Passed straight to `FieldShell`'s slot of the same name. */
  leading?: ReactNode;
  /** An adornment rendered after the textarea, inside the field's border — a unit, a spinner, an
   * interactive button. Passed straight to `FieldShell`'s slot of the same name. */
  trailing?: ReactNode;
  /** Shows a button after the `trailing` adornment that empties the textarea, while the textarea
   * holds text and is neither disabled nor read-only. Clearing reaches `onChange` as an ordinary
   * change to `""` and returns focus to the textarea. Defaults to `false`. */
  clearable?: boolean;
  /** The clear button's accessible name. Defaults to `"Clear"`. */
  clearLabel?: string;
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

function clearTextarea(textarea: HTMLTextAreaElement) {
  // React keeps its own record of a textarea's value on the element and fires `onChange` only
  // when the DOM value differs from it. Writing through the prototype's setter leaves that record
  // holding the old text, so the `input` event that follows reads as a real change. The setter is
  // read off the element's own prototype at call time, and the event comes from its own window
  // (below): the module touches no DOM global on import, and an element from another window
  // still resolves its own window's setter and event.
  Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), "value")?.set?.call(textarea, "");
  // The event comes from the element's own window: a listener checking `instanceof Event`
  // against that window rejects one built by the calling window's constructor.
  const EventCtor = textarea.ownerDocument.defaultView?.Event ?? Event;
  textarea.dispatchEvent(new EventCtor("input", { bubbles: true }));
  textarea.focus();
}

/**
 * A native `<textarea>` for multi-line free-text entry, wrapped in the `FieldShell` that draws
 * the field's chrome. No custom keyboard handling: the native element handles typing, focus and
 * form participation, and the shell reads focus, `aria-invalid` and disabledness off it, so a
 * textarea and any other shell-composing control read as the same kind of control side by side in
 * a form.
 *
 * The one thing it tracks is whether the textarea holds text, which decides whether a `clearable`
 * field shows its clear button: a controlled field reads it off `value` on every render, and an
 * uncontrolled one keeps it in state from `defaultValue` and each change. The value itself stays
 * the textarea's or the caller's; clearing goes through the textarea exactly as typing does.
 *
 * The trailing slot sits against the first line rather than the field's vertical middle, so on a
 * tall field the clear button and any other trailing adornment stay beside the text they act on.
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
export function Textarea({
  className,
  rows = 3,
  autoGrow,
  maxRows,
  leading,
  trailing,
  clearable = false,
  clearLabel = "Clear",
  ref,
  onChange,
  style,
  ...rest
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [uncontrolledText, setUncontrolledText] = useState(() => String(rest.value ?? rest.defaultValue ?? ""));
  const controlled = rest.value !== undefined;
  const text = controlled ? String(rest.value) : uncontrolledText;

  // The state is only kept current while `clearable` is on, so a plain field does not re-render per
  // keystroke. Switching `clearable` on reads the live value, which the state has not followed.
  useLayoutEffect(() => {
    if (clearable && !controlled) {
      setUncontrolledText(textareaRef.current?.value ?? "");
    }
  }, [clearable, controlled]);

  const setTextarea = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textareaRef.current = node;
      const cleanup = assignRef(ref, node);
      // Returning a cleanup stops React calling this with `null`, so the caller's ref is detached
      // here: through its own cleanup when it returned one, otherwise with `null`.
      return () => {
        if (cleanup) {
          cleanup();
        } else {
          assignRef(ref, null);
        }
        textareaRef.current = null;
      };
    },
    [ref],
  );

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // A controlled field reads `value` and never this state, and a field that is not clearable
    // never reads it either.
    if (clearable && !controlled) {
      setUncontrolledText(event.target.value);
    }
    onChange?.(event);
  };

  // The clear button only renders while the textarea is mounted, so the ref is set whenever this runs.
  const clear = () => textareaRef.current && clearTextarea(textareaRef.current);

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
      <FieldShell leading={leading} trailing={trailingContent}>
        <textarea
          rows={rows}
          {...rest}
          ref={setTextarea}
          onChange={handleChange}
          className={classes}
          data-auto-grow={autoGrow ? "" : undefined}
          style={bounds}
        />
      </FieldShell>
    </>
  );
}
