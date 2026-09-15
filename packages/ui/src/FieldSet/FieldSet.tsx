import type { FieldsetHTMLAttributes, ReactNode } from "react";
import { fieldSetStylesheet } from "./FieldSet.stylesheet.js";

export interface FieldSetProps extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, "children"> {
  /** The group's accessible name, rendered in a native `<legend>` — a `<fieldset>` derives its
   * own accessible name from this automatically, with no id/aria wiring required. */
  legend: ReactNode;
  /** Grouped content, laid out with spacing between each child — typically one or more
   * `FormField`s, but not restricted to them. `FieldSet` carries no form-state logic of its
   * own. */
  children: ReactNode;
}

/**
 * A native `<fieldset>` + `<legend>` pair with spacing between `children`, for grouping related
 * controls. Purely a layout wrapper: `disabled` forwards straight to the native `<fieldset>`,
 * which natively disables every descendant form control without `FieldSet` doing anything
 * itself.
 *
 * A `<legend>` names its own `<fieldset>` automatically, but that does not extend to a
 * `role="radiogroup"` element nested inside it — `RadioGroup` carries its own `aria-label` for
 * that reason.
 */
export function FieldSet({ legend, children, className, ...rest }: FieldSetProps) {
  const classes = ["tandiko-fieldset", className].filter(Boolean).join(" ");

  return (
    <fieldset {...rest} className={classes}>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N fieldsets on a page inject one
        stylesheet.
      */}
      <style href="tandiko-fieldset" precedence="tandiko-fieldset">
        {fieldSetStylesheet}
      </style>
      <legend className="tandiko-fieldset-legend">{legend}</legend>
      {children}
    </fieldset>
  );
}
