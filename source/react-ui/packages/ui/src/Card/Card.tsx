import { Children, type HTMLAttributes, isValidElement, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
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
  const classes = ["vpg-card-header", className].filter(Boolean).join(" ");
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}

function CardContent({ className, children, ...rest }: CardContentProps) {
  const classes = ["vpg-card-content", className].filter(Boolean).join(" ");
  return (
    <div {...rest} className={classes}>
      {children}
    </div>
  );
}

function CardFooter({ className, children, ...rest }: CardFooterProps) {
  const classes = ["vpg-card-footer", className].filter(Boolean).join(" ");
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
      throw new Error("Card only accepts Card.Header, Card.Content, and Card.Footer as children.");
    }
  });

  if (contentCount === 0) {
    throw new Error("Card requires a Card.Content child.");
  }
}

/** Elements `Card`'s own click/keydown activation defers to, rather than intercepting: a click or
 * a Space/Enter keypress that originated inside one of these (a `Card.Footer` `<Button>`, an
 * `<input>` in `Card.Content`) is that control's to handle, not the Card's. */
// biome-ignore lint/security/noSecrets: a CSS selector, read as a high-entropy string
const INTERACTIVE_DESCENDANT_SELECTOR = "button, a[href], input, select, textarea, [role='button']";

/** Whether `target` is, or is inside, an interactive element other than `root` itself — `root`
 * matching its own `[role="button"]` selector is not a "descendant" to defer to. A mouse or
 * keyboard event's `target` inside a `Card` is always the element the pointer or focus landed
 * on, never a bare text node — DOM hit-testing resolves clicks to an `Element`. */
function isInteractiveDescendant(target: EventTarget, root: HTMLElement): boolean {
  const closest = (target as HTMLElement).closest(INTERACTIVE_DESCENDANT_SELECTOR);
  return closest !== null && closest !== root;
}

function CardImpl({ className, children, onClick, onKeyDown, ...rest }: CardProps) {
  validateChildren(children);

  const interactive = onClick !== undefined;

  const classes = ["vpg-card", interactive ? "vpg-card-interactive" : "", className].filter(Boolean).join(" ");

  // A click that bubbled up from a nested interactive element (a footer `Button`, say) is not
  // the Card being activated — the descendant already handled it, and firing `onClick` again
  // would double-activate both.
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (isInteractiveDescendant(event.target, event.currentTarget)) {
      return;
    }
    onClick?.(event);
  }

  // Enter/Space activation matches native `<button>` behaviour; the element itself has to be a
  // `<div>` (see `CardProps.onClick`'s doc comment), so nothing supplies this for free. Only
  // wired up when interactive — a non-interactive card forwards a caller's own `onKeyDown`
  // through `rest` unmodified. Same descendant guard as `handleClick`: Space typed into a nested
  // `<input>`, or Enter on a nested link, is not the Card's to intercept.
  //
  // Dispatches a real click via `.click()` rather than calling `onClick` directly with the
  // keyboard event cast to a `MouseEvent` — a consumer reading `clientX`/`clientY`/`button` off
  // that event would get `undefined` on keyboard activation. `.click()` makes the browser fire an
  // actual `MouseEvent`, which re-enters `handleClick` (and its own descendant guard) for free.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    if (isInteractiveDescendant(event.target, event.currentTarget)) {
      return;
    }
    event.preventDefault();
    event.currentTarget.click();
  }

  const interactiveProps = interactive
    ? { role: "button" as const, tabIndex: 0, onClick: handleClick, onKeyDown: handleKeyDown }
    : { onKeyDown };

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N cards on a page inject one
        stylesheet.
      */}
      <style href="vpg-card" precedence="vpg-card">
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
