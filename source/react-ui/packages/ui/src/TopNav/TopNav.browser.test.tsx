import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComponentPropsWithRef, ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { TopNav } from "./TopNav.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its nav mounted.
afterEach(async () => {
  await userEvent.unhover(document.body);
  cleanup();
});

const sections = ["Overview", "Reports", "Analytics", "Settings", "Billing", "Support"];

function RouterLink({ to, ...props }: ComponentPropsWithRef<"a"> & { to: string }) {
  return <a href={to} data-router-link="" {...props} />;
}

function items(current?: string): ReactNode[] {
  return sections.map((label) => (
    <TopNav.Item key={label} href={`#${label.toLowerCase()}`} current={label === current}>
      {label}
    </TopNav.Item>
  ));
}

/** Renders `ui` into a block container of a fixed width, under a real `ThemeProvider`. */
function renderInto(width: number, ui: ReactNode) {
  const { container } = render(
    <ThemeProvider>
      <div data-testid="container" style={{ width: `${width}px` }}>
        {ui}
      </div>
    </ThemeProvider>,
  );
  return { container, box: screen.getByTestId("container") };
}

/** The labels the row actually draws. An item the row has no width for is taken out of the flow,
 * so it reports no box. */
function shownLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>(".vpg-top-nav-item"))
    .filter((item) => item.getBoundingClientRect().width > 0)
    .map((item) => item.textContent ?? "");
}

function overflow(container: HTMLElement): HTMLElement {
  return container.querySelector(".vpg-top-nav-overflow") as HTMLElement;
}

function overflowShown(container: HTMLElement): boolean {
  return overflow(container).getBoundingClientRect().width > 0;
}

function trigger(container: HTMLElement): HTMLElement {
  return overflow(container).querySelector("button") as HTMLElement;
}

function menuLinks(): HTMLElement[] {
  return screen.queryAllByRole("menuitem");
}

