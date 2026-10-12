import { PanelLeftClose, PanelLeftOpen } from "@vipengele/react-icons";
import {
  type ButtonHTMLAttributes,
  type ComponentPropsWithoutRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
  type Ref,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useState,
} from "react";
import { Disclosure } from "../Disclosure/Disclosure.js";
import { useControllableState } from "../internal/useControllableState.js";
import { useMediaQuery } from "../internal/useMediaQuery.js";
import { Popover } from "../Popover/Popover.js";
import { Tooltip } from "../Tooltip/Tooltip.js";
import { sideNavStylesheet } from "./SideNav.stylesheet.js";
import {
  SideNavContext,
  SideNavCurrentContext,
  SideNavFlyoutContext,
  SideNavLevelContext,
  type SideNavMobileState,
  SideNavProviderContext,
  SideNavRailContext,
  type SideNavReportCurrent,
  useSideNavContext,
} from "./sideNavContext.js";

/** A row's inline start padding: one step of the spacing scale, plus one more per section level. */
function indent(level: number): CSSProperties {
  return { paddingInlineStart: `calc(var(--vpg-space-3) + ${level} * var(--vpg-space-4))` };
}

function classNames(...names: (string | false | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}

/** The narrow-viewport state's props, taken by `SideNav.Provider` or, with no provider around it,
 * by `SideNav` itself. */
interface SideNavMobileProps {
  /** Whether the navigation is open below `mobileBelow`. Setting it makes the mobile open state
   * controlled. */
  mobileOpen?: boolean;
  /** The initial mobile open state when uncontrolled. Defaults to `false`. */
  defaultMobileOpen?: boolean;
  /** Called with the requested mobile open state on every change, in both modes. */
  onMobileOpenChange?: (open: boolean) => void;
  /** The CSS length below which the viewport counts as narrow, matched as `(width < mobileBelow)`.
   * Defaults to `"48rem"`. */
  mobileBelow?: string;
}

const MOBILE_PROPS = [
  "mobileOpen",
  "defaultMobileOpen",
  "onMobileOpenChange",
  "mobileBelow",
] as const satisfies readonly (keyof SideNavMobileProps)[];

const DEFAULT_MOBILE_BELOW = "48rem";

function useSideNavMobileState({
  mobileOpen,
  defaultMobileOpen = false,
  onMobileOpenChange,
  mobileBelow = DEFAULT_MOBILE_BELOW,
}: SideNavMobileProps): SideNavMobileState {
  const [open, setOpen] = useControllableState(mobileOpen, () => defaultMobileOpen, onMobileOpenChange);
  const mobile = useMediaQuery(`(width < ${mobileBelow})`);
  const drawerId = useId();
  return { mobile, open, setOpen, drawerId, mobileBelow, mobileBelowIsDefault: mobileBelow === DEFAULT_MOBILE_BELOW };
}

export interface SideNavProps extends Omit<HTMLAttributes<HTMLElement>, "aria-label">, SideNavMobileProps {
  /** Whether the nav is the icon-only rail. Setting it makes the collapse state controlled. */
  collapsed?: boolean;
  /** The initial collapse state when uncontrolled. Defaults to `false`, the docked nav. */
  defaultCollapsed?: boolean;
  /** Called with the requested collapse state on every toggle, in both modes. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** The landmark's accessible name. Defaults to `"Main"`. */
  "aria-label"?: string;
  /** A ref to the `<nav>`. */
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
}

type SideNavBodyProps = Omit<SideNavProps, keyof SideNavMobileProps> & { mobile: SideNavMobileState };

/**
 * Inside a `SideNav.Provider` the nav renders from the provider's state, and a mobile prop on the
 * nav as well is an error: two owners of one open state would disagree as soon as either changed.
 * Without a provider the nav owns that state itself.
 */
function SideNavImpl({ mobileOpen, defaultMobileOpen, onMobileOpenChange, mobileBelow, ...rest }: SideNavProps) {
  const provided = useContext(SideNavProviderContext);
  const mobileProps: SideNavMobileProps = { mobileOpen, defaultMobileOpen, onMobileOpenChange, mobileBelow };
  if (provided === null) {
    return <SideNavOwnMobileState {...rest} mobileProps={mobileProps} />;
  }
  const conflicting = MOBILE_PROPS.find((name) => mobileProps[name] !== undefined);
  if (conflicting !== undefined) {
    throw new Error(`SideNav received \`${conflicting}\` inside <SideNav.Provider>, which owns the mobile state: pass it to the Provider.`);
  }
  return <SideNavBody {...rest} mobile={provided} />;
}

function SideNavOwnMobileState({ mobileProps, ...rest }: Omit<SideNavBodyProps, "mobile"> & { mobileProps: SideNavMobileProps }) {
  const mobile = useSideNavMobileState(mobileProps);
  return <SideNavBody {...rest} mobile={mobile} />;
}

function SideNavBody({
  collapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  "aria-label": ariaLabel = "Main",
  id,
  className,
  children,
  ref,
  mobile,
  ...rest
}: SideNavBodyProps) {
  const [isCollapsed, setCollapsed] = useControllableState(collapsed, () => defaultCollapsed, onCollapsedChange);
  const generatedId = useId();
  const navId = id ?? generatedId;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N side navs on a page inject one
        stylesheet.
      */}
      <style href="vpg-side-nav" precedence="vpg-side-nav">
        {sideNavStylesheet}
      </style>
      <nav
        {...rest}
        ref={ref}
        id={navId}
        aria-label={ariaLabel}
        className={classNames("vpg-side-nav", isCollapsed && "vpg-side-nav-collapsed", className)}
      >
        <SideNavContext.Provider value={{ collapsed: isCollapsed, setCollapsed, navId, mobile }}>
          <SideNavRailContext.Provider value={isCollapsed}>
            <SideNavLevelContext.Provider value={0}>{children}</SideNavLevelContext.Provider>
          </SideNavRailContext.Provider>
        </SideNavContext.Provider>
      </nav>
    </>
  );
}

