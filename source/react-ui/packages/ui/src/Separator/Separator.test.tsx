import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Separator } from "./Separator.js";

describe("Separator", () => {
  it("defaults to a semantic horizontal separator", () => {
    render(<Separator />);
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    expect(separator).toHaveClass("vpg-separator", "vpg-separator-horizontal");
    expect(separator).not.toHaveAttribute("aria-hidden");
  });

  it("announces a vertical orientation", () => {
    render(<Separator orientation="vertical" />);
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveClass("vpg-separator-vertical");
  });

  it("keeps its role and orientation when a caller passes conflicting aria props", () => {
    render(<Separator orientation="vertical" role="presentation" aria-orientation="horizontal" aria-hidden="true" />);
    const separator = screen.getByRole("separator");
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).not.toHaveAttribute("aria-hidden");
  });

  it.each(["horizontal", "vertical"] as const)("hides a decorative %s separator from assistive technology", (orientation) => {
    const { container } = render(<Separator decorative orientation={orientation} />);
    const separator = container.querySelector(".vpg-separator");
    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(separator).not.toHaveAttribute("role");
    expect(separator).not.toHaveAttribute("aria-orientation");
    expect(separator).toHaveClass(`vpg-separator-${orientation}`);
  });

  it("stays hidden when a decorative separator is given conflicting aria props", () => {
    const { container } = render(<Separator decorative role="separator" aria-orientation="vertical" aria-hidden={false} />);
    const separator = container.querySelector(".vpg-separator");
    expect(separator).toHaveAttribute("aria-hidden", "true");
    expect(separator).not.toHaveAttribute("role");
    expect(separator).not.toHaveAttribute("aria-orientation");
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Separator className="custom" />);
    expect(screen.getByRole("separator")).toHaveAttribute("class", "vpg-separator vpg-separator-horizontal custom");
  });

  it("carries only its own classes when no className is given", () => {
    render(<Separator />);
    expect(screen.getByRole("separator")).toHaveAttribute("class", "vpg-separator vpg-separator-horizontal");
  });

  it("forwards its ref to the separator element", () => {
    const ref = createRef<HTMLDivElement>();
    render(<Separator ref={ref} />);
    expect(ref.current).toBe(screen.getByRole("separator"));
  });

  it("forwards arbitrary attributes to the separator element", () => {
    render(<Separator data-testid="target" />);
    expect(screen.getByTestId("target")).toHaveAttribute("role", "separator");
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of separators", () => {
      render(
        <>
          <Separator />
          <Separator orientation="vertical" decorative />
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="vpg-separator"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-separator {");
    });

    it("never assigns an inline style", () => {
      render(<Separator className="custom" />);
      expect(screen.getByRole("separator")).not.toHaveAttribute("style");
    });
  });
});
