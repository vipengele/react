import type { FieldsetHTMLAttributes, ReactNode } from "react";
import { fieldSetStylesheet } from "./FieldSet.stylesheet.js";

export interface FieldSetProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "children"> {
  /** The group's accessible name, rendered in a native `<legend>` — a `<fieldset>` derives its
   * own accessible name from this automatically, with no id/aria wiring required. */
  legend: ReactNode;
  /** Grouped content, stacked one child per line with spacing between them whatever each child's
   * own `display` is — typically one or more `FormField`s, but not restricted to them.
   * `FieldSet` carries no form-state logic of its own. */
  children: ReactNode;
}

/**
 * A native `<fieldset>` + `<legend>` pair that stacks `children` one per line with spacing
 * between them, for grouping related controls. Purely a layout wrapper: `disabled` forwards
 * straight to the native `<fieldset>`, which natively disables every descendant form control
 * without `FieldSet` doing anything itself.
 *
 * A `<legend>` names its own `<fieldset>` automatically, but that does not extend to a
 * `role="radiogroup"` element nested inside it — `RadioGroup` carries its own `aria-label` for
 * that reason.
 */
export function FieldSet({ legend, children, className, ...rest }: FieldSetProps) {
  const classes = ["vpg-fieldset", className].filter(Boolean).join(" ");

  return (
    <fieldset {...rest} className={classes}>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N fieldsets on a page inject one
        stylesheet.
      */}
      <style href="vpg-fieldset" precedence="vpg-fieldset">
        {fieldSetStylesheet}
      </style>
      <legend className="vpg-fieldset-legend">{legend}</legend>
      {/*
        The legend stays a direct child of the `<fieldset>`, outside this wrapper: the browser's
        own legend placement — the notch, and `max(padding-top, legend-block-size)` above the
        first child — only applies to a legend the fieldset itself owns.
      */}
      <div className="vpg-fieldset-body">{children}</div>
    </fieldset>
  );
}
