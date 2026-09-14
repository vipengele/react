import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress } from "./Progress.js";

describe("Progress", () => {
  it("renders indeterminate when no value is given", () => {
    render(<Progress />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("tandiko-progress-indeterminate");
    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar).not.toHaveAttribute("aria-valuemin");
    expect(bar).not.toHaveAttribute("aria-valuemax");
  });

  it("renders determinate with aria-value* when a value is given", () => {
    render(<Progress value={40} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveClass("tandiko-progress-determinate");
    expect(bar).toHaveAttribute("aria-valuenow", "40");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });

  it("defaults max to 100 and sizes the fill as a percentage of it", () => {
    const { container } = render(<Progress value={25} />);
    const fill = container.querySelector(".tandiko-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("25%");
  });

  it("sizes the fill against a custom max", () => {
    const { container } = render(<Progress value={5} max={10} />);
    const fill = container.querySelector(".tandiko-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("50%");
  });

  it("clamps a value above max to max, both in the fill width and aria-valuenow", () => {
    const { container } = render(<Progress value={150} max={100} />);
    const bar = screen.getByRole("progressbar");
    const fill = container.querySelector(".tandiko-progress-fill") as HTMLElement;
    expect(bar).toHaveAttribute("aria-valuenow", "100");
    expect(fill.style.width).toBe("100%");
  });

  it("clamps a negative value to 0", () => {
    const { container } = render(<Progress value={-10} />);
    const bar = screen.getByRole("progressbar");
    const fill = container.querySelector(".tandiko-progress-fill") as HTMLElement;
    expect(bar).toHaveAttribute("aria-valuenow", "0");
    expect(fill.style.width).toBe("0%");
  });

  it("leaves the fill's inline width unset for the indeterminate variant", () => {
    const { container } = render(<Progress />);
    const fill = container.querySelector(".tandiko-progress-fill") as HTMLElement;
    expect(fill.style.width).toBe("");
  });

  it.each(["sm", "md", "lg"] as const)("renders the %s size class", (size) => {
    render(<Progress size={size} />);
    expect(screen.getByRole("progressbar")).toHaveClass(`tandiko-progress-${size}`);
  });

  it("defaults to the md size", () => {
    render(<Progress />);
    expect(screen.getByRole("progressbar")).toHaveClass("tandiko-progress-md");
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<Progress className="custom" />);
    expect(screen.getByRole("progressbar")).toHaveClass("custom", "tandiko-progress");
  });

  it("lets a caller-supplied style apply to the root element", () => {
    render(<Progress style={{ width: "192px" }} />);
    expect(screen.getByRole("progressbar")).toHaveStyle({ width: "192px" });
  });

  it("forwards arbitrary attributes to the wrapping element", () => {
    render(<Progress data-testid="target" />);
    expect(screen.getByTestId("target")).toBeInTheDocument();
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of progress bars", () => {
      render(
        <>
          <Progress value={10} />
          <Progress />
        </>,
      );

      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.head.querySelectorAll('style[data-href="tandiko-progress"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".tandiko-progress {");
    });

    it("never assigns a --tandiko-* custom property inline", () => {
      const { container } = render(<Progress value={30} className="custom" />);
      const style = (container.firstChild as HTMLElement).getAttribute("style") ?? "";
      expect(style).not.toMatch(/--tandiko-/);
    });
  });
});
