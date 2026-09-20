import type { HTMLAttributes, ReactNode, Ref } from "react";
import { fieldShellStylesheet } from "./FieldShell.stylesheet.js";

export interface FieldShellProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /**
   * A ref to `.tandiko-field-shell`, the bordered box itself. A floating surface anchored to the
   * field — a listbox, a popover — positions against the whole field rather than the control
   * inside it, so the ref lands on the element whose border the surface has to align with and
   * whose width it has to match. `HTMLAttributes` carries no `ref`, so the prop is declared here.
   */
  ref?: Ref<HTMLDivElement>;
  /**
   * An adornment rendered in `.tandiko-field-shell-leading`, before the centre — an icon, a
   * prefix, a currency symbol. Absent, the slot element is not rendered at all, so a shell with
   * no adornment holds no empty wrapper.
   */
  leading?: ReactNode;
  /**
   * An adornment rendered in `.tandiko-field-shell-trailing`, after the centre — a unit, a
   * spinner, an interactive button. A disabled button here is the adornment's own state and
   * leaves the field undimmed; only the control dims the shell.
   */
  trailing?: ReactNode;
  /**
   * The control the shell decorates, and any sibling that belongs inside the field's boundary —
   * a chip row beside a trigger, for instance. The shell renders no field element of its own and
   * needs no knowledge of what it wraps.
   */
  children: ReactNode;
}

/**
 * The chrome of a text-entry control: a bordered, rounded, surface-filled box that takes a focus
 * ring, an accent border while the control's listbox is open (`aria-expanded="true"`), a danger
 * border when the control is invalid and a dimmed treatment when it is disabled.
 * It owns the box, its states, its height, its horizontal padding and its width; the control it
 * wraps keeps its own element, class name, `className` and prop spread (ADR-0011).
 *
 * The DOM this renders is part of the component's API — `.tandiko-field-shell` is the bordered
 * box, and each slot is a child of it, the leading one before the centre and the trailing one
 * after. Consumers style around those class names, so the shape is a commitment; the selectors
 * that read focus, openness, invalidity and disabledness out of the control are internal mechanics.
 */
export function FieldShell({ leading, trailing, className, children, ref, ...rest }: FieldShellProps) {
  const classes = ["tandiko-field-shell", className].filter(Boolean).join(" ");
  // React renders `false`, `null`, `undefined` and `""` as nothing, but renders `0` as the
  // character "0" — so a slot is absent exactly when its value is one of the former, never by a
  // loose falsiness check that would also drop a present `0`.
  const hasLeading = leading !== undefined && leading !== null && leading !== "" && leading !== false;
  const hasTrailing = trailing !== undefined && trailing !== null && trailing !== "" && trailing !== false;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N shells on a page inject one
        stylesheet.
      */}
      <style href="tandiko-field-shell" precedence="tandiko-field-shell">
        {fieldShellStylesheet}
      </style>
      <div {...rest} ref={ref} className={classes}>
        {hasLeading ? <span className="tandiko-field-shell-leading">{leading}</span> : null}
        {children}
        {hasTrailing ? <span className="tandiko-field-shell-trailing">{trailing}</span> : null}
      </div>
    </>
  );
}
