import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { SideNav } from "./SideNav.js";
import { sideNavStylesheet } from "./SideNav.stylesheet.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its nav mounted.
afterEach(async () => {
  cleanup();
  // The pointer stays where the last test left it, and a hover carried into the next test's
  // first read reports the hover background as the resting one.
  await userEvent.unhover(document.body);
});

/** Mounts `children` under a real provider, so every `--vpg-*` read has a value to resolve to. */
function renderThemed(children: ReactNode) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

const icon = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect width="24" height="24" />
  </svg>
);

function nav(): HTMLElement {
  return screen.getByRole("navigation");
}

function link(name: string): HTMLElement {
  return screen.getByRole("link", { name });
}

function button(name: string): HTMLElement {
  return screen.getByRole("button", { name });
}

function flyout(name: string): HTMLElement | null {
  return screen.queryByRole("group", { name });
}

function iconOf(row: Element): HTMLElement {
  return row.querySelector(".vpg-side-nav-icon") as HTMLElement;
}

/** Finishes every running transition on `element` and below it — a disclosure panel's `height`
 * and `content-visibility` ones included — so the next read sees settled layout and colour. */
function settle(element: Element) {
  for (const animation of element.getAnimations({ subtree: true })) {
    animation.finish();
  }
}

/** Finishes the row's background transition before reading its style; a mid-transition read
 * sees a blend. */
function settledStyle(element: Element): CSSStyleDeclaration {
  settle(element);
  return getComputedStyle(element);
}

/** Appends a probe inside the theme root, applies `declare` to it and reads one computed
 * property back — so a `var()`/`calc()` over the theme resolves the way the cascade does. */
function probe(declare: (style: CSSStyleDeclaration) => void, read: (style: CSSStyleDeclaration) => string): string {
  const element = document.createElement("div");
  declare(element.style);
  (document.querySelector(".vpg-root") as HTMLElement).append(element);
  const value = read(getComputedStyle(element));
  element.remove();
  return value;
}

/** The pixel length a length expression over the theme resolves to. */
function resolvedLength(expression: string): number {
  return Number.parseFloat(
    probe(
      (style) => {
        style.boxSizing = "content-box";
        style.width = expression;
      },
      (style) => style.width,
    ),
  );
}

/** The colour a `--vpg-*` role token resolves to, read by consuming it as a real property —
 * a custom property read back off `getPropertyValue` is its unresolved token stream. */
function resolvedBackground(token: string): string {
  return probe(
    (style) => {
      style.backgroundColor = `var(${token})`;
    },
    (style) => style.backgroundColor,
  );
}

function resolvedColour(token: string): string {
  return probe(
    (style) => {
      style.color = `var(${token})`;
    },
    (style) => style.color,
  );
}

/** Waits until floating-ui has placed the flyout: until then it sits at its unpositioned origin. */
async function placedFlyout(name: string): Promise<HTMLElement> {
  const group = await vi.waitFor(() => {
    const found = flyout(name);
    expect(found).not.toBeNull();
    return found as HTMLElement;
  });
  const panel = group.closest(".vpg-side-nav-flyout") as HTMLElement;
  await vi.waitFor(() => {
    expect(panel.getBoundingClientRect().left).toBeGreaterThan(nav().getBoundingClientRect().left);
  });
  return panel;
}

async function expectFocus(element: Element) {
  await expect.poll(() => document.activeElement).toBe(element);
}

