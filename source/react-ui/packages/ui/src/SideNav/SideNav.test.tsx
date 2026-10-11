import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ComponentPropsWithRef, createRef, type ReactNode, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SideNav } from "./SideNav.js";

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
          <SideNav.Section label="Mail" defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section label="Folders" defaultOpen>
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
          <SideNav.Section label="Mail" defaultOpen>
            <SideNav.Section label="Folders">
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

  describe("SideNav.Section docked", () => {
    it("is a disclosure, closed by default, toggled by its trigger and reporting each toggle", () => {
      const onOpenChange = vi.fn();
      renderThemed(
        <SideNav>
          <SideNav.Section label="Mail" icon={icon} className="custom" data-testid="mail" onOpenChange={onOpenChange}>
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
          <SideNav.Section label="Mail">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      expect(sectionTrigger("Mail").querySelector(".vpg-side-nav-icon")).toBeNull();
    });

    it("starts open with defaultOpen", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section label="Mail" defaultOpen>
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
          <SideNav.Section label="Mail" open={false} onOpenChange={onOpenChange}>
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
            <SideNav.Section label="Mail" open onOpenChange={onOpenChange}>
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
          <SideNav.Section label="Mail" onOpenChange={onOpenChange}>
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
          <SideNav.Section label="Mail">
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
          <SideNav.Section label="Mail">
            <SideNav.Section label="Folders">
              <SideNav.Item href="#work" icon={icon} label="Work" current />
            </SideNav.Section>
            <SideNav.Section label="Labels">
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
            <SideNav.Section label="Mail">
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
            <SideNav.Section label="Mail">
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
            <SideNav.Section label="Mail">
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
          <SideNav.Section label="Mail" open={false}>
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
            <SideNav.Section label="Mail" open={open} onOpenChange={setOpen}>
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
          <SideNav.Section label="Mail" icon={icon} className="custom" data-testid="mail">
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
          <SideNav.Section label="Mail">
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section label="Folders" defaultOpen>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon} open={false} onOpenChange={onOpenChange}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
          <SideNav.Section label="Chat" icon={icon} defaultOpen onOpenChange={onOpenChange}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
            <SideNav.Section label="Mail" icon={icon}>
              <SideNav.Section label="Folders">
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon} defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
          <SideNav.Section label="Chat" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon} defaultOpen>
            <SideNav.Section label="Folders">
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
            <SideNav.Section label="Labels" defaultOpen>
              <SideNav.Item href="#red" icon={icon} label="Red" />
            </SideNav.Section>
            <SideNav.Section label="Archive">
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
          <SideNav.Section label="Mail" icon={icon} defaultOpen>
            <SideNav.Section label="Folders" open>
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
      expect(() => render(<SideNav.Section label="Mail" />)).toThrow("SideNav.Section must be rendered inside <SideNav>.");
    });

    it("throws from SideNav.CollapseToggle", () => {
      expect(() => render(<SideNav.CollapseToggle />)).toThrow("SideNav.CollapseToggle must be rendered inside <SideNav>.");
    });
  });
});