export interface SideNavProviderProps extends SideNavMobileProps {
  children?: ReactNode;
}

/**
 * Owns the narrow-viewport state — the mobile open state, whether the viewport is below
 * `mobileBelow`, and the id of the narrow-viewport container — for a `SideNav` and the parts a
 * consumer places outside it, in their own header. Place it above both. A `SideNav` inside it
 * takes no mobile props of its own.
 */
function SideNavProvider({ children, ...mobileProps }: SideNavProviderProps) {
  const mobile = useSideNavMobileState(mobileProps);
  return <SideNavProviderContext.Provider value={mobile}>{children}</SideNavProviderContext.Provider>;
}

interface SideNavItemOwnProps<C extends ElementType> {
  /** The item's icon, the only thing the rail shows. Hidden from assistive tech: the label names
   * the item. */
  icon: ReactNode;
  /** The item's text. Visible in the docked nav and a flyout; in the rail it stays the item's
   * accessible name, visually hidden, and shows as a tooltip. */
  label: ReactNode;
  /** The item is the page the user is on: sets `aria-current="page"` and the selected style, and
   * opens every enclosing section. The nav never reads the location itself. */
  current?: boolean;
  /** A ref to the rendered element — the `<a>`, or whatever `as` renders. */
  ref?: ComponentPropsWithRef<C>["ref"];
  className?: string;
}

/**
 * `as` swaps the rendered element for another — typically a router's own link component — while
 * keeping the item's styling; every other prop is forwarded to it untouched.
 */
export type SideNavItemProps<C extends ElementType = "a"> = SideNavItemOwnProps<C> & {
  as?: C;
} & Omit<ComponentPropsWithoutRef<C>, keyof SideNavItemOwnProps<C> | "as" | "children">;

/** The props an item reads off the forwarded ones rather than only passing through. */
interface ItemForwardedProps {
  style?: CSSProperties;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
}

