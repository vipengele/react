import { createContext, useContext } from "react";

export interface SideNavContextValue {
  /** Whether the nav is the icon-only rail. */
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  /** The `<nav>`'s id, which `SideNav.CollapseToggle` names in `aria-controls`. */
  navId: string;
}

/** The root's collapse state. `SideNav.Item`, `SideNav.Section` and `SideNav.CollapseToggle`
 * are arranged by the consumer, so it can't reach them as props. */
export const SideNavContext = createContext<SideNavContextValue | null>(null);

export function useSideNavContext(component: string): SideNavContextValue {
  const context = useContext(SideNavContext);
  if (context === null) {
    throw new Error(`${component} must be rendered inside <SideNav>.`);
  }
  return context;
}

/**
 * Whether the rows here render icon-only. It follows `collapsed` directly under the root, and is
 * `false` inside a rail section's flyout, whose rows show their labels whatever the root's state.
 */
export const SideNavRailContext = createContext(false);

/** How many sections deep the rows here sit: `0` at the root and at the top of a flyout. Each
 * level indents a row by one step. */
export const SideNavLevelContext = createContext(0);

/**
 * Reports an item's `current` state to the nearest enclosing `SideNav.Section`, keyed by an id
 * unique to the item. A section forwards every report to the section around it, so each one
 * knows whether any descendant is current however deeply, or inside whatever wrappers, it sits.
 * `null` outside every section.
 */
export type SideNavReportCurrent = (id: string, current: boolean) => void;

export const SideNavCurrentContext = createContext<SideNavReportCurrent | null>(null);

/** Closes the rail flyout the rows here sit in, so activating an item dismisses it. `null`
 * outside a flyout. */
export const SideNavFlyoutContext = createContext<(() => void) | null>(null);
