import { cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode, useId } from "react";
import { formFieldStylesheet } from "./FormField.stylesheet.js";

/** The subset of ARIA/labelling attributes `FormField` clones onto its single child. Every
 * focusable control this package ships (native inputs, `Toggle`, `RadioButton`, and
 * `Dropdown`'s trigger div) accepts all four as plain optional props. */
interface CloneableControlProps {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-labelledby"?: string;
}

export interface FormFieldProps {
  /** The field's accessible name, rendered in a `<label>` and referenced from the control via
   * `aria-labelledby` (applied unconditionally — see `children`'s doc comment). */
  label: ReactNode;
  /** Supplementary guidance, rendered below the control and wired into `aria-describedby`. */
  hint?: ReactNode;
  /** A validation message. Rendered below the control (after `hint`, when both are present) and
   * wired into `aria-describedby`; its presence also sets `aria-invalid` on the control. */
  error?: ReactNode;
  /**
   * Exactly one focusable control — a native input, `Toggle`, `RadioButton`, or `Dropdown`'s
   * trigger. Not a group-shaped component like
   * `RadioGroup`, which gets its accessible name from its own `aria-label` rather than a
   * wrapping `FormField`.
   *
   * `FormField` clones `id`, `aria-describedby`, `aria-invalid`, and `aria-labelledby` onto this
   * element. `aria-labelledby` is applied unconditionally, regardless of what element the child
   * renders as: a `<label htmlFor>` only associates with labelable elements (`input`/`select`/
   * `textarea`/`button`/`meter`/`output`/`progress`), so a non-labelable trigger (Dropdown's
   * `<div role="combobox">`) would otherwise get no accessible name at all. Anything that isn't a
   * single valid element — text, an array, a `Fragment`, `null`/`undefined` — throws, since there
   * is no single node to attach the label and description to.
   */
  children: ReactElement<CloneableControlProps>;
}

/**
 * Labels a single focusable control and wires up its description/validation state via
 * `cloneElement` — the narrow labelling-attribute carve-out in
 * `.agents/rules/wrap-trigger-never-clone.md`, not the span-wrap pattern: there is no
 * floating-UI trigger here, just ARIA attributes that must land on the actual focusable element
 * rather than an ancestor a screen reader never focuses.
 */
export function FormField({ label, hint, error, children }: FormFieldProps) {
  const generatedId = useId();
  const labelId = `${generatedId}-label`;
  const hintId = `${generatedId}-hint`;
  const errorId = `${generatedId}-error`;

  if (!isValidElement(children) || children.type === Fragment) {
    throw new Error("FormField requires exactly one focusable element as its child.");
  }

  const hasHint = hint !== undefined && hint !== null && hint !== "";
  const hasError = error !== undefined && error !== null && error !== "";

  const describedByIds = [hasHint ? hintId : null, hasError ? errorId : null].filter((id): id is string => id !== null);
  const mergedDescribedBy = [children.props["aria-describedby"], ...describedByIds].filter(Boolean).join(" ");

  const childId = children.props.id ?? generatedId;

  const cloneProps: CloneableControlProps = {
    id: childId,
    "aria-labelledby": labelId,
  };
  if (mergedDescribedBy) {
    cloneProps["aria-describedby"] = mergedDescribedBy;
  }
  if (hasError) {
    cloneProps["aria-invalid"] = true;
  }

  const control = cloneElement(children, cloneProps);

  return (
    <div className="vpg-form-field">
      {/*
        React 19 hoists and de-duplicates this by `href`, so N form fields on a page inject one
        stylesheet.
      */}
      <style href="vpg-form-field" precedence="vpg-form-field">
        {formFieldStylesheet}
      </style>
      <label htmlFor={childId} id={labelId} className="vpg-form-field-label">
        {label}
      </label>
      {control}
      {hasHint ? (
        <span id={hintId} className="vpg-form-field-hint">
          {hint}
        </span>
      ) : null}
      {hasError ? (
        <span id={errorId} className="vpg-form-field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
