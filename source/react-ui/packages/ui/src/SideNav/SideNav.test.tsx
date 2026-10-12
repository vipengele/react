import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ComponentPropsWithRef, createRef, type MouseEvent, type ReactNode, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { setViewportWidth } from "../vitest.setup.js";
import { SideNav } from "./SideNav.js";
import { sideNavStylesheet } from "./SideNav.stylesheet.js";
import { type SideNavMobileState, useSideNavContext, useSideNavProviderContext } from "./sideNavContext.js";

/** Renders a nav inside a `.vpg-root`, the subtree `ThemeProvider` establishes and the one its
 * tooltips and flyouts portal into. */
function renderThemed(ui: ReactNode) {
  return render(<div className="vpg-root">{ui}</div>);
}

function nav() {
  return screen.getByRole("navigation");
}

/** A row by its label. Rows inside a closed section or a closed flyout sit in a hidden
 * container, out of the accessibility tree, so the query includes hidden elements. */
function link(name: string) {
  return screen.getByRole("link", { name, hidden: true });
}

/** A section's trigger, docked or rail. */
function sectionTrigger(name: string) {
  return screen.getByRole("button", { name });
}

/** The wrapper `<span>` carrying a tooltip's hover and focus handlers — `mouseenter` does not
 * bubble, so firing it on the wrapped row would never reach them. */
function tooltipTrigger(element: HTMLElement): HTMLElement {
  const wrapper = element.closest<HTMLElement>(".vpg-tooltip-trigger");
  if (wrapper === null) {
    throw new Error("the row is not wrapped in a tooltip trigger");
  }
  return wrapper;
}

/** The wrapper `<span>` carrying a rail section's click handler. */
function flyoutTrigger(name: string): HTMLElement {
  const wrapper = sectionTrigger(name).closest<HTMLElement>(".vpg-popover-trigger");
  if (wrapper === null) {
    throw new Error("the section trigger is not wrapped in a popover trigger");
  }
  return wrapper;
}

function flyout(name: string) {
  return screen.queryByRole("group", { name });
}

const icon = <svg data-testid="icon" />;

/** Renders a narrow-viewport state as data attributes, with a button requesting the opposite open
 * state, so a test reads the state no presentation shows. */
function MobileStateView({ state, testId }: { state: SideNavMobileState; testId: string }) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-mobile={String(state.mobile)}
      data-open={String(state.open)}
      data-drawer-id={state.drawerId}
      data-mobile-below={state.mobileBelow}
      data-mobile-below-default={String(state.mobileBelowIsDefault)}
      onClick={() => state.setOpen(!state.open)}
    />
  );
}

/** The state a nav renders from, read inside it. */
function NavMobileProbe() {
  return <MobileStateView state={useSideNavContext("NavMobileProbe").mobile} testId="nav-mobile" />;
}

/** The state a `SideNav.Provider` owns, read outside the nav. */
function ProviderMobileProbe() {
  return <MobileStateView state={useSideNavProviderContext("ProviderMobileProbe")} testId="provider-mobile" />;
}

function navMobile() {
  return screen.getByTestId("nav-mobile");
}

function providerMobile() {
  return screen.getByTestId("provider-mobile");
}

function RouterLink({ to, ...props }: ComponentPropsWithRef<"a"> & { to: string }) {
  return <a href={to} data-router-link="" {...props} />;
}

