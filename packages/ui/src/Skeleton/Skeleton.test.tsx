import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Skeleton } from "./Skeleton.js";

describe("Skeleton", () => {
  it("defaults to the text variant", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass("tandiko-skeleton-text");
  });

  it.each(["rect", "circle", "text"] as const)("renders the %s variant class", (variant) => {
    const { container } = render(<Skeleton variant={variant} />);
    expect(container.firstChild).toHaveClass(`tandiko-skeleton-${variant}`);
  });

  it("is hidden from assistive technology as a decorative placeholder", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("treats a numeric width/height as pixels", () => {
    const { container } = render(<Skeleton width={120} height={16} />);
    expect(container.firstChild).toHaveStyle({ width: "120px", height: "16px" });
  });

  it("carries a string width/height's own unit verbatim", () => {
    const { container } = render(<Skeleton width="50%" height="2rem" />);
    const element = container.firstChild as HTMLElement;
    expect(element.style.width).toBe("50%");
    expect(element.style.height).toBe("2rem");
  });

  it("leaves width/height unset when neither prop is given, so the variant's own CSS sizes it", () => {
    const { container } = render(<Skeleton />);
    const element = container.firstChild as HTMLElement;
    expect(element.style.width).toBe("");
    expect(element.style.height).toBe("");
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    const { container } = render(<Skeleton className="custom" />);
    expect(container.firstChild).toHaveClass("custom", "tandiko-skeleton");
  });

  it("lets a caller-supplied style override the dimension props", () => {
    const { container } = render(<Skeleton width={120} style={{ width: "80px" }} />);
    expect(container.firstChild).toHaveStyle({ width: "80px" });
  });

  it("forwards arbitrary attributes to the wrapping element", () => {
    render(<Skeleton data-testid="target" />);
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of skeletons", () => {
      render(
        <>
          <Skeleton />
          <Skeleton variant="circle" width={40} height={40} />
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-skeleton"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-skeleton {");
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      const { container } = render(<Skeleton variant="rect" width={100} className="custom" />);
      const style = (container.firstChild as HTMLElement).getAttribute("style");
      expect(style).not.toMatch(/--tandiko-/);
    });
  });
});
