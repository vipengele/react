import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { SideNav } from "./SideNav.js";

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
          <SideNav.Section label="Mail" icon={icon} defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section label="Folders" icon={icon} defaultOpen>
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
          <SideNav.Section label="Mail" icon={icon} defaultOpen>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" />
            <SideNav.Section label="Folders" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
            <SideNav.Item href="#inbox" icon={icon} label="Inbox" current />
          </SideNav.Section>
        </SideNav>,
      );

      expect(settledStyle(button("Mail")).color).toBe(resolvedColour("--vpg-accent"));
      expect(settledStyle(button("Mail")).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    });
  });

  describe("the rail flyout", () => {
    it("opens to the right of the rail, clear of it, level with its trigger", async () => {
      renderThemed(
        <SideNav defaultCollapsed>
          <SideNav.Item href="#home" icon={icon} label="Home" />
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon} defaultOpen>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
          <SideNav.Section label="Mail" icon={icon}>
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