function SideNavItem<C extends ElementType = "a">({ as, icon, label, current = false, className, ...rest }: SideNavItemProps<C>) {
  useSideNavContext("SideNav.Item");
  const rail = useContext(SideNavRailContext);
  const level = useContext(SideNavLevelContext);
  const reportCurrent = useContext(SideNavCurrentContext);
  const closeFlyout = useContext(SideNavFlyoutContext);
  const itemId = useId();
  const Component: ElementType = as ?? "a";
  const { style, onClick, ...forwarded } = rest as ItemForwardedProps & Record<string, unknown>;

  // A layout effect, so a section opens for its current item before the first paint.
  useLayoutEffect(() => {
    if (!current || reportCurrent === null) return;
    reportCurrent(itemId, true);
    return () => reportCurrent(itemId, false);
  }, [current, itemId, reportCurrent]);

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    onClick?.(event);
    closeFlyout?.();
  };

  // The item is the tooltip's only child but is passed inside a fragment, so `Tooltip` puts its
  // `aria-describedby` on its own wrapper rather than cloning it onto the item: the label already
  // names the item, and describing it with the same text would announce it twice.
  return (
    <Tooltip content={label} placement="right" disabled={!rail}>
      {/* biome-ignore lint/complexity/noUselessFragments: the fragment keeps Tooltip from cloning aria-describedby onto the item */}
      <>
        <Component
          {...forwarded}
          className={classNames("vpg-side-nav-row", "vpg-side-nav-item", rail && "vpg-side-nav-row-rail", className)}
          style={rail ? style : { ...style, ...indent(level) }}
          aria-current={current ? "page" : undefined}
          onClick={handleClick}
        >
          <span className="vpg-side-nav-icon" aria-hidden="true">
            {icon}
          </span>
          <span className={rail ? "vpg-side-nav-visually-hidden" : "vpg-side-nav-label"}>{label}</span>
        </Component>
      </>
    </Tooltip>
  );
}

export interface SideNavSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The section's heading. A group shows it as a muted heading above its rows, and names the
   * group to assistive tech in both modes. A collapsible section shows it as its trigger's content
   * in the docked nav, as its icon button's accessible name and tooltip in the rail, and as its
   * flyout's label. */
  label: ReactNode;
  /** Makes the section a disclosure that opens and closes in the docked nav, and a single icon
   * button opening a flyout of its rows in the rail. Without it the section is a group: a heading
   * above rows that are always visible, in the rail too. Defaults to `false`. */
  collapsible?: boolean;
  /** Collapsible only. Shown before the label in the docked nav, and alone as the section's button
   * in the rail. */
  icon?: ReactNode;
  /** Collapsible only. Whether the section is open in the docked nav. Setting it makes the section
   * controlled, and it then opens only when this prop changes, including when a descendant becomes
   * current. */
  open?: boolean;
  /** Collapsible only. The initial open state when uncontrolled. */
  defaultOpen?: boolean;
  /** Collapsible only. Called with the requested open state on every toggle of the docked section. */
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

/**
 * Tracks which descendant items are current, through the ids they report, and forwards every
 * report to the enclosing section.
 */
function useCurrentDescendants(): [boolean, SideNavReportCurrent] {
  const parentReport = useContext(SideNavCurrentContext);
  const [currentIds, setCurrentIds] = useState<ReadonlySet<string>>(() => new Set());

  const report = useCallback(
    (id: string, current: boolean) => {
      setCurrentIds((previous) => {
        const next = new Set(previous);
        if (current) {
          next.add(id);
        } else {
          next.delete(id);
        }
        return next;
      });
      parentReport?.(id, current);
    },
    [parentReport],
  );

  return [currentIds.size > 0, report];
}

type CollapsibleSectionProps = Omit<SideNavSectionProps, "collapsible">;

