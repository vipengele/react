import { ChevronDown } from "@vipengele/react-icons";
import {
  Children,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  createContext,
  type ElementType,
  Fragment,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useState,
} from "react";
import { Inline } from "../Inline/Inline.js";
import { useOverflowCollapse } from "../internal/useOverflowCollapse.js";
import { MenuLinkItem, type MenuLinkItemProps } from "../internal/menuPanel.js";
import { Menu } from "../Menu/Menu.js";
import { topNavStylesheet } from "./TopNav.stylesheet.js";

function classNames(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** `true` inside a `TopNav`'s row: an item is only ever rendered by the nav that read its props. */
const TopNavContext = createContext(false);

interface TopNavItemOwnProps<C extends ElementType> {
  /** The item's label, shown in the row and, while the item is collapsed, as its overflow menu row. */
  children: ReactNode;
  /** The item is the page the user is on: sets `aria-current="page"` and the selected style, on
   * the link in the row and on its overflow menu row alike. The nav never reads the location
   * itself. */
  current?: boolean;
  /** A ref to the link in the row — the `<a>`, or whatever `as` renders. The overflow menu row is
   * a different element and never receives it. */
  ref?: ComponentPropsWithRef<C>["ref"];
  /** Composed onto the link in the row only. */
  className?: string;
}

/** The default `<a>` takes `href` as required: an anchor without one is not a link, and its overflow
 * menu row would not navigate on `Enter`. An `as` component takes its own props, navigation
 * included; `href`, when given, is forwarded to it, so a router link that reads its destination
 * from another prop applies that destination after spreading the rest. */
type TopNavItemHrefProps<C extends ElementType> = [C] extends ["a"] ? { href: string } : { href?: string };

/**
 * `as` swaps the rendered element for another — typically a router's own link component — in the
 * row and in the overflow menu alike; every other prop is forwarded to both, except `className`,
 * `style`, `ref` and `id`, which only the link in the row receives.
 */
export type TopNavItemProps<C extends ElementType = "a"> = TopNavItemOwnProps<C> & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof TopNavItemOwnProps<C> | "as" | "href"> &
  TopNavItemHrefProps<C>;

function TopNavItem<C extends ElementType = "a">({ as, current = false, className, children, ...rest }: TopNavItemProps<C>) {
  if (!useContext(TopNavContext)) {
    throw new Error("TopNav.Item must be rendered inside <TopNav>.");
  }
  const Component: ElementType = as ?? "a";
  return (
    <Component {...rest} className={classNames("vpg-top-nav-link", className)} aria-current={current ? "page" : undefined}>
      {children}
    </Component>
  );
}

/**
 * `Menu.LinkItem` rendered against a caller-chosen element type. Its own generic cannot be
 * resolved while the item's `as` is only known as an `ElementType`, so the overflow menu renders it
 * through this one fixed signature; `TopNavItemProps<C>` is what keeps each item's props sound
 * against its `as`. It casts the shared `MenuLinkItem` rather than reading `Menu.LinkItem`: a
 * module-level property read is one a bundler cannot prove free of side effects, and it would keep
 * `Menu` in every bundle that imports anything from the package.
 */
const OverflowLink = MenuLinkItem as (props: MenuLinkItemProps<ElementType> & { href?: string }) => ReactElement;

/** An item as the nav reads it: the element to render in the row, and the props both renderings
 * share. Its key is the one `Children.toArray` gives it, the caller's own key when there is one,
 * and keys its row entry and its overflow menu row alike. */
type ReadItem = ReactElement<TopNavItemProps<ElementType>>;

/** Names a rejected child in a validation error: its tag, its component's name, or its text. */
function describeChild(child: ReactNode): string {
  if (!isValidElement(child)) {
    return `the text "${String(child)}"`;
  }
  if (typeof child.type === "string") {
    return `<${child.type}>`;
  }
  const { name } = child.type as { name?: string };
  return name ? `<${name}>` : "an unnamed component";
}

/**
 * The `TopNav.Item`s among `children`, in order. Fragments are flattened, so items may be gathered
 * in one; `null`, `undefined` and booleans are dropped by `Children.toArray`, so an item behind a
 * condition is admitted. Any other child throws, unconditionally rather than gated on `NODE_ENV`:
 * the nav renders each item twice, as a link in the row and as an overflow menu row, from the
 * item's props, and a child it cannot read props off would be in neither.
 */
function readItems(children: ReactNode): ReadItem[] {
  const items: ReadItem[] = [];
  for (const child of Children.toArray(children)) {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Fragment) {
      items.push(...readItems(child.props.children));
      continue;
    }
    if (!isValidElement(child) || child.type !== TopNavItem) {
      throw new Error(`<TopNav> accepts only TopNav.Item as children, but received ${describeChild(child)}.`);
    }
    items.push(child as ReadItem);
  }
  return items;
}

/** The text a node renders, for comparing labels by content rather than by identity. */
function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return textOf(node.props.children);
  }
  return "";
}

/**
 * What the row's widths depend on, compared by content: an inline item list is new elements every
 * render, and a key compared by identity would re-measure the row on every one of them. A label,
 * a destination or the current item changing re-measures it, since each can change an item's
 * width; so does the overflow trigger's label.
 */
function measureKeyOf(items: ReadItem[], overflowLabel: string): string {
  return JSON.stringify([overflowLabel, items.map(({ props }) => [textOf(props.children), props.href ?? null, props.current === true])]);
}

