import { cleanup, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "@vipengele/react-tokens";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Breadcrumbs, type BreadcrumbsItem } from "./Breadcrumbs.js";

/**
 * Every colour, gap and ring the trail draws is a `var()` the cascade resolves against the theme,
 * and every separator is a pseudo-element; jsdom does neither.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one trail.
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

/** Resolves `value` as the CSS property `property` inside the mounted root, as the engine computes it. */
function resolved(property: "color" | "width", value: string): string {
  const probe = document.createElement("span");
  probe.style[property] = value;
  (document.querySelector(".vpg-root") as HTMLElement).append(probe);
  const result = getComputedStyle(probe)[property];
  probe.remove();
  return result;
}

const resolvedColour = (token: string) => resolved("color", `var(${token})`);
const resolvedLength = (token: string) => Number.parseFloat(resolved("width", `var(${token})`));

function trail(count: number): BreadcrumbsItem[] {
  return Array.from({ length: count }, (_, index) => ({ label: `Item ${index + 1}`, href: `#item-${index + 1}` }));
}

describe("Breadcrumbs colours under a real ThemeProvider", () => {
  it("paints a plain step in the muted ink and the current page in the full ink", () => {
    renderThemed(<Breadcrumbs items={[{ label: "Home", href: "#home" }, { label: "Section" }, { label: "Page" }]} />);

    const plain = (screen.getByText("Section").closest("li") as HTMLElement).querySelector("span") as HTMLElement;
    expect(getComputedStyle(plain).color).toBe(resolvedColour("--vpg-ink-muted"));
    expect(getComputedStyle(screen.getByText("Page")).color).toBe(resolvedColour("--vpg-ink"));
  });

  it("paints the separator in the subtle ink", () => {
    renderThemed(<Breadcrumbs items={trail(3)} />);
    const second = screen.getAllByRole("listitem")[1] as HTMLElement;

    expect(getComputedStyle(second, "::before").color).toBe(resolvedColour("--vpg-ink-subtle"));
    expect(getComputedStyle(second, "::before").content).toContain('"/"');
  });

  it("paints the collapse marker in the muted ink at rest and the full ink under the pointer", async () => {
    renderThemed(<Breadcrumbs items={trail(6)} />);
    const marker = screen.getByRole("button", { name: "Show hidden path" });
    expect(getComputedStyle(marker).color).toBe(resolvedColour("--vpg-ink-muted"));

    await userEvent.hover(marker);
    for (const animation of marker.getAnimations()) animation.finish();

    expect(getComputedStyle(marker).color).toBe(resolvedColour("--vpg-ink"));
  });
});

describe("Breadcrumbs geometry", () => {
  it("spaces the items by the space-2 step", () => {
    renderThemed(<Breadcrumbs items={trail(3)} />);
    const [first, second] = screen.getAllByRole("listitem") as [HTMLElement, HTMLElement];

    const gap = second.getBoundingClientRect().left - first.getBoundingClientRect().right;
    expect(gap).toBeCloseTo(resolvedLength("--vpg-space-2"), 1);
  });

  it("sits the separator before the text, a space-2 step from it", () => {
    renderThemed(<Breadcrumbs items={trail(3)} />);
    const second = screen.getAllByRole("listitem")[1] as HTMLElement;
    const link = within(second);

    const separatorAndGap = link.getByRole("link").getBoundingClientRect().left - second.getBoundingClientRect().left;
    expect(separatorAndGap).toBeGreaterThan(resolvedLength("--vpg-space-2"));
  });

  it("lays the trail on one line while it fits", () => {
    renderThemed(<Breadcrumbs items={trail(4)} />);
    const tops = screen.getAllByRole("listitem").map((item) => Math.round(item.getBoundingClientRect().top));

    expect(new Set(tops).size).toBe(1);
  });
});

describe("Breadcrumbs focus ring", () => {
  it("draws the accent ring on the collapse marker when it takes keyboard focus", async () => {
    renderThemed(<Breadcrumbs items={trail(6)} />);

    await userEvent.tab();
    await userEvent.tab();

    const marker = screen.getByRole("button", { name: "Show hidden path" });
    expect(document.activeElement).toBe(marker);
    const style = getComputedStyle(marker);
    expect(style.outlineStyle).toBe("solid");
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(style.outlineColor).toBe(resolvedColour("--vpg-accent-ring"));
  });

  it("keeps focus on the first revealed link after the marker expands the trail", async () => {
    renderThemed(<Breadcrumbs items={trail(6)} />);

    await userEvent.click(screen.getByRole("button", { name: "Show hidden path" }));

    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Item 2" }));
  });

  it("draws the accent ring on the list when it takes script focus with nothing focusable revealed", async () => {
    renderThemed(
      <Breadcrumbs
        items={[
          { label: "Home", href: "#home" },
          { label: "One" },
          { label: "Two" },
          { label: "Three" },
          { label: "Four", href: "#four" },
          { label: "Page" },
        ]}
      />,
    );

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");

    const list = screen.getByRole("list");
    expect(document.activeElement).toBe(list);
    const style = getComputedStyle(list);
    expect(style.outlineStyle).toBe("solid");
    expect(style.outlineColor).toBe(resolvedColour("--vpg-accent-ring"));
  });
});

describe("Breadcrumbs separator in the accessibility tree", () => {
  it("leaves the separator out of every link's accessible name", () => {
    renderThemed(<Breadcrumbs items={trail(3)} />);

    expect(screen.getByRole("link", { name: "Item 1" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Item 2" })).toBeInTheDocument();
  });

  it("leaves the separator and the ellipsis glyph out of the collapse marker's accessible name", () => {
    renderThemed(<Breadcrumbs items={trail(6)} />);

    expect(screen.getByRole("button", { name: "Show hidden path" })).toBeInTheDocument();
  });

  it("draws a separator the DOM never holds", () => {
    renderThemed(<Breadcrumbs items={trail(3)} />);
    const second = screen.getAllByRole("listitem")[1] as HTMLElement;

    expect(second.textContent).toBe("Item 2");
    expect(getComputedStyle(second, "::before").content).not.toBe("none");
  });
});
