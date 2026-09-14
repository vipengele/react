import {
  Children,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cardStylesheet } from "./Card.stylesheet.js";

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function CardHeader({ className, children, ...rest }: CardHeaderProps) {
  const classes = ["tandiko-card-header", className].filter(Boolean).join(" ");
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}

function CardContent({ className, children, ...rest }: CardContentProps) {
  const classes = ["tandiko-card-content", className].filter(Boolean).join(" ");
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...rest }: CardFooterProps) {
  const classes = ["tandiko-card-footer", className].filter(Boolean).join(" ");
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Any mix of `Card.Header`, `Card.Content`, and `Card.Footer`, in any order — `Card.Content`
   * is required, and at most one of each is allowed. Anything else throws at render. */
  children: ReactNode;
  /** Makes the card itself the interactive element: `role="button"`, focusable, `Enter`/`Space`
   * activate it. Renders as a `<div>` rather than a `<button>` because a `<button>`'s content
   * model forbids interactive content, and `Card.Footer`'s canonical content is a `<Button>`. */
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}

/**
 * Validates that `children` is some mix of at most one `Card.Header`, exactly one
 * `Card.Content`, and at most one `Card.Footer` — falsy children (`null`/`undefined`/`false`/
 * `true`, the shape `cond && <Card.Footer />` produces) are skipped rather than treated as
 * invalid. Throws unconditionally, not gated on `NODE_ENV`, because an inconsistent Card is the
 * exact failure this compound API exists to prevent.
 */
function validateChildren(children: ReactNode): void {
  let headerCount = 0;
  let contentCount = 0;
  let footerCount = 0;

  Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") {
      return;
    }

    if (!isValidElement(child)) {
      throw new Error("Card only accepts Card.Header, Card.Content, and Card.Footer as children.");
    }

    if (child.type === CardHeader) {
      headerCount += 1;
      if (headerCount > 1) {
        throw new Error("Card accepts at most one Card.Header child.");
      }
    } else if (child.type === CardContent) {
      contentCount += 1;
      if (contentCount > 1) {
        throw new Error("Card accepts at most one Card.Content child.");
      }
    } else if (child.type === CardFooter) {
      footerCount += 1;
      if (footerCount > 1) {
        throw new Error("Card accepts at most one Card.Footer child.");
      }
    } else {
      throw new Error(
        "Card only accepts Card.Header, Card.Content, and Card.Footer as children.",
      );
    }
  });

  if (contentCount === 0) {
    throw new Error("Card requires a Card.Content child.");
  }
}

function CardImpl({ className, children, onClick, onKeyDown, ...rest }: CardProps) {
  validateChildren(children);

  const interactive = onClick !== undefined;

  const classes = ["tandiko-card", interactive ? "tandiko-card-interactive" : "", className]
    .filter(Boolean)
    .join(" ");

  // Enter/Space activation matches native `<button>` behaviour; the element itself has to be a
  // `<div>` (see `CardProps.onClick`'s doc comment), so nothing supplies this for free. Only
  // wired up when interactive — a non-interactive card forwards a caller's own `onKeyDown`
  // through `rest` unmodified.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.(event as unknown as MouseEvent<HTMLDivElement>);
    }
  }

  const interactiveProps = interactive
    ? { role: "button" as const, tabIndex: 0, onClick, onKeyDown: handleKeyDown }
    : { onKeyDown };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N cards on a page inject one
        stylesheet.
      */}
      <style href="tandiko-card" precedence="tandiko-card">
        {cardStylesheet}
      </style>
      <div {...rest} {...interactiveProps} className={classes}>
        {children}
      </div>
    </>
  );
}

type CardComponent = typeof CardImpl & {
  Header: typeof CardHeader;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
};

/**
 * A structured content surface: `Card.Header`, `Card.Content` (required), and `Card.Footer`, in
 * any order in JSX — layout is CSS-driven (`order`), not JSX-order-dependent. Passing `onClick`
 * makes the whole card an interactive element.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `Card` export (importing only `Button`, say) is tree-shaken out entirely instead of
// keeping the whole module "just in case" `Object.assign` does something observable.
export const Card = /* @__PURE__ */ Object.assign(CardImpl, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
}) as CardComponent;
