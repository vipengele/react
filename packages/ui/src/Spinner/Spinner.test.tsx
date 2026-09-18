import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Spinner } from "./Spinner.js";

describe("Spinner", () => {
  it("exposes a status role labelled for assistive technology", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Loading");
  });

  it("uses a caller-supplied label", () => {
    render(<Spinner label="Saving your changes" />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Saving your changes");
  });

  it("renders at the medium size by default", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toHaveClass("tandiko-spinner-md");
  });

  it.each(["sm", "md", "lg"] as const)("renders the %s size class", (size) => {
    render(<Spinner size={size} />);
    expect(screen.getByRole("status")).toHaveClass(`tandiko-spinner-${size}`);
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Spinner className="custom" />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("custom");
    expect(spinner).toHaveClass("tandiko-spinner");
  });

  it("sets no class attribute beyond its own when no className is given", () => {
    render(<Spinner />);
    expect(screen.getByRole("status").getAttribute("class")).toBe("tandiko-spinner tandiko-spinner-md");
  });

  it("leaves colour to the stylesheet when no color prop is given", () => {
    render(<Spinner />);
    expect(screen.getByRole("status").getAttribute("style")).toBeNull();
  });

  it("applies an explicit color as an inline override", () => {
    render(<Spinner color="rgb(102, 51, 153)" />);
    expect(screen.getByRole("status")).toHaveStyle({ color: "rgb(102, 51, 153)" });
  });

  it("never assigns a --tandiko-* custom property inline", () => {
    render(<Spinner color="rgb(102, 51, 153)" />);
    // An inline custom property would beat the base stylesheet's dark-mode reassignment on the
    // same element, so this instance would stop adapting to colour mode entirely.
    expect(screen.getByRole("status").getAttribute("style")).not.toContain("--tandiko-");
  });

  it("injects its stylesheet once for any number of spinners", () => {
    render(
      <>
        <Spinner />
        <Spinner size="lg" />
      </>,
    );

    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.head.querySelectorAll('style[data-href="tandiko-spinner"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain("@keyframes tandiko-spinner-rotate");
  });

  it("takes its default stroke colour from the accent custom property", () => {
    render(<Spinner />);
    const style = document.head.querySelector('style[data-href="tandiko-spinner"]');
    expect(style?.textContent).toContain("color: var(--tandiko-accent);");
  });
});