describe("SideNav in a real engine", () => {
  describe("indentation", () => {
    it("insets an item's icon one spacing step further per enclosing section, inside a full-width row", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" icon={icon} defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section collapsible label="Folders" icon={icon} defaultOpen>
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      settle(nav());
      const base = resolvedLength("var(--vpg-space-3)");
      const step = resolvedLength("var(--vpg-space-4)");
      expect(step).toBeGreaterThan(0);

      const top = link("Home").getBoundingClientRect();
      for (const [level, row] of [link("Home"), link("Inbox"), link("Work")].entries()) {
        const box = row.getBoundingClientRect();
        expect(box.left).toBeCloseTo(top.left, 1);
        expect(box.width).toBeCloseTo(top.width, 1);
        expect(Number.parseFloat(getComputedStyle(row).paddingInlineStart)).toBeCloseTo(base + level * step, 1);
        expect(iconOf(row).getBoundingClientRect().left - box.left).toBeCloseTo(base + level * step, 1);
      }
    });

    it("insets a section trigger's icon at its own level, in line with the items beside it", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" icon={icon} defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section collapsible label="Folders" icon={icon}>
              <SideNav.Item href="#work" icon={icon} label="Work" />
            </SideNav.Section>
          </SideNav.Section>
        </SideNav>,
      );
      settle(nav());

      expect(iconOf(button("Mail")).getBoundingClientRect().left).toBeCloseTo(iconOf(link("Home")).getBoundingClientRect().left, 1);
      expect(iconOf(button("Folders")).getBoundingClientRect().left).toBeCloseTo(iconOf(link("Inbox")).getBoundingClientRect().left, 1);
      expect(iconOf(button("Folders")).getBoundingClientRect().left).toBeGreaterThan(iconOf(button("Mail")).getBoundingClientRect().left);
    });
  });

  describe("width", () => {
    it("lays the docked nav out 16rem wide", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#home" icon={icon} label="Home" />
        </SideNav>,
      );
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);

      expect(nav().getBoundingClientRect().width).toBeCloseTo(16 * rem, 1);
    });

    it("lays the rail out one control-size row plus its padding wide", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.CollapseToggle />
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const rail = resolvedLength("calc(var(--vpg-size-md) + 2 * var(--vpg-space-2))");
      expect(rail).toBeGreaterThan(0);

      expect(nav().getBoundingClientRect().width).toBeCloseTo(rail, 1);
    });

    it("switches between the docked and rail widths when the toggle is pressed", async () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
          <SideNav.Item href="#home" icon={icon} label="Home" />
        </SideNav>,
      );
      const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
      const rail = resolvedLength("calc(var(--vpg-size-md) + 2 * var(--vpg-space-2))");

      await userEvent.click(button("Toggle navigation"));
      expect(nav().getBoundingClientRect().width).toBeCloseTo(rail, 1);

      await userEvent.click(button("Toggle navigation"));
      expect(nav().getBoundingClientRect().width).toBeCloseTo(16 * rem, 1);
    });

    it.each([
      ["item", () => link("Home")],
      ["section button", () => button("Mail")],
    ])("stretches a rail %s across the rail's content box, its icon centred", (_kind, row) => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const navBox = nav().getBoundingClientRect();
      const navStyle = getComputedStyle(nav());
      const contentLeft = navBox.left + Number.parseFloat(navStyle.paddingLeft);
      const contentRight = navBox.right - Number.parseFloat(navStyle.paddingRight) - Number.parseFloat(navStyle.borderRightWidth);

      // Each rail row is the tooltip wrapper's only child, `span > a` or `span > button`, so the
      // row's own box is the one measured.
      const element = row();
      expect(element.parentElement).toHaveClass("vpg-tooltip-trigger");
      const box = element.getBoundingClientRect();
      expect(box.left).toBeCloseTo(contentLeft, 1);
      expect(box.right).toBeCloseTo(contentRight, 1);
      const glyph = iconOf(element).getBoundingClientRect();
      expect(glyph.left - box.left).toBeCloseTo(box.right - glyph.right, 1);
    });
  });

  describe("colours", () => {
    it("paints the current item with the accent wash behind accent text", () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
        </SideNav>,
      );
      const wash = resolvedBackground("--vpg-accent-wash");
      const accent = resolvedColour("--vpg-accent");
      expect(wash).not.toBe("rgba(0, 0, 0, 0)");

      expect(settledStyle(link("Inbox")).backgroundColor).toBe(wash);
      expect(settledStyle(link("Inbox")).color).toBe(accent);
      expect(settledStyle(link("Home")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
      expect(settledStyle(link("Home")).color).toBe(resolvedColour("--vpg-ink"));
    });

    it("shows the surface hover colour behind a hovered item", async () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#home" icon={icon} label="Home" />
        </SideNav>,
      );
      const hover = resolvedBackground("--vpg-surface-hover");
      expect(hover).not.toBe("rgba(0, 0, 0, 0)");

      await userEvent.hover(link("Home"));

      expect(settledStyle(link("Home")).backgroundColor).toBe(hover);
    });

    it("shows the surface hover colour behind a hovered docked section trigger", async () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const hover = resolvedBackground("--vpg-surface-hover");
      expect(settledStyle(button("Mail")).backgroundColor).toBe("rgba(0, 0, 0, 0)");

      await userEvent.hover(button("Mail"));

      expect(settledStyle(button("Mail")).backgroundColor).toBe(hover);
    });

    it("keeps the current item's accent wash under hover", async () => {
      renderThemed(
        <SideNav>
          <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
        </SideNav>,
      );
      const wash = resolvedBackground("--vpg-accent-wash");

      await userEvent.hover(link("Inbox"));

      expect(settledStyle(link("Inbox")).backgroundColor).toBe(wash);
    });

    it("colours a rail section holding the current item with the accent, on no selected background", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
          </SideNav.Section>
        </SideNav>,
      );

      expect(settledStyle(button("Mail")).color).toBe(resolvedColour("--vpg-accent"));
      expect(settledStyle(button("Mail")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });
  });

  describe("groups", () => {
    it("sets a group's heading in the muted ink, smaller than and above the rows beneath it", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section label="Workspace">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const heading = screen.getByText("Workspace");
      const row = link("Inbox");

      expect(getComputedStyle(heading).color).toBe(resolvedColour("--vpg-ink-muted"));
      expect(getComputedStyle(row).color).toBe(resolvedColour("--vpg-ink"));
      expect(getComputedStyle(heading).color).not.toBe(getComputedStyle(row).color);
      expect(Number.parseFloat(getComputedStyle(heading).fontSize)).toBeLessThan(Number.parseFloat(getComputedStyle(row).fontSize));
      expect(heading.getBoundingClientRect().bottom).toBeLessThanOrEqual(row.getBoundingClientRect().top);
    });

    it("lines a group's heading text up with its rows' icons", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section label="Workspace">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const headingText = document.createRange();
      headingText.selectNodeContents(screen.getByText("Workspace"));

      expect(headingText.getBoundingClientRect().left).toBeCloseTo(iconOf(link("Inbox")).getBoundingClientRect().left, 1);
    });

    it("sets a collapsible section's trigger in the same muted heading ink", () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );

      expect(getComputedStyle(button("Mail")).color).toBe(resolvedColour("--vpg-ink-muted"));
    });

    it("draws a rule above a rail group that follows other rows, and none above the first", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section label="First">
            <SideNav.Item href="#home" icon={icon} label="Home" />
          </SideNav.Section>
          <SideNav.Section label="Second">
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      const first = screen.getByRole("group", { name: "First" });
      const second = screen.getByRole("group", { name: "Second" });

      expect(getComputedStyle(first).borderBlockStartWidth).toBe("0px");
      expect(Number.parseFloat(getComputedStyle(second).borderBlockStartWidth)).toBeGreaterThan(0);
      expect(getComputedStyle(second).borderBlockStartColor).toBe(resolvedColour("--vpg-border"));
    });

    it("takes no layout space for a rail group's hidden heading", () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section label="Workspace">
            <SideNav.Item href="#home" icon={icon} label="Home" />
          </SideNav.Section>
        </SideNav>,
      );
      const group = screen.getByRole("group", { name: "Workspace" });

      expect(group.getBoundingClientRect().height).toBeCloseTo(link("Home").getBoundingClientRect().height, 1);
    });
  });

  describe("the toggle's placement", () => {
    const height = 500;

    function renderInFrame(placement: "top" | "bottom", defaultCollapsed: boolean) {
      renderThemed(
        <div style={{ height }}>
          <SideNav defaultCollapsed={defaultCollapsed}>
            <SideNav.Item href="#home" icon={icon} label="Home" />
            {placement === "top" ? <SideNav.CollapseToggle placement="top" /> : null}
            {placement === "bottom" ? <SideNav.CollapseToggle placement="bottom" /> : null}
          </SideNav>
        </div>,
      );
    }

    it.each([
      ["docked", false],
      ["rail", true],
    ])("fills the height of its container, %s", (_mode, defaultCollapsed) => {
      renderInFrame("bottom", defaultCollapsed);

      expect(nav().getBoundingClientRect().height).toBeCloseTo(height, 1);
    });

    it.each([
      ["docked", false],
      ["rail", true],
    ])("holds a bottom toggle at the container's bottom edge, inside the nav's padding, %s", (_mode, defaultCollapsed) => {
      renderInFrame("bottom", defaultCollapsed);
      const padding = resolvedLength("var(--vpg-space-2)");

      expect(button("Toggle navigation").getBoundingClientRect().bottom).toBeCloseTo(nav().getBoundingClientRect().bottom - padding, 1);
      expect(button("Toggle navigation").getBoundingClientRect().top).toBeGreaterThan(link("Home").getBoundingClientRect().bottom);
    });

    it("leaves a top toggle directly beneath the rows before it", () => {
      renderInFrame("top", false);

      expect(button("Toggle navigation").getBoundingClientRect().top).toBeCloseTo(
        link("Home").getBoundingClientRect().bottom + resolvedLength("var(--vpg-space-1)"),
        1,
      );
    });

    it("keeps a bottom toggle at the bottom edge when the nav switches between docked and rail", async () => {
      renderInFrame("bottom", false);
      const padding = resolvedLength("var(--vpg-space-2)");

      await userEvent.click(button("Toggle navigation"));

      expect(button("Toggle navigation").getBoundingClientRect().bottom).toBeCloseTo(nav().getBoundingClientRect().bottom - padding, 1);
    });
  });

  describe("the rail flyout", () => {
    it("opens to the right of the rail, clear of it, level with its trigger", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Item href="#sent" icon={icon} label="Sent" />
          </SideNav.Section>
        </SideNav>,
      );

      await userEvent.click(button("Mail"));
      const panel = await placedFlyout("Mail");
      const box = panel.getBoundingClientRect();
      const trigger = button("Mail").getBoundingClientRect();

      expect(box.left).toBeGreaterThanOrEqual(trigger.right);
      expect(box.left).toBeGreaterThanOrEqual(nav().getBoundingClientRect().right);
      // Placed on the right and centred on its trigger, the flyout spans the trigger's midline.
      const midline = (trigger.top + trigger.bottom) / 2;
      expect(box.top).toBeLessThanOrEqual(midline);
      expect(box.bottom).toBeGreaterThanOrEqual(midline);
    });

    it("lays its rows out docked, with their labels showing", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );

      await userEvent.click(button("Mail"));
      await placedFlyout("Mail");
      const row = link("Inbox");
      const label = row.querySelector(".vpg-side-nav-label") as HTMLElement;

      expect(label.getBoundingClientRect().width).toBeGreaterThan(1);
      expect(iconOf(row).getBoundingClientRect().left - row.getBoundingClientRect().left).toBeCloseTo(
        resolvedLength("var(--vpg-space-3)"),
        1,
      );
    });
  });

  describe("keyboard", () => {
    it("visits every docked row in document order with Tab, and arrow keys move nothing", async () => {
      renderThemed(
        <SideNav>
          <SideNav.CollapseToggle />
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" icon={icon} defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Item href="#sent" icon={icon} label="Sent" />
          </SideNav.Section>
          <SideNav.Item href="#settings" icon={icon} label="Settings" />
        </SideNav>,
      );
      const order = [button("Toggle navigation"), link("Home"), button("Mail"), link("Inbox"), link("Sent"), link("Settings")];

      for (const element of order) {
        await userEvent.tab();
        await expectFocus(element);
      }

      await userEvent.tab({ shift: true });
      await expectFocus(link("Sent"));

      await userEvent.keyboard("{ArrowUp}");
      expect(document.activeElement).toBe(link("Sent"));
      await userEvent.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(link("Sent"));
    });

    it("skips the rows of a closed docked section", async () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
          <SideNav.Item href="#settings" icon={icon} label="Settings" />
        </SideNav>,
      );

      await userEvent.tab();
      await expectFocus(button("Mail"));
      await userEvent.tab();
      await expectFocus(link("Settings"));
    });

    it("visits every rail row in document order, skipping the rows of closed flyouts", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.CollapseToggle />
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
          <SideNav.Item href="#settings" icon={icon} label="Settings" />
        </SideNav>,
      );
      const order = [button("Toggle navigation"), link("Home"), button("Mail"), link("Settings")];

      for (const element of order) {
        await userEvent.tab();
        await expectFocus(element);
      }
    });

    it("toggles a docked section from its trigger with Enter and Space", async () => {
      renderThemed(
        <SideNav>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
          </SideNav.Section>
        </SideNav>,
      );
      await userEvent.tab();
      await expectFocus(button("Mail"));

      await userEvent.keyboard("{Enter}");
      expect(button("Mail")).toHaveAttribute("aria-expanded", "true");
      await userEvent.keyboard(" ");
      expect(button("Mail")).toHaveAttribute("aria-expanded", "false");
    });

    it("follows a focused item's link on Enter", async () => {
      const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
      renderThemed(
        <SideNav>
          <SideNav.Item href="#home" icon={icon} label="Home" onClick={onClick} />
        </SideNav>,
      );
      await userEvent.tab();
      await expectFocus(link("Home"));

      await userEvent.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["Enter", "{Enter}"],
      ["Space", " "],
    ])("opens a rail section's flyout with %s and moves focus to its first row", async (_name, key) => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Item href="#sent" icon={icon} label="Sent" />
          </SideNav.Section>
        </SideNav>,
      );
      await userEvent.tab();
      await expectFocus(button("Mail"));

      await userEvent.keyboard(key);

      await placedFlyout("Mail");
      expect(button("Mail")).toHaveAttribute("aria-expanded", "true");
      await expectFocus(link("Inbox"));
    });

    it("moves through the flyout's rows with Tab, each a plain tab stop", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Item href="#sent" icon={icon} label="Sent" />
            <SideNav.Item href="#drafts" icon={icon} label="Drafts" />
          </SideNav.Section>
        </SideNav>,
      );
      await userEvent.click(button("Mail"));
      await placedFlyout("Mail");
      await expectFocus(link("Inbox"));

      await userEvent.tab();
      await expectFocus(link("Sent"));
      await userEvent.tab();
      await expectFocus(link("Drafts"));
      await userEvent.tab({ shift: true });
      await expectFocus(link("Sent"));

      await userEvent.keyboard("{ArrowDown}");
      expect(document.activeElement).toBe(link("Sent"));
    });

    it("closes the flyout on Escape and returns focus to the section's button", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Item href="#sent" icon={icon} label="Sent" />
          </SideNav.Section>
        </SideNav>,
      );
      await userEvent.tab();
      await userEvent.keyboard("{Enter}");
      await placedFlyout("Mail");
      await userEvent.tab();
      await expectFocus(link("Sent"));

      await userEvent.keyboard("{Escape}");

      await vi.waitFor(() => expect(flyout("Mail")).toBeNull());
      expect(button("Mail")).toHaveAttribute("aria-expanded", "false");
      await expectFocus(button("Mail"));
    });

    it("closes the flyout when a row is activated with Enter, and returns focus to the section's button", async () => {
      const onClick = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Section collapsible label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" onClick={onClick} />
          </SideNav.Section>
        </SideNav>,
      );
      await userEvent.tab();
      await userEvent.keyboard("{Enter}");
      await placedFlyout("Mail");
      await expectFocus(link("Inbox"));

      await userEvent.keyboard("{Enter}");

      expect(onClick).toHaveBeenCalledTimes(1);
      await vi.waitFor(() => expect(flyout("Mail")).toBeNull());
      await expectFocus(button("Mail"));
    });
  });
});

