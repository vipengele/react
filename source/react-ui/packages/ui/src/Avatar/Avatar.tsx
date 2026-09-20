import { User } from "@tandiko/icons";
import { type HTMLAttributes, useState } from "react";
import { avatarStylesheet } from "./Avatar.stylesheet.js";

export type AvatarSize = "sm" | "md" | "lg" | "xl";

export type AvatarShape = "circle" | "square";

export interface AvatarProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The image to render. An image that fails to load falls through to the initials, and then
   * to the generic person icon, so a dead URL degrades instead of leaving a blank frame. */
  src?: string;
  /** The person the avatar stands for: the source of the initials, and the accessible name
   * when no `alt` is given. */
  name?: string;
  /** Overrides `name` as the accessible name. */
  alt?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
}

/**
 * Initials are the first character of the first word plus the first character of the last word,
 * upper-cased — "Ada Lovelace" gives "AL", "Ada" gives "A", and a middle name is skipped rather
 * than producing a third letter that wouldn't fit the frame. Words are whitespace-separated, so
 * a name that is only whitespace yields nothing and the caller falls through to the icon.
 */
function initialsFrom(name: string): string {
  const words = name.split(/\s+/).filter((word) => word.length > 0);
  const picked = words.length > 1 ? [...words.slice(0, 1), ...words.slice(-1)] : words.slice(0, 1);
  return picked
    .map((word) => word.slice(0, 1))
    .join("")
    .toUpperCase();
}

/**
 * The library's person atom: an image, the person's initials, or a generic person glyph, in
 * that order of preference, framed as a circle or a rounded square.
 */
export function Avatar({ src, name, alt, size = "md", shape = "circle", className, ...rest }: AvatarProps) {
  // Keyed on the URL rather than a boolean, so swapping `src` to a fresh image retries it
  // instead of inheriting the previous URL's failure.
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);

  const classes = ["tandiko-avatar", `tandiko-avatar-${size}`, `tandiko-avatar-${shape}`, className].filter(Boolean).join(" ");

  const label = alt ?? name;
  const showImage = src !== undefined && src !== failedSrc;
  const initials = name === undefined ? "" : initialsFrom(name);

  // The role and the label travel as one object because a `<span>` only supports `aria-label`
  // once it has a role that takes one. The image carries the accessible name itself; on the
  // fallback paths the root is the only element left to carry it, and with neither an image nor
  // a name there is nothing to announce, so the frame stays out of the accessibility tree.
  const labelling = showImage || label === undefined ? undefined : { role: "img", "aria-label": label };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N avatars on a page inject one
        stylesheet.
      */}
      <style href="tandiko-avatar" precedence="tandiko-avatar">
        {avatarStylesheet}
      </style>
      <span {...rest} {...labelling} className={classes}>
        {showImage ? (
          <img src={src} alt={label ?? ""} className="tandiko-avatar-image" onError={() => setFailedSrc(src)} />
        ) : initials ? (
          // The root already announces `label`; repeating the initials would read them out as a
          // second, meaningless word.
          <span aria-hidden="true">{initials}</span>
        ) : (
          <User className="tandiko-avatar-icon" aria-hidden="true" />
        )}
      </span>
    </>
  );
}
