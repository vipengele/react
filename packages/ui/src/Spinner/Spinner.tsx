import { spinnerStylesheet } from "./Spinner.stylesheet.js";

/** Spinner's size scale, shared with `Button` so a spinner sits inside a button of the
 * same size without a per-call-site size prop. */
export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  /** Inline stroke colour override. A deliberate escape hatch: it wins over the stylesheet's
   * `var(--tandiko-accent)`, so this instance stops adapting to light/dark on its own. Leave it
   * unset unless the spinner sits on a ground the theme doesn't know about. */
  color?: string;
  /** Announced by the `role="status"` region while the spinner is mounted. */
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<SpinnerSize, string> = {
  sm: "tandiko-spinner-sm",
  md: "tandiko-spinner-md",
  lg: "tandiko-spinner-lg",
};

/**
 * An indeterminate loading indicator, rotated by a CSS `@keyframes` rule in its own stylesheet
 * and stroked in `var(--tandiko-accent)` by default.
 */
export function Spinner({ size = "md", color, label = "Loading", className }: SpinnerProps) {
  const classes = ["tandiko-spinner", SIZE_CLASS[size], className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N spinners on a page inject one
        stylesheet.
      */}
      <style href="tandiko-spinner" precedence="tandiko-spinner">
        {spinnerStylesheet}
      </style>
      <svg className={classes} viewBox="0 0 24 24" role="status" aria-label={label} style={color === undefined ? undefined : { color }}>
        <circle cx="12" cy="12" r="10" />
      </svg>
    </>
  );
}