/** The project's pinned viewport, which every test in the narrow-viewport suite returns to. */
const DESKTOP = { width: 1280, height: 800 } as const;

/** Below the default `mobileBelow` of 48rem (768px). */
const NARROW = 600;

/** The modal drawer's `<dialog>`, or `null` while the nav is docked. Looked up by tag: a closed
 * drawer is `display: none` and so absent from the accessibility tree a role query searches. */
function drawerElement(): HTMLDialogElement | null {
  return document.querySelector("dialog");
}

function openDrawer(): HTMLDialogElement {
  const drawer = drawerElement();
  if (drawer === null) {
    throw new Error("no <dialog> was rendered");
  }
  return drawer;
}

function navElement(): HTMLElement {
  return document.querySelector(".vpg-side-nav") as HTMLElement;
}

function mobileToggle(): HTMLElement | null {
  return screen.queryByRole("button", { name: "Open navigation" });
}

/** Resolves once every transition and animation on the drawer has finished, so a geometry read
 * afterwards is the slide's end state rather than a frame part-way through it. */
async function settledDrawer(drawer: HTMLDialogElement) {
  await Promise.all(drawer.getAnimations({ subtree: true }).map((animation) => animation.finished));
}

/** The box a `position: fixed` element is laid out against — the viewport less the scrollbar gutter
 * the modal scroll lock's `scrollbar-gutter: stable` reserves, which `innerWidth` still counts. */