describe("SideNav", () => {
  describe("the landmark", () => {
    it("renders a nav named Main by default, with a generated id", () => {
      renderThemed(<SideNav />);
      expect(nav()).toHaveAccessibleName("Main");
      expect(nav().id).not.toBe("");
      expect(nav()).toHaveClass("vpg-side-nav");
      expect(nav()).not.toHaveClass("vpg-side-nav-collapsed");
    });

    it("takes a custom id, aria-label, className and other props", () => {
      renderThemed(<SideNav id="app-nav" aria-label="Primary" className="custom" data-testid="nav" />);
      expect(nav()).toHaveAttribute("id", "app-nav");
      expect(nav()).toHaveAccessibleName("Primary");
      expect(nav()).toHaveClass("vpg-side-nav", "custom");
      expect(nav()).toHaveAttribute("data-testid", "nav");
    });

    it("forwards its ref to the nav element", () => {
      const ref = createRef<HTMLElement>();
      renderThemed(<SideNav ref={ref} />);
      expect(ref.current).toBe(nav());
    });

    it("injects its stylesheet", () => {
      renderThemed(<SideNav />);
      expect(document.querySelector('style[data-href="vpg-side-nav"], style[href="vpg-side-nav"]')).not.toBeNull();
    });
  });

  describe("collapse", () => {
    it("toggles between the docked nav and the rail when uncontrolled", () => {
      const onCollapsedChange = vi.fn();
      renderThemed(
        <SideNav onCollapsedChange={onCollapsedChange}>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      const toggle = sectionTrigger("Toggle navigation");
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(toggle).toHaveAttribute("aria-controls", nav().id);

      fireEvent.click(toggle);
      expect(nav()).toHaveClass("vpg-side-nav-collapsed");
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(onCollapsedChange).toHaveBeenLastCalledWith(true);

      fireEvent.click(toggle);
      expect(nav()).not.toHaveClass("vpg-side-nav-collapsed");
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    });

    it("toggles without an onCollapsedChange", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      fireEvent.click(sectionTrigger("Toggle navigation"));
      expect(nav()).toHaveClass("vpg-side-nav-collapsed");
    });

    it("starts as the rail with defaultCollapsed", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      expect(nav()).toHaveClass("vpg-side-nav-collapsed");
      expect(sectionTrigger("Toggle navigation")).toHaveAttribute("aria-expanded", "false");
    });

    it("follows collapsed when controlled, reporting toggles without changing state itself", () => {
      const onCollapsedChange = vi.fn();
      const { rerender } = renderThemed(
        <SideNav collapsed={false} onCollapsedChange={onCollapsedChange}>
          <SideNav.CollapseToggle />
        </SideNav>,
      );

      fireEvent.click(sectionTrigger("Toggle navigation"));
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
      expect(nav()).not.toHaveClass("vpg-side-nav-collapsed");

      rerender(
        <div className="vpg-root">
          <SideNav collapsed onCollapsedChange={onCollapsedChange}>
            <SideNav.CollapseToggle />
          </SideNav>
        </div>,
      );
      expect(nav()).toHaveClass("vpg-side-nav-collapsed");
      expect(sectionTrigger("Toggle navigation")).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("SideNav.CollapseToggle", () => {
    it("shows its default label docked", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      const toggle = sectionTrigger("Toggle navigation");
      expect(toggle).toHaveAttribute("type", "button");
      expect(toggle).toHaveClass("vpg-side-nav-row", "vpg-side-nav-collapse-toggle");
      expect(toggle).not.toHaveClass("vpg-side-nav-row-rail");
      expect(toggle.querySelector(".vpg-side-nav-label")).toHaveTextContent("Toggle navigation");
      expect(toggle.querySelector(".vpg-side-nav-icon")).toHaveAttribute("aria-hidden", "true");
      expect(toggle.querySelector(".vpg-side-nav-icon svg")).not.toBeNull();
    });

    it("takes a custom label, className, other props and a ref, and calls the consumer's onClick", () => {
      const ref = createRef<HTMLButtonElement>();
      const onClick = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle label="Collapse" className="custom" data-testid="toggle" ref={ref} onClick={onClick} />
        </SideNav>,
      );
      const toggle = sectionTrigger("Collapse");
      expect(ref.current).toBe(toggle);
      expect(toggle).toHaveClass("vpg-side-nav-collapse-toggle", "custom");
      expect(toggle).toHaveAttribute("data-testid", "toggle");

      fireEvent.click(toggle);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(nav()).toHaveClass("vpg-side-nav-collapsed");
    });

    it("hides its label visually in the rail and shows it as a tooltip", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      const toggle = sectionTrigger("Toggle navigation");
      expect(toggle).toHaveClass("vpg-side-nav-row-rail");
      expect(toggle.querySelector(".vpg-side-nav-visually-hidden")).toHaveTextContent("Toggle navigation");
      expect(toggle.querySelector(".vpg-side-nav-label")).toBeNull();

      fireEvent.mouseEnter(tooltipTrigger(toggle));
      expect(screen.getByRole("tooltip")).toHaveTextContent("Toggle navigation");
      fireEvent.mouseLeave(tooltipTrigger(toggle));
      await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    });

    it("shows no tooltip docked", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      fireEvent.mouseEnter(tooltipTrigger(sectionTrigger("Toggle navigation")));
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("keeps focus on the same button across the toggle it performs", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      const toggle = sectionTrigger("Toggle navigation");
      toggle.focus();

      fireEvent.click(toggle);
      expect(sectionTrigger("Toggle navigation")).toBe(toggle);
      expect(toggle).toHaveFocus();

      fireEvent.click(toggle);
      expect(sectionTrigger("Toggle navigation")).toBe(toggle);
      expect(toggle).toHaveFocus();
    });

    it("shows the panel-close icon docked and the panel-open icon in the rail", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
        </SideNav>,
      );
      const toggle = sectionTrigger("Toggle navigation");
      expect(toggle.querySelector("svg.lucide-panel-left-close")).not.toBeNull();

      fireEvent.click(toggle);
      expect(toggle.querySelector("svg.lucide-panel-left-open")).not.toBeNull();
      expect(toggle.querySelector("svg.lucide-panel-left-close")).toBeNull();
    });

    it("stays where it is rendered by default and with placement top", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle label="Default" />
          <SideNav.CollapseToggle label="Top" placement="top" />
        </SideNav>,
      );
      expect(sectionTrigger("Default")).not.toHaveClass("vpg-side-nav-collapse-toggle-bottom");
      expect(sectionTrigger("Top")).not.toHaveClass("vpg-side-nav-collapse-toggle-bottom");
    });

    it("marks itself for the end of the nav with placement bottom, docked and in the rail", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          <SideNav.CollapseToggle placement="bottom" />
        </SideNav>,
      );
      const toggle = sectionTrigger("Toggle navigation");
      expect(toggle).toHaveClass("vpg-side-nav-collapse-toggle-bottom");
      expect(toggle.parentElement).toBe(nav().lastElementChild);

      fireEvent.click(toggle);
      expect(toggle).toHaveClass("vpg-side-nav-collapse-toggle-bottom", "vpg-side-nav-row-rail");
    });
  });

  describe("SideNav.Item", () => {
    it("renders a link with its icon hidden from assistive tech and its label visible", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
        </SideNav>,
      );
      const item = link("Inbox");
      expect(item.tagName).toBe("A");
      expect(item).toHaveAttribute("href", "#inbox");
      expect(item).toHaveClass("vpg-side-nav-row", "vpg-side-nav-item");
      expect(item).not.toHaveClass("vpg-side-nav-row-rail");
      expect(item).not.toHaveAttribute("aria-current");
      expect(item.querySelector(".vpg-side-nav-icon")).toHaveAttribute("aria-hidden", "true");
      expect(item.querySelector(".vpg-side-nav-icon [data-testid='icon']")).not.toBeNull();
      expect(item.querySelector(".vpg-side-nav-label")).toHaveTextContent("Inbox");
    });

    it("marks the current item with aria-current page", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
          <SideNav.Item href="#sent" icon={icon} label="Sent" />
        </SideNav>,
      );
      expect(link("Inbox")).toHaveAttribute("aria-current", "page");
      expect(link("Sent")).not.toHaveAttribute("aria-current");
    });

    it("forwards its ref, className and other props, and calls the consumer's onClick", () => {
      const ref = createRef<HTMLAnchorElement>();
      const onClick = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" ref={ref} className="custom" data-testid="inbox" onClick={onClick} />
        </SideNav>,
      );
      const item = link("Inbox");
      expect(ref.current).toBe(item);
      expect(item).toHaveClass("vpg-side-nav-item", "custom");
      expect(item).toHaveAttribute("data-testid", "inbox");

      fireEvent.click(item);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("merges the consumer's style with its indent", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" style={{ color: "red" }} />
        </SideNav>,
      );
      const item = link("Inbox");
      expect(item.style.color).toBe("red");
      expect(item.style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 0 * var(--vpg-space-4))");
    });

    it("renders a custom component through as, forwarding its props", () => {
      const onClick = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.Item as={RouterLink} to="#settings" icon={icon} label="Settings" current onClick={onClick} />
        </SideNav>,
      );
      const item = link("Settings");
      expect(item).toHaveAttribute("data-router-link");
      expect(item).toHaveAttribute("href", "#settings");
      expect(item).toHaveAttribute("aria-current", "page");
      expect(item).toHaveClass("vpg-side-nav-item");

      fireEvent.click(item);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("renders a button through as", () => {
      const onClick = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.Item as="button" type="button" icon={icon} label="Sign out" onClick={onClick} />
        </SideNav>,
      );
      const item = screen.getByRole("button", { name: "Sign out" });
      expect(item).toHaveAttribute("type", "button");
      expect(item).toHaveClass("vpg-side-nav-row", "vpg-side-nav-item");

      fireEvent.click(item);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("indents a row one step per enclosing section", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section collapsible label="Folders" defaultOpen>
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      expect(link("Home").style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 0 * var(--vpg-space-4))");
      expect(link("Inbox").style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 1 * var(--vpg-space-4))");
      expect(link("Work").style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 2 * var(--vpg-space-4))");
    });

    it("indents a section's trigger at its own level", () => {
      const { container } = renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" defaultOpen>
            <SideNav.Section collapsible label="Folders">
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      const labels = container.querySelectorAll<HTMLElement>(".vpg-side-nav-section-label");
      expect(labels[0]?.style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 0 * var(--vpg-space-4))");
      expect(labels[1]?.style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 1 * var(--vpg-space-4))");
    });

    it("shows no tooltip docked", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
        </SideNav>,
      );
      fireEvent.mouseEnter(tooltipTrigger(link("Inbox")));
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("SideNav.Section as a group", () => {
    it("shows a heading above rows that are always visible, with no trigger", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section label="Workspace" className="custom" data-testid="section">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Item href="#sent" icon={icon} label="Sent" />
          </SideNav.Section>
        </SideNav>,
      );
      const group = screen.getByRole("group", { name: "Workspace" });
      expect(group).toHaveAttribute("data-testid", "section");
      expect(group).toHaveClass("vpg-side-nav-section", "vpg-side-nav-section-group", "custom");
      expect(group).not.toHaveClass("vpg-side-nav-section-group-rail");

      const heading = group.firstElementChild;
      expect(heading).toHaveClass("vpg-side-nav-section-heading");
      expect(heading).toHaveTextContent("Workspace");
      expect(heading?.id).toBe(group.getAttribute("aria-labelledby"));
      expect(screen.queryByRole("button", { name: "Workspace" })).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Inbox" })).toBeVisible();
      expect(screen.getByRole("link", { name: "Sent" })).toBeVisible();
    });

    it("lines its heading up with its rows at the level it sits at", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible defaultOpen label="Mail">
            <SideNav.Section label="Folders">
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      const heading = screen.getByRole("group", { name: "Folders" }).firstElementChild as HTMLElement;
      const row = screen.getByRole("link", { name: "Inbox" });
      expect(heading.style.paddingInlineStart).toBe(row.style.paddingInlineStart);
      expect(heading.style.paddingInlineStart).toContain("1 *");
    });

    it("ignores the props only a collapsible section reads", () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.Section label="Workspace" icon={icon} open={false} defaultOpen onOpenChange={onOpenChange}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      expect(screen.getByRole("link", { name: "Inbox" })).toBeVisible();
      expect(screen.getByRole("group", { name: "Workspace" }).querySelector(".vpg-side-nav-section-heading svg")).toBeNull();
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("reports a current row inside it to the collapsible section around it", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail">
            <SideNav.Section label="Folders">
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
    });

    it("keeps its rows as icon-only rows in the rail, its heading hidden and named for assistive tech", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section label="Workspace">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const group = screen.getByRole("group", { name: "Workspace" });
      expect(group).toHaveClass("vpg-side-nav-section-group-rail");
      expect(group.firstElementChild).toHaveClass("vpg-side-nav-visually-hidden");
      expect(group.firstElementChild).not.toHaveClass("vpg-side-nav-section-heading");
      expect(screen.queryByRole("button", { name: "Workspace" })).not.toBeInTheDocument();
      expect(link("Inbox")).toHaveClass("vpg-side-nav-row-rail");
      expect(link("Inbox")).toBeVisible();
    });

    it("shows its rows with their labels in a collapsible section's flyout, under the group heading", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Section label="Folders">
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(flyoutTrigger("Mail"));
      const group = screen.getByRole("group", { name: "Folders" });
      expect(group).not.toHaveClass("vpg-side-nav-section-group-rail");
      expect(group.firstElementChild).toHaveClass("vpg-side-nav-section-heading");
      expect(link("Inbox")).not.toHaveClass("vpg-side-nav-row-rail");
    });
  });

  describe("SideNav.Section docked", () => {
    it("is a disclosure, closed by default, toggled by its trigger and reporting each toggle", () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" icon={icon} className="custom" data-testid="mail" onOpenChange={onOpenChange}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const section = screen.getByTestId("mail");
      expect(section).toHaveClass("vpg-disclosure", "vpg-side-nav-section", "custom");
      const trigger = sectionTrigger("Mail");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger.querySelector(".vpg-side-nav-icon")).toHaveAttribute("aria-hidden", "true");
      expect(trigger.querySelector(".vpg-side-nav-label")).toHaveTextContent("Mail");
      expect(link("Inbox").closest(".vpg-side-nav-group")).not.toBeNull();

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(onOpenChange).toHaveBeenLastCalledWith(true);

      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
    });

    it("renders no icon slot without an icon", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail").querySelector(".vpg-side-nav-icon")).toBeNull();
    });

    it("starts open with defaultOpen", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("link", { name: "Inbox" })).toBeVisible();
    });

    it("follows open when controlled, reporting toggles without changing state itself", () => {
      const onOpenChange = vi.fn();
      const { rerender } = renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" open={false} onOpenChange={onOpenChange}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(sectionTrigger("Mail"));
      expect(onOpenChange).toHaveBeenCalledWith(true);
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");

      rerender(
        <div className="vpg-root">
          <SideNav>
            <SideNav.Section collapsible label="Mail" open onOpenChange={onOpenChange}>
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            </SideNav.Section>
          </SideNav>
        </div>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
    });

    it("opens when it holds the current item, without reporting it as a toggle", () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" onOpenChange={onOpenChange}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("opens for a current item nested inside wrapper elements", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail">
            <div>
              <div>
                <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
              </div>
            </div>
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
    });

    it("opens every enclosing section for a deeply nested current item, and no sibling section", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail">
            <SideNav.Section collapsible label="Folders">
              <SideNav.Item href="#work" icon={icon} label="Work" current />
            </SideNav.Section>
            <SideNav.Section collapsible label="Labels">
              <SideNav.Item href="#red" icon={icon} label="Red" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
      expect(sectionTrigger("Folders")).toHaveAttribute("aria-expanded", "true");
      expect(sectionTrigger("Labels")).toHaveAttribute("aria-expanded", "false");
    });

    it("opens when a descendant becomes current after mounting", () => {
      function Nav({ current }: { current: string }) {
        return (
          <SideNav>
            <SideNav.Item href="#home" icon={icon} label="Home" current={current === "home"} />
            <SideNav.Section collapsible label="Mail">
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" current={current === "inbox"} />
            </SideNav.Section>
          </SideNav>
        );
      }
      const { rerender } = renderThemed(<Nav current="home" />);
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");

      rerender(
        <div className="vpg-root">
          <Nav current="inbox" />
        </div>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
      expect(link("Inbox")).toHaveAttribute("aria-current", "page");
      expect(link("Home")).not.toHaveAttribute("aria-current");
    });

    it("stays open when the current item leaves it", () => {
      function Nav({ current }: { current: string }) {
        return (
          <SideNav>
            <SideNav.Item href="#home" icon={icon} label="Home" current={current === "home"} />
            <SideNav.Section collapsible label="Mail">
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" current={current === "inbox"} />
            </SideNav.Section>
          </SideNav>
        );
      }
      const { rerender } = renderThemed(<Nav current="inbox" />);
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");

      rerender(
        <div className="vpg-root">
          <Nav current="home" />
        </div>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
    });

    it("keeps a section the user closed around the current item closed until a descendant becomes current again", () => {
      function Nav({ current }: { current: string }) {
        return (
          <SideNav>
            <SideNav.Item href="#home" icon={icon} label="Home" current={current === "home"} />
            <SideNav.Section collapsible label="Mail">
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" current={current === "inbox"} />
              <SideNav.Item href="#sent" icon={icon} label="Sent" current={current === "sent"} />
            </SideNav.Section>
          </SideNav>
        );
      }
      const { rerender } = renderThemed(<Nav current="inbox" />);
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");

      fireEvent.click(sectionTrigger("Mail"));
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");

      // The current item moving between two descendants never leaves the section.
      rerender(
        <div className="vpg-root">
          <Nav current="sent" />
        </div>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");

      rerender(
        <div className="vpg-root">
          <Nav current="home" />
        </div>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");

      rerender(
        <div className="vpg-root">
          <Nav current="inbox" />
        </div>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
    });

    it("stays as its consumer's open says when it holds the current item", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" open={false}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");
    });

    it("lets a controlling consumer open it from onOpenChange", () => {
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <SideNav>
            <SideNav.Section collapsible label="Mail" open={open} onOpenChange={setOpen}>
              <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            </SideNav.Section>
          </SideNav>
        );
      }
      renderThemed(<Controlled />);
      fireEvent.click(sectionTrigger("Mail"));
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("the rail", () => {
    it("renders each item icon-only, its label visually hidden but still its name", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" current style={{ color: "red" }} />
        </SideNav>,
      );
      const item = link("Inbox");
      expect(item).toHaveClass("vpg-side-nav-row", "vpg-side-nav-item", "vpg-side-nav-row-rail");
      expect(item).toHaveAttribute("aria-current", "page");
      expect(item.querySelector(".vpg-side-nav-visually-hidden")).toHaveTextContent("Inbox");
      expect(item.querySelector(".vpg-side-nav-label")).toBeNull();
      expect(item.style.color).toBe("red");
      expect(item.style.paddingInlineStart).toBe("");
    });

    it("shows an item's label as a tooltip on hover", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
        </SideNav>,
      );
      fireEvent.mouseEnter(tooltipTrigger(link("Inbox")));
      expect(screen.getByRole("tooltip")).toHaveTextContent("Inbox");
      // The label already names the item, so the tooltip does not describe it a second time.
      expect(link("Inbox")).not.toHaveAttribute("aria-describedby");

      fireEvent.mouseLeave(tooltipTrigger(link("Inbox")));
      await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    });

    it("switches the rows between docked and rail as the nav toggles", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
        </SideNav>,
      );
      expect(link("Inbox")).not.toHaveClass("vpg-side-nav-row-rail");
      fireEvent.click(sectionTrigger("Toggle navigation"));
      expect(link("Inbox")).toHaveClass("vpg-side-nav-row-rail");
      fireEvent.click(sectionTrigger("Toggle navigation"));
      expect(link("Inbox")).not.toHaveClass("vpg-side-nav-row-rail");
    });

    it("renders a section as an icon button whose label names it and shows as a tooltip", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon} className="custom" data-testid="mail">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const section = screen.getByTestId("mail");
      expect(section).toHaveClass("vpg-side-nav-section", "vpg-side-nav-section-rail", "custom");
      expect(section).not.toHaveClass("vpg-disclosure");

      const trigger = sectionTrigger("Mail");
      expect(trigger).toHaveAttribute("type", "button");
      expect(trigger).toHaveClass("vpg-side-nav-row", "vpg-side-nav-row-rail", "vpg-side-nav-section-trigger");
      expect(trigger).not.toHaveClass("vpg-side-nav-section-trigger-current");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger.querySelector(".vpg-side-nav-icon [data-testid='icon']")).not.toBeNull();
      expect(trigger.querySelector(".vpg-side-nav-visually-hidden")).toHaveTextContent("Mail");

      fireEvent.mouseEnter(tooltipTrigger(trigger));
      expect(screen.getByRole("tooltip")).toHaveTextContent("Mail");
      fireEvent.mouseLeave(tooltipTrigger(trigger));
      await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    });

    it("renders a section without an icon as a button with an empty icon slot", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const trigger = sectionTrigger("Mail");
      expect(trigger.querySelector(".vpg-side-nav-icon")).toBeEmptyDOMElement();
    });

    it("keeps a closed section's rows mounted in a hidden container", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      expect(screen.queryByRole("link", { name: "Inbox" })).not.toBeInTheDocument();
      expect(link("Inbox").closest("[hidden]")).not.toBeNull();
      expect(flyout("Mail")).not.toBeInTheDocument();
    });

    it("opens a flyout of the section's rows, labelled by the section, docked and unindented", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section collapsible label="Folders" defaultOpen>
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(flyoutTrigger("Mail"));
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");

      const group = flyout("Mail");
      expect(group).toBeInTheDocument();
      expect(group).toHaveClass("vpg-side-nav-group");
      expect(group?.closest(".vpg-side-nav-flyout")).not.toBeNull();
      expect(group?.querySelector(".vpg-side-nav-flyout-label")).toHaveTextContent("Mail");

      const inbox = screen.getByRole("link", { name: "Inbox" });
      expect(group).toContainElement(inbox);
      expect(inbox).not.toHaveClass("vpg-side-nav-row-rail");
      expect(inbox.querySelector(".vpg-side-nav-label")).toHaveTextContent("Inbox");
      expect(inbox.style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 0 * var(--vpg-space-4))");
      expect(sectionTrigger("Folders")).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("link", { name: "Work" }).style.paddingInlineStart).toBe("calc(var(--vpg-space-3) + 1 * var(--vpg-space-4))");
      // An item in a flyout shows its label, so it has no tooltip.
      fireEvent.mouseEnter(tooltipTrigger(inbox));
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("turns the section's tooltip off while its flyout is open", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(flyoutTrigger("Mail"));
      fireEvent.mouseEnter(tooltipTrigger(sectionTrigger("Mail")));
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("closes the flyout on a second click of its button", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(flyoutTrigger("Mail"));
      expect(flyout("Mail")).toBeInTheDocument();

      fireEvent.click(flyoutTrigger("Mail"));
      await waitFor(() => expect(flyout("Mail")).not.toBeInTheDocument());
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");
    });

    it("ignores a section's open, defaultOpen and onOpenChange: the flyout opens and closes without calling onOpenChange", async () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon} open={false} onOpenChange={onOpenChange}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
          <SideNav.Section collapsible label="Chat" icon={icon} defaultOpen onOpenChange={onOpenChange}>
            <SideNav.Item href="#general" icon={icon} label="General" />
          </SideNav.Section>
        </SideNav>,
      );
      expect(flyout("Chat")).not.toBeInTheDocument();
      expect(sectionTrigger("Chat")).toHaveAttribute("aria-expanded", "false");

      for (const name of ["Mail", "Chat"]) {
        fireEvent.click(flyoutTrigger(name));
        expect(flyout(name)).toBeInTheDocument();
        expect(sectionTrigger(name)).toHaveAttribute("aria-expanded", "true");

        fireEvent.click(flyoutTrigger(name));
        await waitFor(() => expect(flyout(name)).not.toBeInTheDocument());
      }
      expect(onOpenChange).not.toHaveBeenCalled();
    });

    it("closes the flyout on Escape", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(flyoutTrigger("Mail"));
      expect(flyout("Mail")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(flyout("Mail")).not.toBeInTheDocument());
    });

    it("closes the flyout when one of its items is activated, after calling the item's onClick", async () => {
      const onClick = vi.fn();
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" onClick={onClick} />
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(flyoutTrigger("Mail"));
      fireEvent.click(screen.getByRole("link", { name: "Inbox" }));
      expect(onClick).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(flyout("Mail")).not.toBeInTheDocument());
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");
    });

    it("marks the section's button when it holds the current item, flyout closed or open", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail")).toHaveClass("vpg-side-nav-section-trigger-current");

      fireEvent.click(flyoutTrigger("Mail"));
      expect(sectionTrigger("Mail")).toHaveClass("vpg-side-nav-section-trigger-current");
      expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("aria-current", "page");
    });

    it("marks the section's button for a current item in a nested section, and unmarks it when current leaves", () => {
      function Nav({ current }: { current: string }) {
        return (
          <SideNav defaultCollapsed>
            <SideNav.Item href="#home" icon={icon} label="Home" current={current === "home"} />
            <SideNav.Section collapsible label="Mail" icon={icon}>
              <SideNav.Section collapsible label="Folders">
                <SideNav.Item href="#work" icon={icon} label="Work" current={current === "work"} />
              </SideNav.Section>
            </SideNav.Section>
          </SideNav>
        );
      }
      const { rerender } = renderThemed(<Nav current="home" />);
      expect(sectionTrigger("Mail")).not.toHaveClass("vpg-side-nav-section-trigger-current");

      rerender(
        <div className="vpg-root">
          <Nav current="work" />
        </div>,
      );
      expect(sectionTrigger("Mail")).toHaveClass("vpg-side-nav-section-trigger-current");

      rerender(
        <div className="vpg-root">
          <Nav current="home" />
        </div>,
      );
      expect(sectionTrigger("Mail")).not.toHaveClass("vpg-side-nav-section-trigger-current");
    });

    it("opens a docked section for the current item it held in the rail", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.CollapseToggle />
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(sectionTrigger("Toggle navigation"));
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("link", { name: "Inbox" })).toHaveAttribute("aria-current", "page");
    });
  });

  describe("open state across a switch between docked and rail", () => {
    function toggleCollapseTwice() {
      fireEvent.click(sectionTrigger("Toggle navigation"));
      fireEvent.click(sectionTrigger("Toggle navigation"));
    }

    it("keeps a top-level section's uncontrolled open state", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
          <SideNav.Section collapsible label="Mail" icon={icon} defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
          <SideNav.Section collapsible label="Chat" icon={icon}>
            <SideNav.Item href="#general" icon={icon} label="General" />
          </SideNav.Section>
        </SideNav>,
      );
      fireEvent.click(sectionTrigger("Mail"));
      fireEvent.click(sectionTrigger("Chat"));
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");
      expect(sectionTrigger("Chat")).toHaveAttribute("aria-expanded", "true");

      toggleCollapseTwice();
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "false");
      expect(sectionTrigger("Chat")).toHaveAttribute("aria-expanded", "true");
    });

    it("resets a nested section's uncontrolled open state to its defaultOpen, and re-opens one holding the current item", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
          <SideNav.Section collapsible label="Mail" icon={icon} defaultOpen>
            <SideNav.Section collapsible label="Folders">
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
            <SideNav.Section collapsible label="Labels" defaultOpen>
              <SideNav.Item href="#red" icon={icon} label="Red" />
            </SideNav.Section>
            <SideNav.Section collapsible label="Archive">
              <SideNav.Item href="#old" icon={icon} label="Old" current />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Archive")).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(sectionTrigger("Folders"));
      fireEvent.click(sectionTrigger("Labels"));
      fireEvent.click(sectionTrigger("Archive"));
      expect(sectionTrigger("Folders")).toHaveAttribute("aria-expanded", "true");
      expect(sectionTrigger("Labels")).toHaveAttribute("aria-expanded", "false");
      expect(sectionTrigger("Archive")).toHaveAttribute("aria-expanded", "false");

      toggleCollapseTwice();
      expect(sectionTrigger("Mail")).toHaveAttribute("aria-expanded", "true");
      expect(sectionTrigger("Folders")).toHaveAttribute("aria-expanded", "false");
      expect(sectionTrigger("Labels")).toHaveAttribute("aria-expanded", "true");
      expect(sectionTrigger("Archive")).toHaveAttribute("aria-expanded", "true");
    });

    it("keeps a nested section's consumer-controlled open", () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
          <SideNav.Section collapsible label="Mail" icon={icon} defaultOpen>
            <SideNav.Section collapsible label="Folders" open>
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      toggleCollapseTwice();
      expect(sectionTrigger("Folders")).toHaveAttribute("aria-expanded", "true");
    });
  });

  describe("outside a SideNav", () => {
    it("throws from SideNav.Item", () => {
      expect(() => render(<SideNav.Item href="#inbox" icon={icon} label="Inbox" />)).toThrow(
        "SideNav.Item must be rendered inside <SideNav>.",
      );
    });

    it("throws from SideNav.Section", () => {
      expect(() => render(<SideNav.Section collapsible label="Mail" />)).toThrow("SideNav.Section must be rendered inside <SideNav>.");
    });

    it("throws from SideNav.CollapseToggle", () => {
      expect(() => render(<SideNav.CollapseToggle />)).toThrow("SideNav.CollapseToggle must be rendered inside <SideNav>.");
    });
  });

  describe("mobile state without a provider", () => {
    it("is closed and wide by default, below the 48rem default", () => {
      renderThemed(
        <SideNav>
          <NavMobileProbe />
        </SideNav>,
      );
      expect(navMobile()).toHaveAttribute("data-mobile", "false");
      expect(navMobile()).toHaveAttribute("data-open", "false");
      expect(navMobile()).toHaveAttribute("data-mobile-below", "48rem");
      expect(navMobile()).toHaveAttribute("data-mobile-below-default", "true");
      expect(navMobile().dataset.drawerId).not.toBe("");
    });

    it("follows the viewport across the default 48rem threshold", () => {
      renderThemed(
        <SideNav>
          <NavMobileProbe />
        </SideNav>,
      );
      act(() => setViewportWidth(767));
      expect(navMobile()).toHaveAttribute("data-mobile", "true");
      act(() => setViewportWidth(768));
      expect(navMobile()).toHaveAttribute("data-mobile", "false");
    });

    it("matches a custom mobileBelow", () => {
      renderThemed(
        <SideNav mobileBelow="1200px">
          <NavMobileProbe />
        </SideNav>,
      );
      expect(navMobile()).toHaveAttribute("data-mobile", "true");
      expect(navMobile()).toHaveAttribute("data-mobile-below", "1200px");
      expect(navMobile()).toHaveAttribute("data-mobile-below-default", "false");
      act(() => setViewportWidth(1200));
      expect(navMobile()).toHaveAttribute("data-mobile", "false");
    });

    it("is unresolved where matchMedia does not exist", () => {
      Reflect.deleteProperty(window, "matchMedia");
      renderThemed(
        <SideNav>
          <NavMobileProbe />
        </SideNav>,
      );
      expect(navMobile()).toHaveAttribute("data-mobile", "undefined");
    });

    it("opens and closes uncontrolled, seeded by defaultMobileOpen, reporting each change", () => {
      const onMobileOpenChange = vi.fn();
      renderThemed(
        <SideNav defaultMobileOpen onMobileOpenChange={onMobileOpenChange}>
          <NavMobileProbe />
        </SideNav>,
      );
      expect(navMobile()).toHaveAttribute("data-open", "true");
      fireEvent.click(navMobile());
      expect(navMobile()).toHaveAttribute("data-open", "false");
      expect(onMobileOpenChange).toHaveBeenLastCalledWith(false);
    });

    it("stays where mobileOpen holds it, reporting the requested state", () => {
      const onMobileOpenChange = vi.fn();
      renderThemed(
        <SideNav mobileOpen={false} onMobileOpenChange={onMobileOpenChange}>
          <NavMobileProbe />
        </SideNav>,
      );
      fireEvent.click(navMobile());
      expect(onMobileOpenChange).toHaveBeenCalledWith(true);
      expect(navMobile()).toHaveAttribute("data-open", "false");
    });

    it("follows a controlled mobileOpen", () => {
      function Controlled() {
        const [open, setOpen] = useState(false);
        return (
          <SideNav mobileOpen={open} onMobileOpenChange={setOpen}>
            <NavMobileProbe />
          </SideNav>
        );
      }
      renderThemed(<Controlled />);
      fireEvent.click(navMobile());
      expect(navMobile()).toHaveAttribute("data-open", "true");
      fireEvent.click(navMobile());
      expect(navMobile()).toHaveAttribute("data-open", "false");
    });
  });

  describe("the drawer presentation", () => {
    /** The drawer's `<dialog>`, or `null` while the nav renders docked. */
    function drawer() {
      return document.querySelector("dialog");
    }

    function openDrawer(): HTMLDialogElement {
      const element = drawer();
      if (element === null) {
        throw new Error("the nav is not in its drawer");
      }
      return element;
    }

    /** The nav, open or closed: a closed drawer's content is out of the accessibility tree. */
    function anyNav() {
      return screen.getByRole("navigation", { hidden: true });
    }

    it("renders docked at a wide viewport", () => {
      renderThemed(
        <SideNav defaultMobileOpen>
          <SideNav.Item href="/home" icon={icon} label="Home" />
        </SideNav>,
      );
      expect(drawer()).toBeNull();
      expect(nav()).not.toHaveClass("vpg-side-nav-drawer");
    });

    it("renders docked while the viewport is unresolved", () => {
      Reflect.deleteProperty(window, "matchMedia");
      renderThemed(<SideNav defaultMobileOpen />);
      expect(drawer()).toBeNull();
      expect(nav()).toBeInTheDocument();
    });

    it("renders the nav inside a closed modal left drawer at a narrow viewport, named by the nav's label", () => {
      setViewportWidth(500);
      renderThemed(
        <SideNav id="app-nav">
          <NavMobileProbe />
        </SideNav>,
      );
      const dialog = screen.getByRole("dialog", { hidden: true });
      expect(dialog).toBe(openDrawer());
      expect(dialog).toHaveAttribute("aria-label", "Main");
      expect(dialog.tagName).toBe("DIALOG");
      expect(dialog).toHaveAttribute("data-side", "left");
      expect(dialog).toHaveAttribute("data-vpg-overlay-root");
      expect(dialog.id).toBe(navMobile().dataset.drawerId);
      expect(openDrawer().open).toBe(false);
      expect(dialog).toContainElement(anyNav());
      expect(anyNav()).toHaveAttribute("id", "app-nav");
      expect(anyNav()).toHaveAttribute("aria-label", "Main");
      expect(anyNav()).toHaveClass("vpg-side-nav", "vpg-side-nav-drawer");
    });

    it("names the drawer with a custom aria-label", () => {
      setViewportWidth(500);
      renderThemed(<SideNav aria-label="Primary" defaultMobileOpen />);
      expect(screen.getByRole("dialog", { name: "Primary" })).toContainElement(screen.getByRole("navigation", { name: "Primary" }));
    });

    it("moves between the docked nav and the drawer as the viewport crosses mobileBelow", () => {
      renderThemed(<SideNav />);
      expect(drawer()).toBeNull();
      act(() => setViewportWidth(500));
      expect(openDrawer()).toContainElement(anyNav());
      act(() => setViewportWidth(1024));
      expect(drawer()).toBeNull();
      expect(nav()).not.toHaveClass("vpg-side-nav-drawer");
    });

    it("opens from defaultMobileOpen and closes on Escape when uncontrolled, reporting the close", () => {
      setViewportWidth(500);
      const onMobileOpenChange = vi.fn();
      renderThemed(<SideNav defaultMobileOpen onMobileOpenChange={onMobileOpenChange} />);
      expect(openDrawer().open).toBe(true);
      fireEvent.keyDown(openDrawer(), { key: "Escape" });
      expect(openDrawer().open).toBe(false);
      expect(onMobileOpenChange).toHaveBeenCalledExactlyOnceWith(false);
    });

    it("opens and closes with a controlled mobileOpen", () => {
      setViewportWidth(500);
      const { rerender } = renderThemed(<SideNav mobileOpen={false} />);
      expect(openDrawer().open).toBe(false);
      rerender(
        <div className="vpg-root">
          <SideNav mobileOpen />
        </div>,
      );
      expect(openDrawer().open).toBe(true);
      rerender(
        <div className="vpg-root">
          <SideNav mobileOpen={false} />
        </div>,
      );
      expect(openDrawer().open).toBe(false);
    });

    it("follows the open state a SideNav.Provider owns", () => {
      setViewportWidth(500);
      renderThemed(
        <SideNav.Provider>
          <ProviderMobileProbe />
          <SideNav />
        </SideNav.Provider>,
      );
      expect(openDrawer().id).toBe(providerMobile().dataset.drawerId);
      expect(openDrawer().open).toBe(false);
      fireEvent.click(providerMobile());
      expect(openDrawer().open).toBe(true);
      fireEvent.click(providerMobile());
      expect(openDrawer().open).toBe(false);
    });

    it("closes when an item is activated, after calling the item's own onClick", () => {
      setViewportWidth(500);
      const calls: string[] = [];
      renderThemed(
        <SideNav defaultMobileOpen onMobileOpenChange={(open) => calls.push(`change:${open}`)}>
          <SideNav.Item
            href="/home"
            icon={icon}
            label="Home"
            onClick={(event) => {
              event.preventDefault();
              calls.push("click");
            }}
          />
        </SideNav>,
      );
      fireEvent.click(link("Home"));
      expect(calls).toEqual(["click", "change:false"]);
      expect(openDrawer().open).toBe(false);
    });

    it("closes a provider's drawer when an item is activated", () => {
      setViewportWidth(500);
      const onMobileOpenChange = vi.fn();
      renderThemed(
        <SideNav.Provider defaultMobileOpen onMobileOpenChange={onMobileOpenChange}>
          <ProviderMobileProbe />
          <SideNav>
            <SideNav.Item as="button" type="button" icon={icon} label="Settings" />
          </SideNav>
        </SideNav.Provider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Settings" }));
      expect(onMobileOpenChange).toHaveBeenCalledExactlyOnceWith(false);
      expect(providerMobile()).toHaveAttribute("data-open", "false");
    });

    it("leaves the open state alone when an item is activated in the docked nav", () => {
      const onMobileOpenChange = vi.fn();
      const onClick = vi.fn((event: MouseEvent) => event.preventDefault());
      renderThemed(
        <SideNav defaultMobileOpen onMobileOpenChange={onMobileOpenChange}>
          <SideNav.Item href="/home" icon={icon} label="Home" onClick={onClick} />
          <NavMobileProbe />
        </SideNav>,
      );
      fireEvent.click(link("Home"));
      expect(onClick).toHaveBeenCalledOnce();
      expect(onMobileOpenChange).not.toHaveBeenCalled();
      expect(navMobile()).toHaveAttribute("data-open", "true");
    });

    it("ignores collapsed: the rows show their labels, with no rail and no tooltips", () => {
      setViewportWidth(500);
      renderThemed(
        <SideNav collapsed defaultMobileOpen>
          <SideNav.Item href="/home" icon={icon} label="Home" />
        </SideNav>,
      );
      expect(nav()).not.toHaveClass("vpg-side-nav-collapsed");
      expect(link("Home")).not.toHaveClass("vpg-side-nav-row-rail");
      expect(screen.getByText("Home")).toHaveClass("vpg-side-nav-label");
      fireEvent.mouseEnter(tooltipTrigger(link("Home")));
      expect(screen.queryByRole("tooltip")).toBeNull();
    });

    it("renders no CollapseToggle", () => {
      setViewportWidth(500);
      renderThemed(
        <SideNav defaultMobileOpen>
          <SideNav.CollapseToggle />
          <SideNav.Item href="/home" icon={icon} label="Home" />
        </SideNav>,
      );
      expect(screen.queryByRole("button", { name: "Toggle navigation", hidden: true })).toBeNull();
      expect(document.querySelector(".vpg-side-nav-collapse-toggle")).toBeNull();
    });

    it("renders a collapsible section docked in a collapsed nav, as a disclosure rather than a flyout", () => {
      setViewportWidth(500);
      renderThemed(
        <SideNav collapsed defaultMobileOpen>
          <SideNav.Section collapsible label="Projects" icon={icon}>
            <SideNav.Item href="/alpha" icon={icon} label="Alpha" />
          </SideNav.Section>
        </SideNav>,
      );
      const trigger = sectionTrigger("Projects");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger.closest(".vpg-popover-trigger")).toBeNull();
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("link", { name: "Alpha" })).toBeVisible();
    });

    describe("leaving the narrow viewport", () => {
      it("closes an open uncontrolled drawer, reporting it once, so narrowing again finds it closed", () => {
        setViewportWidth(500);
        const onMobileOpenChange = vi.fn();
        renderThemed(<SideNav defaultMobileOpen onMobileOpenChange={onMobileOpenChange} />);
        act(() => setViewportWidth(1024));
        expect(onMobileOpenChange).toHaveBeenCalledExactlyOnceWith(false);
        act(() => setViewportWidth(500));
        expect(openDrawer().open).toBe(false);
      });

      it("reports a controlled open drawer closed, so the consumer's state ends up false", () => {
        setViewportWidth(500);
        const onMobileOpenChange = vi.fn();
        function Controlled() {
          const [open, setOpen] = useState(true);
          return (
            <SideNav
              mobileOpen={open}
              onMobileOpenChange={(next) => {
                onMobileOpenChange(next);
                setOpen(next);
              }}
            >
              <NavMobileProbe />
            </SideNav>
          );
        }
        renderThemed(<Controlled />);
        expect(openDrawer().open).toBe(true);
        act(() => setViewportWidth(1024));
        expect(onMobileOpenChange).toHaveBeenCalledExactlyOnceWith(false);
        expect(navMobile()).toHaveAttribute("data-open", "false");
        act(() => setViewportWidth(500));
        expect(openDrawer().open).toBe(false);
      });

      it("reports the close once with a SideNav.Provider, however many parts read its state", () => {
        setViewportWidth(500);
        const onMobileOpenChange = vi.fn();
        renderThemed(
          <SideNav.Provider defaultMobileOpen onMobileOpenChange={onMobileOpenChange}>
            <ProviderMobileProbe />
            <SideNav>
              <NavMobileProbe />
            </SideNav>
          </SideNav.Provider>,
        );
        act(() => setViewportWidth(1024));
        expect(onMobileOpenChange).toHaveBeenCalledExactlyOnceWith(false);
        expect(providerMobile()).toHaveAttribute("data-open", "false");
      });

      it("reports nothing when the drawer is already closed", () => {
        setViewportWidth(500);
        const onMobileOpenChange = vi.fn();
        renderThemed(<SideNav onMobileOpenChange={onMobileOpenChange} />);
        act(() => setViewportWidth(1024));
        expect(onMobileOpenChange).not.toHaveBeenCalled();
      });

      it("reports nothing when the viewport resolves wide on mount, or widens without having been narrow", () => {
        const onMobileOpenChange = vi.fn();
        renderThemed(
          <SideNav defaultMobileOpen onMobileOpenChange={onMobileOpenChange}>
            <NavMobileProbe />
          </SideNav>,
        );
        act(() => setViewportWidth(1100));
        expect(onMobileOpenChange).not.toHaveBeenCalled();
        expect(navMobile()).toHaveAttribute("data-open", "true");
      });
    });
  });

  describe("SideNav.Provider", () => {
    it("shares one state between the nav and a part outside it", () => {
      renderThemed(
        <SideNav.Provider>
          <ProviderMobileProbe />
          <SideNav>
            <NavMobileProbe />
          </SideNav>
        </SideNav.Provider>,
      );
      expect(providerMobile()).toHaveAttribute("data-mobile", "false");
      expect(providerMobile()).toHaveAttribute("data-open", "false");
      expect(providerMobile()).toHaveAttribute("data-mobile-below", "48rem");
      expect(providerMobile()).toHaveAttribute("data-mobile-below-default", "true");
      expect(navMobile().dataset.drawerId).toBe(providerMobile().dataset.drawerId);

      fireEvent.click(providerMobile());
      expect(providerMobile()).toHaveAttribute("data-open", "true");
      expect(navMobile()).toHaveAttribute("data-open", "true");
      fireEvent.click(navMobile());
      expect(providerMobile()).toHaveAttribute("data-open", "false");
    });

    it("matches its mobileBelow against the viewport", () => {
      renderThemed(
        <SideNav.Provider mobileBelow="60rem">
          <SideNav>
            <NavMobileProbe />
          </SideNav>
        </SideNav.Provider>,
      );
      expect(navMobile()).toHaveAttribute("data-mobile", "false");
      expect(navMobile()).toHaveAttribute("data-mobile-below", "60rem");
      expect(navMobile()).toHaveAttribute("data-mobile-below-default", "false");
      act(() => setViewportWidth(959));
      expect(navMobile()).toHaveAttribute("data-mobile", "true");
    });

    it("opens uncontrolled from defaultMobileOpen, reporting each change", () => {
      const onMobileOpenChange = vi.fn();
      renderThemed(
        <SideNav.Provider defaultMobileOpen onMobileOpenChange={onMobileOpenChange}>
          <ProviderMobileProbe />
        </SideNav.Provider>,
      );
      expect(providerMobile()).toHaveAttribute("data-open", "true");
      fireEvent.click(providerMobile());
      expect(providerMobile()).toHaveAttribute("data-open", "false");
      expect(onMobileOpenChange).toHaveBeenCalledWith(false);
    });

    it("stays where mobileOpen holds it, reporting the requested state", () => {
      const onMobileOpenChange = vi.fn();
      renderThemed(
        <SideNav.Provider mobileOpen onMobileOpenChange={onMobileOpenChange}>
          <ProviderMobileProbe />
        </SideNav.Provider>,
      );
      fireEvent.click(providerMobile());
      expect(onMobileOpenChange).toHaveBeenCalledWith(false);
      expect(providerMobile()).toHaveAttribute("data-open", "true");
    });

    it.each([
      ["mobileOpen", { mobileOpen: false }],
      ["defaultMobileOpen", { defaultMobileOpen: true }],
      ["onMobileOpenChange", { onMobileOpenChange: () => {} }],
      ["mobileBelow", { mobileBelow: "40rem" }],
    ])("throws when the nav inside it also takes %s", (name, props) => {
      expect(() =>
        render(
          <SideNav.Provider>
            <SideNav {...props} />
          </SideNav.Provider>,
        ),
      ).toThrow(`SideNav received \`${name}\` inside <SideNav.Provider>, which owns the mobile state: pass it to the Provider.`);
    });

    it("throws from a part reading it outside every provider", () => {
      expect(() =>
        render(
          <SideNav>
            <ProviderMobileProbe />
          </SideNav>,
        ),
      ).toThrow("ProviderMobileProbe must be rendered inside <SideNav.Provider>.");
    });
  });

  describe("SideNav.MobileToggle", () => {
    function toggle(name = "Open navigation") {
      return screen.getByRole("button", { name });
    }

    function drawer(): HTMLDialogElement {
      const element = document.querySelector("dialog");
      if (element === null) {
        throw new Error("the nav is not in its drawer");
      }
      return element;
    }

    it("throws outside every provider", () => {
      expect(() => render(<SideNav.MobileToggle />)).toThrow("SideNav.MobileToggle must be rendered inside <SideNav.Provider>.");
    });

    it("renders nothing at a wide viewport", () => {
      renderThemed(
        <SideNav.Provider>
          <SideNav.MobileToggle />
          <SideNav />
        </SideNav.Provider>,
      );
      expect(screen.queryByRole("button")).toBeNull();
      expect(document.querySelector(".vpg-side-nav-mobile-toggle")).toBeNull();
    });

    it("renders a menu-icon button at a narrow viewport, controlling the drawer", () => {
      setViewportWidth(500);
      renderThemed(
        <SideNav.Provider>
          <SideNav.MobileToggle />
          <SideNav />
        </SideNav.Provider>,
      );
      expect(toggle()).toHaveAttribute("type", "button");
      expect(toggle()).toHaveClass("vpg-side-nav-mobile-toggle");
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      expect(toggle()).toHaveAttribute("aria-controls", drawer().id);
      expect(drawer().id).not.toBe("");
      expect(toggle()).not.toHaveAttribute("data-vpg-side-nav-unresolved");
      const iconSlot = toggle().querySelector(".vpg-side-nav-icon");
      expect(iconSlot).toHaveAttribute("aria-hidden", "true");
      expect(iconSlot?.querySelector("svg")).not.toBeNull();
    });

    it("appears and disappears as the viewport crosses mobileBelow", () => {
      renderThemed(
        <SideNav.Provider>
          <SideNav.MobileToggle />
        </SideNav.Provider>,
      );
      expect(screen.queryByRole("button")).toBeNull();
      act(() => setViewportWidth(500));
      expect(toggle()).toBeInTheDocument();
      act(() => setViewportWidth(1024));
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("opens and closes the drawer, reporting each change", () => {
      setViewportWidth(500);
      const onMobileOpenChange = vi.fn();
      renderThemed(
        <SideNav.Provider onMobileOpenChange={onMobileOpenChange}>
          <SideNav.MobileToggle />
          <SideNav />
        </SideNav.Provider>,
      );
      fireEvent.click(toggle());
      expect(toggle()).toHaveAttribute("aria-expanded", "true");
      expect(drawer().open).toBe(true);
      expect(onMobileOpenChange).toHaveBeenLastCalledWith(true);
      fireEvent.click(toggle());
      expect(toggle()).toHaveAttribute("aria-expanded", "false");
      expect(drawer().open).toBe(false);
      expect(onMobileOpenChange).toHaveBeenLastCalledWith(false);
    });

    it("calls the consumer's onClick before toggling", () => {
      setViewportWidth(500);
      const calls: string[] = [];
      renderThemed(
        <SideNav.Provider onMobileOpenChange={(open) => calls.push(`change:${open}`)}>
          <SideNav.MobileToggle onClick={() => calls.push("click")} />
        </SideNav.Provider>,
      );
      fireEvent.click(toggle());
      expect(calls).toEqual(["click", "change:true"]);
    });

    it("takes a custom label, icon and className, and forwards its ref and other props", () => {
      setViewportWidth(500);
      const ref = createRef<HTMLButtonElement>();
      renderThemed(
        <SideNav.Provider>
          <SideNav.MobileToggle label="Menu" icon={icon} className="app-toggle" data-extra="yes" ref={ref} />
        </SideNav.Provider>,
      );
      expect(toggle("Menu")).toHaveClass("vpg-side-nav-mobile-toggle", "app-toggle");
      expect(toggle("Menu")).toHaveAttribute("data-extra", "yes");
      expect(toggle("Menu")).toContainElement(screen.getByTestId("icon"));
      expect(ref.current).toBe(toggle("Menu"));
    });

    it("renders with a custom mobileBelow once the viewport is narrower", () => {
      setViewportWidth(1100);
      renderThemed(
        <SideNav.Provider mobileBelow="1200px">
          <SideNav.MobileToggle />
        </SideNav.Provider>,
      );
      expect(toggle()).not.toHaveAttribute("data-vpg-side-nav-unresolved");
    });

    it("renders with the marker while the viewport is unresolved, with the default mobileBelow", () => {
      Reflect.deleteProperty(window, "matchMedia");
      renderThemed(
        <SideNav.Provider>
          <SideNav.MobileToggle />
          <SideNav />
        </SideNav.Provider>,
      );
      expect(toggle()).toHaveAttribute("data-vpg-side-nav-unresolved", "");
      expect(nav()).toHaveAttribute("data-vpg-side-nav-unresolved", "");
    });

    it("renders nothing while the viewport is unresolved, with a custom mobileBelow", () => {
      Reflect.deleteProperty(window, "matchMedia");
      renderThemed(
        <SideNav.Provider mobileBelow="60rem">
          <SideNav.MobileToggle />
          <SideNav />
        </SideNav.Provider>,
      );
      expect(screen.queryByRole("button")).toBeNull();
      expect(nav()).not.toHaveAttribute("data-vpg-side-nav-unresolved");
    });
  });

  describe("server rendering", () => {
    function parse(html: string): HTMLElement {
      const container = document.createElement("div");
      container.innerHTML = html;
      return container;
    }

    it("marks the nav and renders the marked toggle with the default mobileBelow", () => {
      const html = parse(
        renderToString(
          <SideNav.Provider>
            <SideNav.MobileToggle />
            <SideNav />
          </SideNav.Provider>,
        ),
      );
      expect(html.querySelector("nav")).toHaveAttribute("data-vpg-side-nav-unresolved", "");
      expect(html.querySelector("dialog")).toBeNull();
      const button = html.querySelector("button.vpg-side-nav-mobile-toggle");
      expect(button).toHaveAttribute("data-vpg-side-nav-unresolved", "");
      expect(button).toHaveAttribute("aria-expanded", "false");
    });

    it("marks a provider-less nav with the default mobileBelow", () => {
      const html = parse(renderToString(<SideNav />));
      expect(html.querySelector("nav")).toHaveAttribute("data-vpg-side-nav-unresolved", "");
    });

    it("renders the docked nav with no marker and no toggle with a custom mobileBelow", () => {
      const html = parse(
        renderToString(
          <SideNav.Provider mobileBelow="60rem">
            <SideNav.MobileToggle />
            <SideNav />
          </SideNav.Provider>,
        ),
      );
      expect(html.querySelector("nav")).not.toBeNull();
      expect(html.querySelector("[data-vpg-side-nav-unresolved]")).toBeNull();
      expect(html.querySelector("button")).toBeNull();
    });

    it("leaves no marker once the viewport resolves", () => {
      renderThemed(
        <SideNav.Provider>
          <SideNav />
        </SideNav.Provider>,
      );
      expect(nav()).not.toHaveAttribute("data-vpg-side-nav-unresolved");
    });

    it("hides the marked nav below the default mobileBelow and the marked toggle at or above it", () => {
      const compact = sideNavStylesheet.replace(/\s+/g, " ");
      expect(compact).toContain("@media (width < 48rem) { .vpg-side-nav[data-vpg-side-nav-unresolved] { display: none; } }");
      expect(compact).toContain("@media (width >= 48rem) { .vpg-side-nav-mobile-toggle[data-vpg-side-nav-unresolved] { display: none; } }");
    });
  });
});
