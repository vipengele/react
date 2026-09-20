import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon } from "./Icon.js";
import { ChevronDown } from "./icons.js";

function svg(container: HTMLElement): SVGSVGElement {
  const element = container.querySelector("svg");
  if (!element) throw new Error("expected an svg to render");
  return element;
}

describe("Icon", () => {
  it("renders the given glyph", () => {
    const { container } = render(<Icon icon={ChevronDown} />);
    expect(svg(container)).toHaveClass("lucide-chevron-down");
  });

  it("forwards an explicit size prop as the svg's width/height attributes", () => {
    const { container } = render(<Icon icon={ChevronDown} size={32} />);
    const element = svg(container);
    expect(element.getAttribute("width")).toBe("32");
    expect(element.getAttribute("height")).toBe("32");
  });

  it("forwards an explicit strokeWidth prop as the svg's stroke-width attribute", () => {
    const { container } = render(<Icon icon={ChevronDown} strokeWidth={4} />);
    expect(svg(container).getAttribute("stroke-width")).toBe("4");
  });

  it("withholds the size fallback class once an explicit size is given", () => {
    const { container } = render(<Icon icon={ChevronDown} size={32} />);
    expect(svg(container)).not.toHaveClass("vpg-icon-size-default");
  });

  it("withholds the stroke fallback class once an explicit strokeWidth is given", () => {
    const { container } = render(<Icon icon={ChevronDown} strokeWidth={4} />);
    expect(svg(container)).not.toHaveClass("vpg-icon-stroke-default");
  });

  it("falls back to the CSS-var-driven default size/stroke classes when no props are given", () => {
    const { container } = render(<Icon icon={ChevronDown} />);
    const element = svg(container);
    expect(element).toHaveClass("vpg-icon-size-default");
    expect(element).toHaveClass("vpg-icon-stroke-default");
  });

  it("composes a caller-supplied className alongside the fallback classes", () => {
    const { container } = render(<Icon icon={ChevronDown} className="custom" />);
    const element = svg(container);
    expect(element).toHaveClass("custom");
    expect(element).toHaveClass("vpg-icon-size-default");
  });

  it("adds neither fallback class once both size and strokeWidth are given explicitly", () => {
    const { container } = render(<Icon icon={ChevronDown} size={32} strokeWidth={4} />);
    const element = svg(container);
    expect(element).not.toHaveClass("vpg-icon-size-default");
    expect(element).not.toHaveClass("vpg-icon-stroke-default");
  });

  it("injects the base stylesheet once for any number of icons", () => {
    render(
      <>
        <Icon icon={ChevronDown} />
        <Icon icon={ChevronDown} />
      </>,
    );

    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const styles = document.head.querySelectorAll('style[data-href="vpg-icon-base"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain("vpg-icon-size-default");
  });
});