function CollapsibleSection({
  label,
  icon,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ...rest
}: CollapsibleSectionProps) {
  const rail = useContext(SideNavRailContext);
  const level = useContext(SideNavLevelContext);
  const [containsCurrent, reportCurrent] = useCurrentDescendants();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;

  // Opens when a descendant becomes current, and on nothing else: the section never closes
  // itself, and a section the user closed around a current item stays closed until the current
  // item leaves it and a descendant becomes current again. An item that remounts in the same
  // commit, as every row does when the nav switches between docked and rail, never empties the
  // set, so it doesn't count.
  useLayoutEffect(() => {
    if (containsCurrent) setUncontrolledOpen(true);
  }, [containsCurrent]);

  const requestOpenChange = (next: boolean) => {
    onOpenChange?.(next);
    if (open === undefined) setUncontrolledOpen(next);
  };

  // The rail and docked presentations are different subtrees at the same position, so switching
  // between them remounts everything below this section. This section's own open state lives
  // above the switch and survives it; a nested section's uncontrolled state does not, and starts
  // again from its `defaultOpen` and whatever current item it holds.
  if (rail) {
    return (
      <RailSection
        {...rest}
        label={label}
        icon={icon}
        containsCurrent={containsCurrent}
        reportCurrent={reportCurrent}
        className={className}
      >
        {children}
      </RailSection>
    );
  }

  return (
    <Disclosure
      {...rest}
      className={classNames("vpg-side-nav-section", className)}
      label={
        <span className="vpg-side-nav-section-label" style={indent(level)}>
          {icon === undefined ? null : (
            <span className="vpg-side-nav-icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="vpg-side-nav-label">{label}</span>
        </span>
      }
      open={isOpen}
      onOpenChange={requestOpenChange}
    >
      <div className="vpg-side-nav-group">
        <SideNavCurrentContext.Provider value={reportCurrent}>
          <SideNavLevelContext.Provider value={level + 1}>{children}</SideNavLevelContext.Provider>
        </SideNavCurrentContext.Provider>
      </div>
    </Disclosure>
  );
}

type GroupSectionProps = Omit<SideNavSectionProps, "collapsible" | "icon" | "open" | "defaultOpen" | "onOpenChange">;

/**
 * A section that is a labelled group: a heading above rows that are always visible. The rows sit
 * at the group's own level, so they line up with its heading. In the rail the heading is visually
 * hidden, still naming the group, and a rule above the group separates it from the rows before it.
 */
function GroupSection({ label, className, children, ...rest }: GroupSectionProps) {
  const rail = useContext(SideNavRailContext);
  const level = useContext(SideNavLevelContext);
  const headingId = useId();

  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> groups form controls; this groups links, which only the group role labels without a form's semantics
    <div
      {...rest}
      role="group"
      aria-labelledby={headingId}
      className={classNames("vpg-side-nav-section", "vpg-side-nav-section-group", rail && "vpg-side-nav-section-group-rail", className)}
    >
      <div
        id={headingId}
        className={rail ? "vpg-side-nav-visually-hidden" : "vpg-side-nav-section-heading"}
        style={rail ? undefined : indent(level)}
      >
        {label}
      </div>
      <div className="vpg-side-nav-group">{children}</div>
    </div>
  );
}

function SideNavSection({ collapsible = false, icon, open, defaultOpen, onOpenChange, ...rest }: SideNavSectionProps) {
  useSideNavContext("SideNav.Section");
  if (collapsible) {
    return <CollapsibleSection {...rest} icon={icon} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} />;
  }
  return <GroupSection {...rest} />;
}

interface RailSectionProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  label: ReactNode;
  icon: ReactNode;
  containsCurrent: boolean;
  reportCurrent: SideNavReportCurrent;
  children: ReactNode;
}

/**
 * A section in the rail: one icon button opening a non-modal flyout of the section's rows, which
 * render docked inside it. While the flyout is closed the rows are mounted in a hidden container
 * instead, so their `current` still reaches this section and the sections around it.
 */
function RailSection({ label, icon, containsCurrent, reportCurrent, className, children, ...rest }: RailSectionProps) {
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const flyoutLabelId = useId();
  const closeFlyout = useCallback(() => setFlyoutOpen(false), []);

  const rows = (
    <SideNavCurrentContext.Provider value={reportCurrent}>
      <SideNavRailContext.Provider value={false}>
        <SideNavLevelContext.Provider value={0}>{children}</SideNavLevelContext.Provider>
      </SideNavRailContext.Provider>
    </SideNavCurrentContext.Provider>
  );

  const flyout = (
    <SideNavFlyoutContext.Provider value={closeFlyout}>
      {/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> groups form controls; this groups links, which only the group role labels without a form's semantics */}
      <div className="vpg-side-nav-group" role="group" aria-labelledby={flyoutLabelId}>
        <div id={flyoutLabelId} className="vpg-side-nav-flyout-label">
          {label}
        </div>
        {rows}
      </div>
    </SideNavFlyoutContext.Provider>
  );

  return (
    <div {...rest} className={classNames("vpg-side-nav-section", "vpg-side-nav-section-rail", className)}>
      <Popover
        modal={false}
        placement="right"
        open={flyoutOpen}
        onOpenChange={setFlyoutOpen}
        className="vpg-side-nav-flyout"
        content={flyout}
      >
        {/* The tooltip would cover the flyout it sits beside, so it is off while that is open. */}
        <Tooltip content={label} placement="right" disabled={flyoutOpen}>
          {/* biome-ignore lint/complexity/noUselessFragments: the fragment keeps Tooltip from cloning aria-describedby onto the button, whose label already names it */}
          <>
            <button
              type="button"
              className={classNames(
                "vpg-side-nav-row",
                "vpg-side-nav-row-rail",
                "vpg-side-nav-section-trigger",
                containsCurrent && "vpg-side-nav-section-trigger-current",
              )}
              aria-expanded={flyoutOpen}
            >
              <span className="vpg-side-nav-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="vpg-side-nav-visually-hidden">{label}</span>
            </button>
          </>
        </Tooltip>
      </Popover>
      {flyoutOpen ? null : <div hidden>{rows}</div>}
    </div>
  );
}

export interface SideNavCollapseToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Where the toggle sits in the nav. `"top"` leaves it where it is rendered. `"bottom"` pins it
   * to the end of the nav, so a nav that fills its container's height holds it at the container's
   * bottom edge; render it last, so the focus order matches. Defaults to `"top"`. */
  placement?: "top" | "bottom";
  /** The button's text and accessible name. Visible in the docked nav; in the rail it is visually
   * hidden and shows as a tooltip. Defaults to `"Toggle navigation"`. */
  label?: ReactNode;
  /** A ref to the `<button>`. */
  ref?: Ref<HTMLButtonElement>;
}

