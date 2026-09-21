import { type InputHTMLAttributes, type ReactNode, type Ref, useEffect, useRef } from "react";
import { checkboxStylesheet } from "./Checkbox.stylesheet.js";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** A ref to the `<input>` itself, the element a form reads and a caller focuses.
   * `InputHTMLAttributes` carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLInputElement>;
  /** Text rendered beside the box inside a wrapping `<label>`, making the whole row a pointer
   * target for the control. Absent, the bare `<input>` is rendered and the accessible name comes
   * from wherever the caller puts it — an `aria-label`, an outer `<label htmlFor>`, a
   * `FormField`. */
  label?: ReactNode;
  /** The third state: neither checked nor unchecked, for a box summarising a partially selected
   * group. It is a DOM property with no HTML attribute behind it, so it never reaches the markup
   * and never changes what the form submits — only what the box draws and what assistive
   * technology announces. */
  indeterminate?: boolean;
}

/**
 * A single styled native `<input type="checkbox">`. No custom keyboard handling and no hand-set
 * `aria-checked`: the native element's own `checked` and `indeterminate` state already exposes
 * it, and a hand-set `aria-checked` would go stale in the uncontrolled (`defaultChecked`) case,
 * where a click updates the DOM's property without triggering a re-render.
 *
 * Distinct from `Toggle`, which applies its effect immediately: a checkbox carries a form value,
 * so it submits with the form rather than acting on the click.
 */
export function Checkbox({ className, label, indeterminate = false, ref, ...rest }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Clicking a box clears the DOM's `indeterminate` property, and that click need not re-render
  // anything — an uncontrolled checkbox has no state to update. So the prop is re-applied on
  // every commit, with no dependency array: a dependency on `indeterminate` alone would skip the
  // commits where the value is unchanged but the DOM has been cleared underneath it.
  useEffect(() => {
    // The effect runs only while the input is mounted, and the callback ref below has already
    // stored it by then.
    const input = inputRef.current as HTMLInputElement;
    input.indeterminate = indeterminate;
  });

  const classes = ["vpg-checkbox", className].filter(Boolean).join(" ");

  const input = (
    <input
      {...rest}
      type="checkbox"
      className={classes}
      ref={(node) => {
        inputRef.current = node;
        // A caller's ref is a function, an object, or absent; forwarding it by hand is what lets
        // this component keep a ref of its own to the same element.
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
    />
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N checkboxes on a page inject one
        stylesheet.
      */}
      <style href="vpg-checkbox" precedence="vpg-checkbox">
        {checkboxStylesheet}
      </style>
      {label === undefined ? (
        input
      ) : (
        // biome-ignore lint/a11y/noLabelWithoutControl: `input` is the checkbox itself, wrapped by this label; the rule only recognises a literal <input> child
        <label className="vpg-checkbox-row">
          {input}
          <span className="vpg-checkbox-label">{label}</span>
        </label>
      )}
    </>
  );
}
