import { type ComponentPropsWithoutRef, type ElementType, type ReactElement, type Ref, useEffect, useRef, useState } from "react";
import { Link, type LinkProps } from "../Link/Link.js";
import { breadcrumbsStylesheet } from "./Breadcrumbs.stylesheet.js";

/** One step of the trail. */
export interface BreadcrumbsItem<C extends ElementType = "a"> {
  /**
   * The step's text. A string, because the trail re-collapses when its labels and hrefs change,
   * and only text can be compared by content rather than by identity.
   */
  label: string;
  /**
   * Where the step leads. A step without one renders as plain text. Ignored on the last item,
   * which is the current page and never a link.
   */
  href?: string;
  /** Forwarded to the step's `Link`, rendered as `linkAs`. Ignored on a step without `href`. */
  linkProps?: ComponentPropsWithoutRef<C>;
}

interface BreadcrumbsOwnProps<C extends ElementType> {
  /** The trail from the root to the current page, in order. The last item is the current page. */
  items: readonly BreadcrumbsItem<C>[];
  /**
   * Swaps every link in the trail for another element — typically a router's own link
   * component — through `Link`'s `as`. Each item's `linkProps` is typed against it.
   */
  linkAs?: C;
  /**
   * The most items shown before the trail collapses its middle behind the collapse marker.
   * Defaults to 4.
   */
  maxItems?: number;
  /** How many items lead the trail before the collapse marker. Defaults to 1. */
  itemsBeforeCollapse?: number;
  /**
   * How many items follow the collapse marker, the current page among them. Defaults to 2, and
   * is never less than 1, so the current page always shows.
   */
  itemsAfterCollapse?: number;
  /** The landmark's accessible name. Defaults to "Breadcrumb". */
  label?: string;
  /** The collapse marker's accessible name. Defaults to "Show hidden path". */
  expandLabel?: string;
  /** A ref to the `<nav>`. */
  ref?: Ref<HTMLElement>;
  className?: string;
}

export type BreadcrumbsProps<C extends ElementType = "a"> = BreadcrumbsOwnProps<C> &
  Omit<ComponentPropsWithoutRef<"nav">, keyof BreadcrumbsOwnProps<C> | "children" | "aria-label">;

/**
 * `Link` rendered against a caller-chosen element type. `Link`'s own generic cannot be resolved
 * while `C` is still a type parameter, so the trail renders it through this one fixed signature;
 * `BreadcrumbsItem<C>` is what keeps each item's `linkProps` sound against `linkAs`.
 */
const TrailLink = Link as (props: LinkProps<ElementType> & { href?: string }) => ReactElement;

/** Selects the elements a revealed item may hold that take focus from the keyboard. */
const focusableSelector = 'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * A trail compared by content: an inline `items={[...]}` literal is a new array every render,
 * and keying the collapse on identity would re-collapse an expanded trail on every one of them.
 */
function contentKey(items: readonly BreadcrumbsItem<ElementType>[]): string {
  return JSON.stringify(items.map((item) => [item.label, item.href ?? null]));
}

/**
 * The trail from the root to the current page. Past `maxItems` items, the middle of the trail
 * collapses behind the collapse marker, a button that expands the whole trail in place and moves
 * focus to the first item it reveals. The trail re-collapses whenever its items' labels or hrefs
 * change, so one mounted trail updated on every route change does not stay expanded for good.
 */
export function Breadcrumbs<C extends ElementType = "a">({
  items,
  linkAs,
  maxItems = 4,
  itemsBeforeCollapse = 1,
  itemsAfterCollapse = 2,
  label = "Breadcrumb",
  expandLabel = "Show hidden path",
  className,
  ...rest
}: BreadcrumbsProps<C>) {
  const key = contentKey(items);
  const [expanded, setExpanded] = useState(false);
  const [expandedKey, setExpandedKey] = useState(key);
  if (expandedKey !== key) {
    setExpandedKey(key);
    setExpanded(false);
  }

  const listRef = useRef<HTMLOListElement>(null);
  const firstRevealedRef = useRef<unknown>(null);
  const focusPending = useRef(false);

  const before = Math.max(0, itemsBeforeCollapse);
  const after = Math.max(1, itemsAfterCollapse);
  const collapsible = items.length > maxItems && before + after < items.length;
  const collapsed = collapsible && !expanded;
  const revealedStart = before;
  const revealedEnd = items.length - after;

  // The collapse marker unmounts as the trail expands, taking focus with it, so focus moves only
  // once the revealed items exist. A router's `as` may never attach the ref to a DOM node, and
  // the first revealed item may have no `href`, so each step down the chain is guarded.
  useEffect(() => {
    if (!expanded || !focusPending.current) return;
    focusPending.current = false;
    const list = listRef.current;
    if (list === null) return;
    const firstRevealed = firstRevealedRef.current;
    if (firstRevealed instanceof HTMLElement && list.contains(firstRevealed)) {
      firstRevealed.focus();
      return;
    }
    for (const item of Array.from(list.children).slice(revealedStart, revealedEnd)) {
      const focusable = item.querySelector<HTMLElement>(focusableSelector);
      if (focusable !== null) {
        focusable.focus();
        return;
      }
    }
    list.focus();
  }, [expanded, revealedStart, revealedEnd]);

  if (items.length === 0) return null;

  const firstRevealedLink = collapsible
    ? items.findIndex((item, index) => index >= revealedStart && index < revealedEnd && item.href !== undefined)
    : -1;

  function renderItem(item: BreadcrumbsItem<C>, index: number) {
    if (index === items.length - 1) {
      return (
        <li key={index} className="vpg-breadcrumbs-item">
          <span className="vpg-breadcrumbs-current" aria-current="page">
            {item.label}
          </span>
        </li>
      );
    }
    return (
      <li key={index} className="vpg-breadcrumbs-item">
        {item.href === undefined ? (
          <span>{item.label}</span>
        ) : (
          <TrailLink
            {...item.linkProps}
            as={linkAs}
            href={item.href}
            ref={
              index === firstRevealedLink
                ? (node: unknown) => {
                    firstRevealedRef.current = node;
                  }
                : undefined
            }
          >
            {item.label}
          </TrailLink>
        )}
      </li>
    );
  }

  const classes = ["vpg-breadcrumbs", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N trails on a page inject one
        stylesheet.
      */}
      <style href="vpg-breadcrumbs" precedence="vpg-breadcrumbs">
        {breadcrumbsStylesheet}
      </style>
      <nav {...rest} aria-label={label} className={classes}>
        {/* Focusable from script only: the last fallback for focus after the trail expands. */}
        <ol ref={listRef} className="vpg-breadcrumbs-list" tabIndex={-1}>
          {collapsed
            ? [
                ...items.slice(0, before).map((item, index) => renderItem(item, index)),
                <li key="collapse-marker" className="vpg-breadcrumbs-item">
                  <button
                    type="button"
                    className="vpg-breadcrumbs-expand"
                    aria-label={expandLabel}
                    onClick={() => {
                      focusPending.current = true;
                      setExpanded(true);
                    }}
                  >
                    <span aria-hidden="true">…</span>
                  </button>
                </li>,
                ...items.slice(revealedEnd).map((item, index) => renderItem(item, revealedEnd + index)),
              ]
            : items.map((item, index) => renderItem(item, index))}
        </ol>
      </nav>
    </>
  );
}
