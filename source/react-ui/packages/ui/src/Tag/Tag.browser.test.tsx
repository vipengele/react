import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Tag } from "./Tag.js";

/**
 * Tab order, key activation, `:focus-visible` and `:hover` are decided by the engine, and the
 * ring and hover wash are `var()` reads jsdom never resolves. Only a real engine shows whether a
 * keyboard user can reach and fire the remove button and whether it draws its own states.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one button.
afterEach(async () => {
  // The pointer stays where the last test left it, and a hover carried into the next test's
  // first read reports the hover fill as the resting one.
  await userEvent.unhover(document.body);
  cleanup();
});

/** Mounts a tag between two plain buttons under a real provider, so the tab order has a stop on
 * either side of the tag to land on. */
function renderTag(onRemove: () => void = () => {}) {
  render(
    <ThemeProvider>
      <button type="button">Before</button>
      <Tag onRemove={onRemove}>Design</Tag>
      <button type="button">After</button>
    </ThemeProvider>,
  );
  return screen.getByRole("button", { name: "Remove Design" });
}

/** Finishes the background transition before reading it; a mid-transition read sees a blend. */
function settledStyle(element: Element): CSSStyleDeclaration {
  for (const animation of element.getAnimations()) {
    animation.finish();
  }
  return getComputedStyle(element);
}

describe("a Tag's remove button in a real engine", () => {
  it("is the tag's only tab stop", async () => {
    const remove = renderTag();
    const before = screen.getByRole("button", { name: "Before" });
    const after = screen.getByRole("button", { name: "After" });

    await userEvent.tab();
    expect(document.activeElement).toBe(before);

    await userEvent.tab();
    expect(document.activeElement).toBe(remove);

    await userEvent.tab();
    expect(document.activeElement).toBe(after);
  });

  it("calls onRemove once when Enter is pressed on it", async () => {
    const onRemove = vi.fn();
    const remove = renderTag(onRemove);
    remove.focus();

    await userEvent.keyboard("{Enter}");

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove once when Space is pressed on it", async () => {
    const onRemove = vi.fn();
    const remove = renderTag(onRemove);
    remove.focus();

    await userEvent.keyboard(" ");

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("draws a focus ring when it takes keyboard focus", async () => {
    const remove = renderTag();

    await userEvent.tab();
    await userEvent.tab();

    expect(document.activeElement).toBe(remove);
    expect(remove.matches(":focus-visible")).toBe(true);
    const style = getComputedStyle(remove);
    expect(style.outlineStyle).toBe("solid");
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
  });

  it("changes its background colour under the pointer", async () => {
    const remove = renderTag();
    const rest = settledStyle(remove).backgroundColor;

    await userEvent.hover(remove);
    const hovered = settledStyle(remove).backgroundColor;

    // An unresolved `color-mix()` or `var()` drops the declaration, leaving the resting fill.
    expect(hovered).not.toBe(rest);
    expect(hovered).not.toBe("rgba(0, 0, 0, 0)");
  });
});