function fixedViewport() {
  const element = document.createElement("div");
  element.style.position = "fixed";
  element.style.inset = "0";
  document.body.append(element);
  const { width, height } = element.getBoundingClientRect();
  element.remove();
  return { width, height };
}

/** An app shell: the mobile toggle in a header outside the nav, so it stays mounted while the
 * drawer is open, the nav, and page content behind it. */
function Shell({ mobileBelow }: { mobileBelow?: string }) {
  return (
    <SideNav.Provider mobileBelow={mobileBelow}>
      <header>
        <SideNav.MobileToggle />
      </header>
      <SideNav>
        <SideNav.Item href="#home" icon={icon} label="Home" />
        <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
      </SideNav>
      <main>
        <button type="button">Behind</button>
      </main>
    </SideNav.Provider>
  );
}

async function expectDrawerForm() {
  await vi.waitFor(() => {
    expect(drawerElement()).not.toBeNull();
    expect(navElement().closest("dialog")).toBe(drawerElement());
    expect(mobileToggle()).not.toBeNull();
  });
}

async function expectDockedForm() {
  await vi.waitFor(() => {
    expect(drawerElement()).toBeNull();
    expect(navElement().closest("dialog")).toBeNull();
    expect(mobileToggle()).toBeNull();
  });
}

