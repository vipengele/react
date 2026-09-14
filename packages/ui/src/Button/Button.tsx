import type { IconComponent } from "@tandiko/icons";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "../Spinner/Spinner.js";
import { buttonStylesheet } from "./Button.stylesheet.js";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

/** Shared with `Spinner`'s size scale, so a loading button holds its height. */
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonOwnProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Disables interaction and replaces the button's content with an inline `<Spinner>`. The
   * button keeps its own text colour, so the spinner reads on every variant. */
  loading?: boolean;
  /** Rendered before the label. Pass the component itself — `<Button leadingIcon={Plus} />` —
   * so a bundler only ever sees the icons actually referenced. */
  leadingIcon?: IconComponent;
  /** Rendered after the label, under the same rules as `leadingIcon`. */
  trailingIcon?: IconComponent;
}

/**
 * A square button carrying an icon and no text. `aria-label` is required rather than optional:
 * without visible text, it is the button's only accessible name, and a runtime warning would
 * land too late to stop the button shipping nameless.
 */
interface IconOnlyButtonProps extends ButtonOwnProps {
  iconOnly: true;
  "aria-label": string;
  children?: never;
}

interface LabelledButtonProps extends ButtonOwnProps {
  iconOnly?: false;
  children?: ReactNode;
}

export type ButtonProps = IconOnlyButtonProps | LabelledButtonProps;

/**
 * The library's action atom, styled entirely from `--tandiko-*` custom properties read through
 * `var()` in its own stylesheet, so a themed instance follows colour mode without re-rendering.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  iconOnly = false,
  leadingIcon: LeadingIcon,
  trailingIcon: TrailingIcon,
  className,
  disabled = false,
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "tandiko-button",
    `tandiko-button-${variant}`,
    `tandiko-button-${size}`,
    iconOnly ? "tandiko-button-icon-only" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N buttons on a page inject one
        stylesheet.
      */}
      <style href="tandiko-button" precedence="tandiko-button">
        {buttonStylesheet}
      </style>
      <button
        type="button"
        {...rest}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? (
          // `color="currentColor"` rather than a class: the spinner's own stylesheet strokes it
          // in `var(--tandiko-accent)`, and two single-class rules are settled by injection
          // order, which nothing here controls.
          <Spinner size={size} color="currentColor" />
        ) : (
          <>
            {LeadingIcon ? <LeadingIcon className="tandiko-button-icon" /> : null}
            {children}
            {TrailingIcon ? <TrailingIcon className="tandiko-button-icon" /> : null}
          </>
        )}
      </button>
    </>
  );
}
