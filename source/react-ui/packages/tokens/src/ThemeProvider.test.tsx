import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "./ThemeProvider.js";
import { createTheme } from "./theme.js";

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("style");
});

function root(testId: string): HTMLElement {
  return screen.getByTestId(testId);
}

describe("ThemeProvider", () => {
  it("applies the theme as inline custom properties on its own .vpg-root element", () => {
    render(
      <ThemeProvider data-testid="root" theme={createTheme({ accent: "oklch(0.7 0.2 30)" })}>
        child
      </ThemeProvider>,
    );

    const element = root("root");
    expect(element).toHaveClass("vpg-root");
    expect(element.style.getPropertyValue("--vpg-accent-light")).toBe("oklch(0.7 0.2 30)");
    expect(element.style.getPropertyValue("--vpg-accent-hover")).toContain("oklch(from var(--vpg-accent)");
    expect(element.getAttribute("style")).toContain("--vpg-radius");
  });

  it("does not leak the theme onto :root", () => {
    render(<ThemeProvider data-testid="root">child</ThemeProvider>);

    expect(document.documentElement.style.getPropertyValue("--vpg-accent")).toBe("");
    expect(document.documentElement.getAttribute("style")).toBeNull();
    expect(document.documentElement.hasAttribute("data-vpg-mode")).toBe(false);
  });

  it("scopes two siblings independently rather than merging them", () => {
    render(
      <>
        <ThemeProvider data-testid="a" theme={createTheme({ accent: "oklch(0.7 0.2 30)", radius: "2px" })} />
        <ThemeProvider data-testid="b" theme={createTheme({ accent: "oklch(0.4 0.1 200)", radius: "16px" })} />
      </>,
    );

    expect(root("a").style.getPropertyValue("--vpg-accent-light")).toBe("oklch(0.7 0.2 30)");
    expect(root("a").style.getPropertyValue("--vpg-radius")).toBe("2px");
    expect(root("b").style.getPropertyValue("--vpg-accent-light")).toBe("oklch(0.4 0.1 200)");
    expect(root("b").style.getPropertyValue("--vpg-radius")).toBe("16px");
    expect(root("a").contains(root("b"))).toBe(false);
  });

  it("sets data-vpg-mode from an explicit colorMode", () => {
    render(
      <>
        <ThemeProvider data-testid="dark" colorMode="dark" />
        <ThemeProvider data-testid="light" colorMode="light" />
      </>,
    );

    expect(root("dark")).toHaveAttribute("data-vpg-mode", "dark");
    expect(root("light")).toHaveAttribute("data-vpg-mode", "light");
  });

  it("writes no data-vpg-mode attribute at all when colorMode is omitted", () => {
    render(<ThemeProvider data-testid="root" />);

    expect(root("root").hasAttribute("data-vpg-mode")).toBe(false);
  });

  it("injects the base stylesheet once for any number of providers", () => {
    render(
      <>
        <ThemeProvider data-testid="a" />
        <ThemeProvider data-testid="b" />
      </>,
    );

    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.head.querySelectorAll('style[data-href="vpg-base"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(':root[data-theme="dark"] .vpg-root');
  });

  it("renders with the default theme and merges caller className, style and children", () => {
    render(
      <ThemeProvider data-testid="root" className="app" style={{ padding: "4px" }} id="shell">
        <span>child</span>
      </ThemeProvider>,
    );

    const element = root("root");
    expect(element).toHaveClass("vpg-root", "app");
    expect(element).toHaveAttribute("id", "shell");
    expect(element.style.padding).toBe("4px");
    expect(element.style.getPropertyValue("--vpg-accent-light")).toBe("oklch(0.58 0.19 264)");
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("never sets --vpg-accent/-ink/-surface inline, so the dark-mode stylesheet rule can override them", () => {
    // An inline style always beats a stylesheet selector for the same property on the same
    // element. If ThemeProvider applied these three inline, base-stylesheet.ts's
    // `[data-vpg-mode="dark"]` rule could never take effect no matter how it's written.
    render(<ThemeProvider data-testid="root" />);

    const element = root("root");
    expect(element.style.getPropertyValue("--vpg-accent")).toBe("");
    expect(element.style.getPropertyValue("--vpg-ink")).toBe("");
    expect(element.style.getPropertyValue("--vpg-surface")).toBe("");
  });
});