/** Opens the drawer from the toggle and waits for it to reach the top layer. */
async function openFromToggle(): Promise<HTMLDialogElement> {
  await userEvent.click(mobileToggle() as HTMLElement);
  const drawer = openDrawer();
  await vi.waitFor(() => expect(drawer.open).toBe(true));
  return drawer;
}

describe("SideNav below mobileBelow in a real engine", () => {
  // The viewport is the page's, not the test's: a test that narrows it and does not restore it
  // runs every test after it in the file at a phone's width.
  afterEach(async () => {
    cleanup();
    await page.viewport(DESKTOP.width, DESKTOP.height);
  });

  it("switches live between the docked nav and the drawer as the viewport crosses 48rem", async () => {
    renderThemed(<Shell />);
    await expectDockedForm();
    expect(navElement()).not.toHaveAttribute("data-vpg-side-nav-unresolved");

    await page.viewport(NARROW, DESKTOP.height);
    await expectDrawerForm();
    expect(openDrawer().open).toBe(false);
    expect(getComputedStyle(openDrawer()).display).toBe("none");
    expect(navElement().getBoundingClientRect().width).toBe(0);

    await page.viewport(DESKTOP.width, DESKTOP.height);
    await expectDockedForm();
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(navElement().getBoundingClientRect().width).toBeCloseTo(16 * rem, 1);
  });

  it("closes an open drawer when the viewport widens, so it stays closed on narrowing again", async () => {
    await page.viewport(NARROW, DESKTOP.height);
    renderThemed(<Shell />);
    await expectDrawerForm();
    await openFromToggle();

    await page.viewport(DESKTOP.width, DESKTOP.height);
    await expectDockedForm();
    await page.viewport(NARROW, DESKTOP.height);
    await expectDrawerForm();

    expect(openDrawer().open).toBe(false);
    expect(mobileToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("renders no mobile toggle at a wide viewport", async () => {
    renderThemed(<Shell />);
    await expectDockedForm();

    expect(mobileToggle()).toBeNull();
    expect(document.querySelector(".vpg-side-nav-mobile-toggle")).toBeNull();
    expect(getComputedStyle(navElement()).display).toBe("flex");
  });

  it("opens a modal drawer that makes the page behind it inert", async () => {
    await page.viewport(NARROW, DESKTOP.height);
    renderThemed(<Shell />);
    await expectDrawerForm();
    const behind = screen.getByRole("button", { name: "Behind" });

    const drawer = await openFromToggle();

    expect(drawer.matches(":modal")).toBe(true);
    expect(getComputedStyle(document.documentElement).overflow).toBe("hidden");
    expect(mobileToggle()).toHaveAttribute("aria-expanded", "true");
    behind.focus();
    expect(document.activeElement).not.toBe(behind);
    // The nav inside the top-layer drawer is the one part of the page that stays interactive.
    expect(drawer.contains(document.activeElement)).toBe(true);
    expect(drawer).toHaveAccessibleName("Main");
  });

  it("lays the drawer's panel flush to the left edge at full height and a readable column's width", async () => {
    await page.viewport(NARROW, DESKTOP.height);
    renderThemed(<Shell />);
    await expectDrawerForm();
    const drawer = await openFromToggle();
    await settledDrawer(drawer);

    const panel = drawer.querySelector(".vpg-drawer-panel") as HTMLElement;
    const box = panel.getBoundingClientRect();
    const { width, height } = fixedViewport();
    const expectedWidth = Math.min(resolvedLength("var(--vpg-width-sm)"), width - resolvedLength("var(--vpg-space-6)"));

    expect(box.left).toBeCloseTo(0, 0);
    expect(box.top).toBeCloseTo(0, 0);
    expect(box.height).toBeCloseTo(height, 0);
    expect(box.width).toBeCloseTo(expectedWidth, 0);
    expect(box.width).toBeLessThan(NARROW);
    // The nav fills the panel's content box: it is the expanded layout, not the 16rem docked one
    // or the rail.
    const navBox = navElement().getBoundingClientRect();
    const panelStyle = getComputedStyle(panel);
    expect(navBox.left).toBeCloseTo(
      box.left + Number.parseFloat(panelStyle.borderLeftWidth) + Number.parseFloat(panelStyle.paddingLeft),
      0,
    );
    expect(navBox.right).toBeCloseTo(
      box.right - Number.parseFloat(panelStyle.borderRightWidth) - Number.parseFloat(panelStyle.paddingRight),
      0,
    );
  });

  it("closes the drawer on Escape and returns focus to the mobile toggle", async () => {
    await page.viewport(NARROW, DESKTOP.height);
    renderThemed(<Shell />);
    await expectDrawerForm();
    const toggle = mobileToggle() as HTMLElement;
    const drawer = await openFromToggle();
    await expectFocus(link("Home"));

    await userEvent.keyboard("{Escape}");

    await vi.waitFor(() => expect(drawer.open).toBe(false));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expectFocus(toggle);
  });

  it("closes the drawer on a backdrop click and returns focus to the mobile toggle", async () => {
    await page.viewport(NARROW, DESKTOP.height);
    renderThemed(
      <>
        {/* The page behind the drawer, spanning the viewport, so a click by position on it lands
            wherever the engine hit-tests that point. Stacked below the shell, so it does not
            intercept the click on the toggle. */}
        <div data-testid="page" style={{ position: "fixed", inset: 0, zIndex: -1 }} />
        <Shell />
      </>,
    );
    await expectDrawerForm();
    const toggle = mobileToggle() as HTMLElement;
    const drawer = await openFromToggle();
    await settledDrawer(drawer);

    // The middle of the strip right of the panel, clear of the gutter the scroll lock reserves,
    // where nothing in the document is hit-tested.
    const { width, height } = fixedViewport();
    const backdropPoint = { x: (drawer.getBoundingClientRect().right + width) / 2, y: height / 2 };
    expect(document.elementFromPoint(backdropPoint.x, backdropPoint.y)).toBe(drawer);
    // `force` skips the actionability check, which would refuse a click on an element the backdrop
    // covers.
    await userEvent.click(screen.getByTestId("page"), { position: backdropPoint, force: true });

    await vi.waitFor(() => expect(drawer.open).toBe(false));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expectFocus(toggle);
  });

  it.each([
    ["60rem", 800, 1000],
    ["30rem", 400, 600],
  ])("switches at a custom mobileBelow of %s: the drawer at %ipx, docked at %ipx", async (mobileBelow, narrow, wide) => {
    await page.viewport(wide, DESKTOP.height);
    renderThemed(<Shell mobileBelow={mobileBelow} />);
    await expectDockedForm();

    await page.viewport(narrow, DESKTOP.height);
    await expectDrawerForm();

    await page.viewport(wide, DESKTOP.height);
    await expectDockedForm();
  });

  describe("server markup before hydration", () => {
    let container: HTMLElement | null = null;
    let style: HTMLStyleElement | null = null;

    afterEach(() => {
      container?.remove();
      style?.remove();
      container = null;
      style = null;
    });

    /** Inserts the server HTML of a toggle and a nav under the default `mobileBelow`, with the
     * nav's stylesheet on the page and nothing hydrating it. */
    function insertServerMarkup() {
      style = document.createElement("style");
      style.textContent = sideNavStylesheet;
      document.head.append(style);
      container = document.createElement("div");
      container.innerHTML = renderToString(
        <SideNav.Provider>
          <SideNav.MobileToggle />
          <SideNav>
            <SideNav.Item href="#home" icon={icon} label="Home" />
          </SideNav>
        </SideNav.Provider>,
      );
      document.body.append(container);
      const toggle = container.querySelector(".vpg-side-nav-mobile-toggle") as HTMLElement;
      const navigation = container.querySelector(".vpg-side-nav") as HTMLElement;
      expect(toggle).toHaveAttribute("data-vpg-side-nav-unresolved");
      expect(navigation).toHaveAttribute("data-vpg-side-nav-unresolved");
      return { toggle, navigation };
    }

    it("shows only the mobile toggle below 48rem", async () => {
      await page.viewport(NARROW, DESKTOP.height);
      const { toggle, navigation } = insertServerMarkup();

      expect(getComputedStyle(navigation).display).toBe("none");
      expect(getComputedStyle(toggle).display).toBe("inline-flex");
      expect(toggle.getBoundingClientRect().width).toBeGreaterThan(0);
    });

    it("shows only the docked nav at or above 48rem", async () => {
      const { toggle, navigation } = insertServerMarkup();

      expect(getComputedStyle(toggle).display).toBe("none");
      expect(getComputedStyle(navigation).display).toBe("flex");
      expect(navigation.getBoundingClientRect().width).toBeGreaterThan(0);
    });

    it("swaps the visible form when the viewport crosses 48rem", async () => {
      const { toggle, navigation } = insertServerMarkup();

      await page.viewport(NARROW, DESKTOP.height);
      await vi.waitFor(() => {
        expect(getComputedStyle(navigation).display).toBe("none");
        expect(getComputedStyle(toggle).display).toBe("inline-flex");
      });
    });
  });
});