describe("TopNav under a real ThemeProvider", () => {
  describe("collapsing the row", () => {
    it("shows every item, and no overflow item, while the row has width for them all", () => {
      const { container } = renderInto(1000, <TopNav>{items()}</TopNav>);

      expect(shownLabels(container)).toEqual(sections);
      expect(overflowShown(container)).toBe(false);
      expect(overflow(container)).toHaveAttribute("data-hidden");
    });

    it("hides items from the end when the row has no width for them", () => {
      const { container } = renderInto(400, <TopNav>{items()}</TopNav>);

      const shown = shownLabels(container);
      expect(shown.length).toBeGreaterThan(0);
      expect(shown.length).toBeLessThan(sections.length);
      expect(shown).toEqual(sections.slice(0, shown.length));
      expect(overflowShown(container)).toBe(true);
    });

    it("keeps at least one item on the row however narrow it is", () => {
      const { container } = renderInto(120, <TopNav>{items()}</TopNav>);

      expect(shownLabels(container)).toEqual([sections[0]]);
      expect(overflowShown(container)).toBe(true);
    });

    it("takes items off the row as the nav narrows and back as it widens", async () => {
      const { container, box } = renderInto(1000, <TopNav>{items()}</TopNav>);
      expect(shownLabels(container)).toEqual(sections);

      box.style.width = "300px";
      await expect.poll(() => shownLabels(container).length).toBeLessThan(sections.length);
      expect(overflowShown(container)).toBe(true);

      box.style.width = "1000px";
      await expect.poll(() => shownLabels(container)).toEqual(sections);
      expect(overflowShown(container)).toBe(false);
    });

    it("never collapses the slots", () => {
      const { container } = renderInto(
        300,
        <TopNav start={<span style={{ width: "80px" }}>Logo</span>} end={<span style={{ width: "80px" }}>Account</span>}>
          {items()}
        </TopNav>,
      );

      const start = container.querySelector(".vpg-top-nav-start") as HTMLElement;
      const end = container.querySelector(".vpg-top-nav-end") as HTMLElement;
      expect(start.getBoundingClientRect().width).toBeGreaterThanOrEqual(80);
      expect(end.getBoundingClientRect().width).toBeGreaterThanOrEqual(80);
      const nav = screen.getByRole("navigation").getBoundingClientRect();
      expect(end.getBoundingClientRect().right).toBeLessThanOrEqual(nav.right);
      expect(shownLabels(container).length).toBeLessThan(sections.length);
    });

    it("re-measures the row when the slots change width", async () => {
      const { container, box } = renderInto(700, <TopNav end={<span data-testid="end" style={{ width: "10px" }} />}>{items()}</TopNav>);
      const before = shownLabels(container).length;

      (screen.getByTestId("end") as HTMLElement).style.width = "400px";

      await expect.poll(() => shownLabels(container).length).toBeLessThan(before);
      expect(box).toBeInTheDocument();
    });
  });

  describe("the overflow menu", () => {
    it("lists exactly the hidden items as links with their destinations", async () => {
      const { container } = renderInto(400, <TopNav>{items()}</TopNav>);
      const hidden = sections.slice(shownLabels(container).length);

      await userEvent.click(trigger(container));

      await screen.findByRole("menu");
      const rows = menuLinks();
      expect(rows.map((row) => row.textContent)).toEqual(hidden);
      for (const row of rows) {
        expect(row.tagName).toBe("A");
        expect(row).toHaveAttribute("href", `#${row.textContent?.toLowerCase()}`);
      }
    });

    it("marks the trigger and the hidden current item's row as current", async () => {
      const { container } = renderInto(400, <TopNav>{items("Support")}</TopNav>);
      expect(shownLabels(container)).not.toContain("Support");
      expect(trigger(container)).toHaveClass("vpg-top-nav-overflow-button-current");

      await userEvent.click(trigger(container));

      await screen.findByRole("menu");
      const current = menuLinks().filter((row) => row.getAttribute("aria-current") === "page");
      expect(current.map((row) => row.textContent)).toEqual(["Support"]);
    });

    it("leaves the trigger unmarked while the current item is on the row", () => {
      const { container } = renderInto(400, <TopNav>{items("Overview")}</TopNav>);

      expect(shownLabels(container)).toContain("Overview");
      expect(trigger(container)).not.toHaveClass("vpg-top-nav-overflow-button-current");
    });

    it("gives a hidden as-component item its href in the menu row", async () => {
      const { container } = renderInto(
        150,
        <TopNav>
          <TopNav.Item href="#first">First item</TopNav.Item>
          <TopNav.Item as={RouterLink} to="/routed" href="/routed">
            Routed
          </TopNav.Item>
        </TopNav>,
      );
      expect(shownLabels(container)).toEqual(["First item"]);

      await userEvent.click(trigger(container));

      await screen.findByRole("menu");
      const [row] = menuLinks();
      expect(row).toHaveTextContent("Routed");
      expect(row).toHaveAttribute("data-router-link");
      expect(row).toHaveAttribute("href", "/routed");
    });

    it("closes on Escape and returns focus to the trigger", async () => {
      const { container } = renderInto(400, <TopNav>{items()}</TopNav>);
      await userEvent.click(trigger(container));
      await screen.findByRole("menu");

      await userEvent.keyboard("{Escape}");

      await expect.poll(() => screen.queryByRole("menu")).toBeNull();
      await expect.poll(() => document.activeElement).toBe(trigger(container));
    });

    it("closes when the nav widens until nothing is hidden", async () => {
      const { container, box } = renderInto(400, <TopNav>{items()}</TopNav>);
      await userEvent.click(trigger(container));
      await screen.findByRole("menu");

      box.style.width = "1000px";

      await expect.poll(() => screen.queryByRole("menu")).toBeNull();
      expect(shownLabels(container)).toEqual(sections);
      expect(overflowShown(container)).toBe(false);
    });

    it("stays closed when items collapse into the menu again", async () => {
      const { container, box } = renderInto(400, <TopNav>{items()}</TopNav>);
      await userEvent.click(trigger(container));
      await screen.findByRole("menu");
      box.style.width = "1000px";
      await expect.poll(() => screen.queryByRole("menu")).toBeNull();

      box.style.width = "400px";

      await expect.poll(() => overflowShown(container)).toBe(true);
      expect(screen.queryByRole("menu")).toBeNull();
      expect(trigger(container)).toHaveAttribute("aria-expanded", "false");
    });
  });
});