export interface TopNavProps extends Omit<HTMLAttributes<HTMLElement>, "aria-label" | "children"> {
  /** Content before the items, such as a logo or the product name. It never collapses. */
  start?: ReactNode;
  /** Content after the items, such as a search field or the user's menu. It never collapses. */
  end?: ReactNode;
  /** The overflow menu trigger's text and accessible name. Defaults to `"More"`. */
  overflowLabel?: string;
  /** The landmark's accessible name. Defaults to `"Main"`. */
  "aria-label"?: string;
  /** A ref to the `<nav>`. */
  ref?: Ref<HTMLElement>;
  /** Only `TopNav.Item`s, optionally inside fragments. Any other child throws at render, naming
   * the offender. */
  children?: ReactNode;
}

const ITEM_SELECTOR = ".vpg-top-nav-item";

const OVERFLOW_SELECTOR = ".vpg-top-nav-overflow";

function TopNavImpl({
  start,
  end,
  overflowLabel = "More",
  "aria-label": ariaLabel = "Main",
  className,
  children,
  ref,
  ...rest
}: TopNavProps) {
  const items = readItems(children);
  const { rowRef, hiddenCount } = useOverflowCollapse<HTMLUListElement>({
    itemSelector: ITEM_SELECTOR,
    indicatorSelector: OVERFLOW_SELECTOR,
    disabled: false,
    measureKey: measureKeyOf(items, overflowLabel),
  });
  const visibleCount = items.length - hiddenCount;
  const hiddenItems = items.slice(visibleCount);
  const hiddenCurrent = hiddenItems.some(({ props }) => props.current === true);

  // A menu left open as its last hidden item returns to the row would hang off a trigger that is
  // no longer laid out, so it closes, and stays closed when items collapse into it again.
  const [overflowOpen, setOverflowOpen] = useState(false);
  if (overflowOpen && hiddenCount === 0) {
    setOverflowOpen(false);
  }

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N top navs on a page inject one
        stylesheet.
      */}
      <style href="vpg-top-nav" precedence="vpg-top-nav">
        {topNavStylesheet}
      </style>
      <nav {...rest} ref={ref} aria-label={ariaLabel} className={classNames("vpg-top-nav", className)}>
        {start === undefined ? null : <div className="vpg-top-nav-start">{start}</div>}
        {/*
          The measured row's parent, and so the box observed for resizes: its width is what the nav
          leaves between the slots, which changes with the nav and with the slots' content but not
          with the collapse inside it.
        */}
        <div className="vpg-top-nav-main">
          <Inline as="ul" ref={rowRef} gap="space-1" align="center" wrap={false} className="vpg-top-nav-row" data-collapsing="">
            <TopNavContext.Provider value={true}>
              {items.map((item, index) => (
                <li key={item.key} className="vpg-top-nav-item" data-hidden={index >= visibleCount ? "" : undefined}>
                  {item}
                </li>
              ))}
            </TopNavContext.Provider>
            {/*
              Rendered whether or not anything is hidden, because the measurement reserves the
              trigger's width before it counts the items onto the row.
            */}
            <li className="vpg-top-nav-overflow" data-hidden={hiddenCount === 0 ? "" : undefined}>
              <Menu
                open={overflowOpen && hiddenCount > 0}
                onOpenChange={setOverflowOpen}
                className="vpg-top-nav-menu"
                trigger={
                  <button
                    type="button"
                    className={classNames("vpg-top-nav-overflow-button", hiddenCurrent && "vpg-top-nav-overflow-button-current")}
                  >
                    {overflowLabel}
                    <ChevronDown className="vpg-top-nav-overflow-chevron" aria-hidden="true" />
                  </button>
                }
              >
                {hiddenItems.map(({ key, props }) => {
                  const { as, current, children: label, className: _className, style: _style, ref: _ref, id: _id, ...shared } = props;
                  return (
                    <OverflowLink key={key} {...shared} as={as} current={current}>
                      {label}
                    </OverflowLink>
                  );
                })}
              </Menu>
            </li>
          </Inline>
        </div>
        {end === undefined ? null : <div className="vpg-top-nav-end">{end}</div>}
      </nav>
    </>
  );
}

// Spelled out rather than `typeof TopNavItem`, so the declaration names only exported types.
type TopNavComponent = typeof TopNavImpl & {
  Item: <C extends ElementType = "a">(props: TopNavItemProps<C>) => ReactElement;
};

/**
 * An app's horizontal navigation: a `<nav>` landmark holding a row of `TopNav.Item` links between
 * an optional `start` and `end` slot. The items that the row has no width for collapse from its
 * end into an overflow `Menu`, where each is a `Menu.LinkItem` — a real link to the same
 * destination. What fits is measured on the rendered row and re-measured whenever the space
 * between the slots changes or the items do, so the row always shows as many items as it has room
 * for, and at least one. The slots never collapse.
 *
 * The consumer marks the current item with `current`, which sets `aria-current="page"` on its link
 * and on its overflow menu row; the nav never reads the location. While the current item is
 * collapsed, the overflow trigger carries the selected style.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `TopNav` export is tree-shaken out entirely instead of keeping the whole module "just
// in case" `Object.assign` does something observable.
export const TopNav = /* @__PURE__ */ Object.assign(TopNavImpl, {
  Item: TopNavItem,
}) as TopNavComponent;
