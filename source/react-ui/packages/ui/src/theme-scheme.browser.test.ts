import { ThemeProvider } from "@tandiko/tokens";
import { cleanup, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";

/**
 * `color-scheme` is what the browser reads to draw its own chrome — form controls, scrollbars,
 * the caret — and what `light-dark()` picks its arm from, so every mode-resolved colour in the
 * base stylesheet resolves through it. A root whose `color-scheme` does not match its
 * `data-tandiko-mode` renders native controls from the wrong mode against theme colours from the
 * right one, and nothing in the custom properties themselves shows it.
 *
 * jsdom applies no cascade, so these assertions only mean anything in a real engine.
 */

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first leaves its root mounted.
afterEach(cleanup);

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

/** Renders a provider and returns the computed style of its `.tandiko-root`. */
function renderRoot(colorMode?: "light" | "dark"): CSSStyleDeclaration {
  const { container } = render(createElement(ThemeProvider, { colorMode }));

  const root = container.querySelector(".tandiko-root");
  if (!root) {
    throw new Error("ThemeProvider rendered no .tandiko-root");
  }

  return getComputedStyle(root);
}

describe("color-scheme under a ThemeProvider", () => {
  it("computes to light on a root in light mode", () => {
    expect(renderRoot("light").colorScheme).toBe("light");
  });

  it("computes to dark on a root in dark mode", () => {
    expect(renderRoot("dark").colorScheme).toBe("dark");
  });

  it("follows the host page's [data-theme] when the provider names no mode", () => {
    document.documentElement.dataset.theme = "dark";

    expect(renderRoot().colorScheme).toBe("dark");
  });

  it("keeps an explicitly light root light inside a dark host page", () => {
    document.documentElement.dataset.theme = "dark";

    expect(renderRoot("light").colorScheme).toBe("light");
  });

  it("resolves the light-dark() colours through the arm color-scheme selects", () => {
    // The two modes' surfaces are distinct colours, and the base rule paints the root in
    // `var(--tandiko-surface)`. Equal backgrounds mean `light-dark()` resolved the same arm
    // twice, which is what a `color-scheme` that did not move would produce.
    const light = renderRoot("light").backgroundColor;
    cleanup();
    const dark = renderRoot("dark").backgroundColor;

    expect(light).not.toBe(dark);
  });
});
