import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { StatePanelVariant } from "./StatePanel.js";
import { StatePanel } from "./StatePanel.js";

const VARIANTS: StatePanelVariant[] = ["empty", "error", "not-found"];

function root(container: HTMLElement): HTMLElement {
  return container.querySelector(".vpg-state-panel") as HTMLElement;
}

describe("StatePanel", () => {
  it("renders its title", () => {
    render(<StatePanel title="Nothing here" />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });

  it("defaults to the empty variant", () => {
    const { container } = render(<StatePanel title="T" />);
    expect(root(container)).toHaveClass("vpg-state-panel", "vpg-state-panel-empty");
  });

  it.each(VARIANTS)("renders the %s variant class on the root", (variant) => {
    const { container } = render(<StatePanel variant={variant} title="T" />);
    expect(root(container)).toHaveClass("vpg-state-panel", `vpg-state-panel-${variant}`);
  });

  it.each(VARIANTS)("puts the alert role on the text wrapper only for the error variant (%s)", (variant) => {
    const { container } = render(<StatePanel variant={variant} title="T" />);
    const text = container.querySelector(".vpg-state-panel-text") as HTMLElement;
    if (variant === "error") {
      expect(text).toHaveAttribute("role", "alert");
    } else {
      expect(text).not.toHaveAttribute("role");
    }
    expect(root(container)).not.toHaveAttribute("role");
  });

  it("renders no media for undefined and null", () => {
    const { container, rerender } = render(<StatePanel title="T" media={undefined} />);
    expect(root(container).firstElementChild).toHaveClass("vpg-state-panel-text");
    rerender(<StatePanel title="T" media={null} />);
    expect(root(container).firstElementChild).toHaveClass("vpg-state-panel-text");
  });

  it("renders a media node before the text", () => {
    const { container } = render(<StatePanel title="T" media={<svg data-testid="art" />} />);
    expect(screen.getByTestId("art")).toBeInTheDocument();
    expect(root(container).firstElementChild).toBe(screen.getByTestId("art"));
  });

  it("renders the title as an h2 by default", () => {
    render(<StatePanel title="T" />);
    expect(screen.getByRole("heading", { level: 2, name: "T" })).toBeInTheDocument();
  });

  it("renders the title as the element titleAs names", () => {
    render(<StatePanel title="T" titleAs="h3" />);
    expect(screen.getByRole("heading", { level: 3, name: "T" })).toBeInTheDocument();
  });

  it("renders the description when present and omits it when absent", () => {
    const { container, rerender } = render(<StatePanel title="T" description="Why" />);
    expect(screen.getByText("Why")).toBeInTheDocument();
    rerender(<StatePanel title="T" />);
    expect(container.querySelector(".vpg-state-panel-text")?.children).toHaveLength(1);
  });

  it("renders children in the actions area when present and omits it when absent", () => {
    const { container, rerender } = render(
      <StatePanel title="T">
        <button type="button">Retry</button>
      </StatePanel>,
    );
    expect(container.querySelector(".vpg-state-panel-actions")).toContainElement(screen.getByText("Retry"));
    rerender(<StatePanel title="T" />);
    expect(container.querySelector(".vpg-state-panel-actions")).toBeNull();
  });

  it("applies className to the root only", () => {
    const { container } = render(
      <StatePanel title="T" description="D" className="custom">
        <span>child</span>
      </StatePanel>,
    );
    expect(root(container)).toHaveClass("custom");
    expect(container.querySelectorAll(".custom")).toHaveLength(1);
  });

  it("spreads data attributes onto the root", () => {
    const { container } = render(<StatePanel title="T" data-testid="panel" data-foo="bar" />);
    expect(root(container)).toBe(screen.getByTestId("panel"));
    expect(root(container)).toHaveAttribute("data-foo", "bar");
  });

  it("injects exactly one stylesheet for many instances", () => {
    render(
      <>
        <StatePanel title="A" />
        <StatePanel title="B" variant="error" />
        <StatePanel title="C" variant="not-found" />
      </>,
    );
    expect(document.head.querySelectorAll('style[data-href="vpg-state-panel"]')).toHaveLength(1);
  });

  it("assigns no --vpg-* custom property inline", () => {
    const { container } = render(
      <StatePanel title="T" description="D" media={<svg />}>
        <button type="button">Go</button>
      </StatePanel>,
    );
    for (const el of container.querySelectorAll("[style]")) {
      expect(el.getAttribute("style")).not.toContain("--vpg-");
    }
  });
});
