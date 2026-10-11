import { fireEvent, render, screen } from "@testing-library/react";
import { type ComponentPropsWithRef, createRef, Fragment, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { TopNav } from "./TopNav.js";

/** Renders a nav inside a `.vpg-root`, the subtree `ThemeProvider` establishes and the one the
 * overflow menu portals into. */
function renderThemed(ui: ReactNode) {
  return render(<div className="vpg-root">{ui}</div>);
}

function nav() {
  return screen.getByRole("navigation");
}

function link(name: string) {
  return screen.getByRole("link", { name });
}

function overflowItem(container: HTMLElement) {
  return container.querySelector(".vpg-top-nav-overflow") as HTMLElement;
}

function RouterLink({ to, ...props }: ComponentPropsWithRef<"a"> & { to: string }) {
  return <a href={to} data-router-link="" {...props} />;
}

function Unnamed() {
  return null;
}

const Anonymous = [() => null][0] as () => null;

describe("TopNav", () => {
  describe("the landmark", () => {
    it("renders a nav named Main by default", () => {
      renderThemed(
        <TopNav>
          <TopNav.Item href="#home">Home</TopNav.Item>
        </TopNav>,
      );
      expect(nav()).toHaveAccessibleName("Main");
      expect(nav()).toHaveClass("vpg-top-nav");
    });

    it("takes a custom aria-label, className and other props", () => {
      renderThemed(<TopNav aria-label="Primary" className="custom" data-testid="nav" />);
      expect(nav()).toHaveAccessibleName("Primary");
      expect(nav()).toHaveClass("vpg-top-nav", "custom");
      expect(nav()).toHaveAttribute("data-testid", "nav");
    });

    it("forwards its ref to the nav element", () => {
      const ref = createRef<HTMLElement>();
      renderThemed(<TopNav ref={ref} />);
      expect(ref.current).toBe(nav());
    });

    it("injects its stylesheet", () => {
      renderThemed(<TopNav />);
      expect(document.querySelector("style[data-href='vpg-top-nav']")).not.toBeNull();
    });
  });

  describe("the slots", () => {
    it("renders start before the items and end after them", () => {
      renderThemed(
        <TopNav start={<span>Logo</span>} end={<span>Account</span>}>
          <TopNav.Item href="#home">Home</TopNav.Item>
        </TopNav>,
      );
      const children = Array.from(nav().children);
      expect(children.map((child) => child.className)).toEqual(["vpg-top-nav-start", "vpg-top-nav-main", "vpg-top-nav-end"]);
      expect(children[0]).toHaveTextContent("Logo");
      expect(children[2]).toHaveTextContent("Account");
    });

    it("renders neither slot while start and end are undefined", () => {
      renderThemed(<TopNav />);
      expect(nav().querySelector(".vpg-top-nav-start")).toBeNull();
      expect(nav().querySelector(".vpg-top-nav-end")).toBeNull();
      expect(nav().querySelector(".vpg-top-nav-main")).not.toBeNull();
    });
  });

  describe("items", () => {
    it("renders each item as a link in the row", () => {
      renderThemed(
        <TopNav>
          <TopNav.Item href="#home">Home</TopNav.Item>
          <TopNav.Item href="#docs">Docs</TopNav.Item>
        </TopNav>,
      );
      expect(link("Home")).toHaveAttribute("href", "#home");
      expect(link("Home")).toHaveClass("vpg-top-nav-link");
      expect(link("Docs")).toHaveAttribute("href", "#docs");
      expect(link("Home")).not.toHaveAttribute("aria-current");
    });

    it("marks the current item with aria-current=page", () => {
      renderThemed(
        <TopNav>
          <TopNav.Item href="#home" current>
            Home
          </TopNav.Item>
          <TopNav.Item href="#docs" current={false}>
            Docs
          </TopNav.Item>
        </TopNav>,
      );
      expect(link("Home")).toHaveAttribute("aria-current", "page");
      expect(link("Docs")).not.toHaveAttribute("aria-current");
    });

    it("composes className onto the link and forwards its ref and other props", () => {
      const ref = createRef<HTMLAnchorElement>();
      renderThemed(
        <TopNav>
          <TopNav.Item href="#home" className="custom" ref={ref} data-testid="home">
            Home
          </TopNav.Item>
        </TopNav>,
      );
      expect(ref.current).toBe(link("Home"));
      expect(link("Home")).toHaveClass("vpg-top-nav-link", "custom");
      expect(link("Home")).toHaveAttribute("data-testid", "home");
    });

    it("renders an as component in the row with href forwarded", () => {
      renderThemed(
        <TopNav>
          <TopNav.Item as={RouterLink} to="/docs" href="/docs">
            Docs
          </TopNav.Item>
        </TopNav>,
      );
      expect(link("Docs")).toHaveAttribute("data-router-link");
      expect(link("Docs")).toHaveAttribute("href", "/docs");
    });

    it("throws from TopNav.Item outside a TopNav", () => {
      expect(() => render(<TopNav.Item href="#home">Home</TopNav.Item>)).toThrow("TopNav.Item must be rendered inside <TopNav>.");
    });
  });

  describe("children", () => {
    it("admits items gathered in a fragment, nested or not", () => {
      renderThemed(
        <TopNav>
          {/* biome-ignore lint/complexity/noUselessFragments: the fragment is what the case exercises */}
          <Fragment>
            <TopNav.Item href="#a">A</TopNav.Item>
            {/* biome-ignore lint/complexity/noUselessFragments: the fragment is what the case exercises */}
            <>
              <TopNav.Item href="#b">B</TopNav.Item>
              <TopNav.Item href="#c">C</TopNav.Item>
            </>
          </Fragment>
          <TopNav.Item href="#d">D</TopNav.Item>
        </TopNav>,
      );
      expect(screen.getAllByRole("link").map((item) => item.textContent)).toEqual(["A", "B", "C", "D"]);
    });

    it("admits items behind a false or null condition", () => {
      const show = false as boolean;
      renderThemed(
        <TopNav>
          {show && <TopNav.Item href="#a">A</TopNav.Item>}
          {null}
          {undefined}
          <TopNav.Item href="#b">B</TopNav.Item>
        </TopNav>,
      );
      expect(screen.getAllByRole("link").map((item) => item.textContent)).toEqual(["B"]);
    });

    it("rejects a text child, quoting it", () => {
      expect(() => render(<TopNav>stray</TopNav>)).toThrow('<TopNav> accepts only TopNav.Item as children, but received the text "stray".');
    });

    it("rejects a number child as text", () => {
      expect(() => render(<TopNav>{7}</TopNav>)).toThrow('received the text "7".');
    });

    it("rejects an element tag, naming it", () => {
      expect(() => render(<TopNav>{<div />}</TopNav>)).toThrow("but received <div>.");
    });

    it("rejects another component, naming it", () => {
      expect(() =>
        render(
          <TopNav>
            <Unnamed />
          </TopNav>,
        ),
      ).toThrow("but received <Unnamed>.");
    });

    it("rejects a component with no name, saying so", () => {
      expect(() =>
        render(
          <TopNav>
            <Anonymous />
          </TopNav>,
        ),
      ).toThrow("but received an unnamed component.");
    });

    it("rejects a non-item inside a fragment", () => {
      expect(() =>
        render(
          <TopNav>
            {/* biome-ignore lint/complexity/noUselessFragments: the fragment is what the case exercises */}
            <>
              <TopNav.Item href="#a">A</TopNav.Item>
              <span />
            </>
          </TopNav>,
        ),
      ).toThrow("but received <span>.");
    });
  });

  describe("the overflow menu", () => {
    it("renders a trigger labelled More by default", () => {
      renderThemed(
        <TopNav>
          <TopNav.Item href="#home">Home</TopNav.Item>
        </TopNav>,
      );
      expect(screen.getByRole("button", { name: "More", hidden: true })).toHaveClass("vpg-top-nav-overflow-button");
    });

    it("takes a custom overflowLabel", () => {
      renderThemed(
        <TopNav overflowLabel="Mehr">
          <TopNav.Item href="#home">Home</TopNav.Item>
        </TopNav>,
      );
      expect(screen.getByRole("button", { name: "Mehr", hidden: true })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "More", hidden: true })).toBeNull();
    });

    it("shows every item and hides the overflow item while the observer never reports a layout", () => {
      const { container } = renderThemed(
        <TopNav>
          <TopNav.Item href="#a">A</TopNav.Item>
          <TopNav.Item href="#b">B</TopNav.Item>
        </TopNav>,
      );
      for (const item of container.querySelectorAll(".vpg-top-nav-item")) {
        expect(item).not.toHaveAttribute("data-hidden");
      }
      expect(overflowItem(container)).toHaveAttribute("data-hidden");
      expect(screen.getByRole("button", { name: "More", hidden: true })).not.toHaveClass("vpg-top-nav-overflow-button-current");
    });

    it("keeps the menu closed when the trigger is pressed with nothing hidden", () => {
      renderThemed(
        <TopNav>
          <TopNav.Item href="#a">A</TopNav.Item>
        </TopNav>,
      );
      const trigger = screen.getByRole("button", { name: "More", hidden: true });
      fireEvent.click(trigger);
      expect(screen.queryByRole("menu")).toBeNull();
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("what the row's measurement depends on", () => {
    it("renders labels of every node kind", () => {
      renderThemed(
        <TopNav>
          <TopNav.Item href="#string">text</TopNav.Item>
          <TopNav.Item href="#number">{42}</TopNav.Item>
          <TopNav.Item href="#array">{["a", "b"]}</TopNav.Item>
          <TopNav.Item href="#element">
            <b>bold</b>
          </TopNav.Item>
          <TopNav.Item href="#bigint">{10n}</TopNav.Item>
          <TopNav.Item href="#other">{null}</TopNav.Item>
          <TopNav.Item href="#flag">{true}</TopNav.Item>
        </TopNav>,
      );
      expect(screen.getAllByRole("link")).toHaveLength(7);
      expect(link("text")).toBeInTheDocument();
      expect(link("42")).toBeInTheDocument();
      expect(link("ab")).toBeInTheDocument();
      expect(link("bold")).toBeInTheDocument();
      expect(link("10")).toBeInTheDocument();
    });

    it("re-renders when an item's label, current state or the overflow label changes", () => {
      const nav = (label: string, current: boolean, overflowLabel: string) => (
        <div className="vpg-root">
          <TopNav overflowLabel={overflowLabel}>
            <TopNav.Item href="#a" current={current}>
              {label}
            </TopNav.Item>
            <TopNav.Item as={RouterLink} to="#b">
              B
            </TopNav.Item>
          </TopNav>
        </div>
      );
      const { rerender } = render(nav("A", false, "More"));
      rerender(nav("A2", true, "More"));
      expect(link("A2")).toHaveAttribute("aria-current", "page");
      rerender(nav("A2", true, "Rest"));
      expect(screen.getByRole("button", { name: "Rest", hidden: true })).toBeInTheDocument();
    });
  });
});
