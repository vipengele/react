import { X } from "@vipengele/react-icons";
import type { ReactNode } from "react";
import { Badge, type BadgeProps } from "../Badge/Badge.js";
import { tagStylesheet } from "./Tag.stylesheet.js";

/**
 * The remove button's accessible name. A string label lets it default to `Remove ${children}`;
 * any other label — an element, a fragment, a number — carries no text the tag can safely quote,
 * so the caller must name the button with `removeLabel`.
 */
type TagLabelProps =
  | {
      children: string;
      /** The remove button's accessible name. Defaults to `Remove ${children}`. */
      removeLabel?: string;
    }
  | {
      children?: ReactNode;
      /** The remove button's accessible name. Required when `children` is not a string. */
      removeLabel: string;
    };

export type TagProps = Omit<BadgeProps, "children"> &
  TagLabelProps & {
    /** Called once per activation of the remove button. The tag does not remove itself, and
     * where focus goes once the caller unmounts it is the caller's decision. */
    onRemove: () => void;
  };

/**
 * A `Badge` the user can remove: the same variants, emphases, sizes and icon slot, followed by a
 * remove button. The button is the tag's only focusable element; the tag handles no keys of its
 * own, so Backspace and Delete do nothing on it.
 */
export function Tag({ onRemove, removeLabel, className, children, ...rest }: TagProps) {
  const label = removeLabel ?? `Remove ${children}`;
  const classes = ["vpg-tag", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N tags on a page inject one
        stylesheet, alongside the one the composed `Badge` injects.
      */}
      <style href="vpg-tag" precedence="vpg-tag">
        {tagStylesheet}
      </style>
      <Badge {...rest} className={classes}>
        {children}
        <button type="button" className="vpg-tag-remove" aria-label={label} onClick={onRemove}>
          <X className="vpg-tag-remove-icon" aria-hidden="true" />
        </button>
      </Badge>
    </>
  );
}