function SideNavCollapseToggle({
  label = "Toggle navigation",
  placement = "top",
  className,
  onClick,
  ref,
  ...rest
}: SideNavCollapseToggleProps) {
  const { collapsed, setCollapsed, navId } = useSideNavContext("SideNav.CollapseToggle");
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    setCollapsed(!collapsed);
  };

  // Always wrapped, with the tooltip disabled while docked, so the button keeps its DOM node,
  // and with it the focus, across the toggle it performs.
  return (
    <Tooltip content={label} placement="right" disabled={!collapsed}>
      {/* biome-ignore lint/complexity/noUselessFragments: the fragment keeps Tooltip from cloning aria-describedby onto the button, whose label already names it */}
      <>
        <button
          type="button"
          {...rest}
          ref={ref}
          className={classNames(
            "vpg-side-nav-row",
            "vpg-side-nav-collapse-toggle",
            placement === "bottom" && "vpg-side-nav-collapse-toggle-bottom",
            collapsed && "vpg-side-nav-row-rail",
            className,
          )}
          aria-expanded={!collapsed}
          aria-controls={navId}
          onClick={handleClick}
        >
          <span className="vpg-side-nav-icon" aria-hidden="true">
            <ToggleIcon />
          </span>
          <span className={collapsed ? "vpg-side-nav-visually-hidden" : "vpg-side-nav-label"}>{label}</span>
        </button>
      </>
    </Tooltip>
  );
}

type SideNavComponent = typeof SideNavImpl & {
  Item: typeof SideNavItem;
  Section: typeof SideNavSection;
  CollapseToggle: typeof SideNavCollapseToggle;
  Provider: typeof SideNavProvider;
};

/**
 * An app's vertical navigation: `SideNav.Item` links, gathered under `SideNav.Section`s nested to
 * any depth, and a `SideNav.CollapseToggle` switching the nav between the docked nav and the
 * icon-only rail, which sits where it is rendered or, with `placement="bottom"`, at the bottom
 * of the nav. Collapse is controlled through `collapsed`/`onCollapsedChange` or left to the
 * nav itself, seeded by `defaultCollapsed`; nothing collapses it on its own.
 *
 * The consumer marks the current item with `current`: the nav never reads the location. A section
 * is a labelled group by default: a muted heading above rows that are always visible, and in the
 * rail a rule above the group with its icon-only rows. A `collapsible` section opens when an item
 * inside it becomes current, and otherwise only on its own trigger. Docked, it is a `Disclosure`,
 * independent of its siblings, indenting its rows one step per level. In the rail each item is its
 * icon with its label as a tooltip, and each top-level collapsible section is one icon button
 * opening a non-modal `Popover` flyout of its rows, which closes when one is activated or on
 * `Escape`, returning focus to the button. Every row is a plain tab stop.
 *
 * Whether the viewport is narrower than `mobileBelow`, and the mobile open state, are owned by a
 * `SideNav.Provider` placed above the nav and the app's header, or by the nav itself when no
 * provider surrounds it: `mobileOpen`/`onMobileOpenChange` control it, `defaultMobileOpen` seeds it.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `SideNav` export is tree-shaken out entirely instead of keeping the whole module "just
// in case" `Object.assign` does something observable.
export const SideNav = /* @__PURE__ */ Object.assign(SideNavImpl, {
  Item: SideNavItem,
  Section: SideNavSection,
  CollapseToggle: SideNavCollapseToggle,
  Provider: SideNavProvider,
}) as SideNavComponent;
