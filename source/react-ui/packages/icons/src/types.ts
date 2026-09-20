import type { ComponentType } from "react";

/**
 * The subset of `lucide-react`'s own icon component props this package commits to. `@vipengele/react-ui`
 * types its icon-accepting props against this shape rather than lucide's full `LucideProps`, so
 * swapping the icon source later doesn't ripple into every consumer's prop types.
 */
export interface IconComponentProps {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
}

/** A component matching {@link IconComponentProps} — what every re-exported icon is typed as. */
export type IconComponent = ComponentType<IconComponentProps>;
