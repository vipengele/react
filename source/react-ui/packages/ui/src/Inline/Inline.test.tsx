import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Inline, type InlineAlign, type InlineJustify } from "./Inline.js";

const GAP = "--vpg-inline-gap";
const ALIGN = "--vpg-inline-align";
const JUSTIFY = "--vpg-inline-justify";
const WRAP = "--vpg-inline-wrap";

const SPACE_STEPS = ["space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-7", "space-8"] as const;

const ALIGN_VALUES: ReadonlyArray<readonly [InlineAlign, string]> = [
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["stretch", "stretch"],
  ["baseline", "baseline"],
];

const JUSTIFY_VALUES: ReadonlyArray<readonly [InlineJustify, string]> = [
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["between", "space-between"],
];

function renderInline(props: Parameters<typeof Inline>[0] = {}) {
  const { container } = render(<Inline {...props} />);
  const inline = container.querySelector<HTMLElement>(".vpg-inline");
  if (!inline) throw new Error("Inline did not render a .vpg-inline element");
  return inline;
}

describe("Inline", () => {
  it("renders a div with the vpg-inline class", () => {
    const inline = renderInline();
    expect(inline.tagName).toBe("DIV");
    expect(inline).toHaveClass("vpg-inline");
  });

  it("renders its children", () => {
    const { getByText } = render(
      <Inline>
        <span>first</span>
        <span>second</span>
      </Inline>,
    );
    expect(getByText("first")).toBeInTheDocument();
    expect(getByText("second")).toBeInTheDocument();
  });

  it("injects one stylesheet keyed by href", () => {
    render(
      <>
        <Inline />
        <Inline />
      </>,
    );
    expect(document.querySelectorAll("style[data-href='vpg-inline']")).toHaveLength(1);
  });

  describe("defaults", () => {
    it("gaps by space-4", () => {
      expect(renderInline().style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
    });

    it("aligns to stretch", () => {
      expect(renderInline().style.getPropertyValue(ALIGN)).toBe("stretch");
    });

    it("justifies to start", () => {
      expect(renderInline().style.getPropertyValue(JUSTIFY)).toBe("flex-start");
    });

    it("wraps", () => {
      expect(renderInline().style.getPropertyValue(WRAP)).toBe("wrap");
    });
  });

  describe("gap", () => {
    it.each(SPACE_STEPS)("maps %s to a var() read of the theme step", (step) => {
      expect(renderInline({ gap: step }).style.getPropertyValue(GAP)).toBe(`var(--vpg-${step})`);
    });

    it("maps none to 0", () => {
      expect(renderInline({ gap: "none" }).style.getPropertyValue(GAP)).toBe("0");
    });
  });

  describe("align", () => {
    it.each(ALIGN_VALUES)("maps %s to %s", (keyword, value) => {
      expect(renderInline({ align: keyword }).style.getPropertyValue(ALIGN)).toBe(value);
    });
  });

  describe("justify", () => {
    it.each(JUSTIFY_VALUES)("maps %s to %s", (keyword, value) => {
      expect(renderInline({ justify: keyword }).style.getPropertyValue(JUSTIFY)).toBe(value);
    });
  });

  describe("wrap", () => {
    it("maps true to wrap", () => {
      expect(renderInline({ wrap: true }).style.getPropertyValue(WRAP)).toBe("wrap");
    });

    it("maps false to nowrap", () => {
      expect(renderInline({ wrap: false }).style.getPropertyValue(WRAP)).toBe("nowrap");
    });
  });

  describe("unknown values", () => {
    it.each(["13px", "var(--my-gap)", "space-9", "toString", ""])("resolves gap %j to the default", (gap) => {
      const inline = renderInline({ gap: gap as never });
      expect(inline.style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
    });

    it.each(["flex-start", "space-around", "toString", ""])("resolves align %j to the default", (align) => {
      const inline = renderInline({ align: align as never });
      expect(inline.style.getPropertyValue(ALIGN)).toBe("stretch");
    });

    it.each(["flex-end", "space-around", "toString", ""])("resolves justify %j to the default", (justify) => {
      const inline = renderInline({ justify: justify as never });
      expect(inline.style.getPropertyValue(JUSTIFY)).toBe("flex-start");
    });
  });

  describe("inline custom properties", () => {
    it.each([
      [{}],
      [{ gap: "none", align: "baseline", justify: "between", wrap: false }],
      [{ gap: "space-8", align: "center", justify: "end", wrap: true }],
    ] as const)("holds a var() read, 0 or a mapped keyword for %j", (props) => {
      const style = renderInline({ ...props }).style;
      expect(style.getPropertyValue(GAP)).toMatch(/^(var\(--vpg-space-[1-8]\)|0)$/);
      expect(style.getPropertyValue(ALIGN)).toMatch(/^(flex-start|center|flex-end|stretch|baseline)$/);
      expect(style.getPropertyValue(JUSTIFY)).toMatch(/^(flex-start|center|flex-end|space-between)$/);
      expect(style.getPropertyValue(WRAP)).toMatch(/^(wrap|nowrap)$/);
    });

    it("sets all four on every instance, whichever props are given", () => {
      const style = renderInline({ gap: "space-2" }).style;
      expect(style.getPropertyValue(GAP)).not.toBe("");
      expect(style.getPropertyValue(ALIGN)).not.toBe("");
      expect(style.getPropertyValue(JUSTIFY)).not.toBe("");
      expect(style.getPropertyValue(WRAP)).not.toBe("");
    });
  });

  describe("as", () => {
    it("renders the given element", () => {
      const { container } = render(
        <Inline as="ul">
          <li>item</li>
        </Inline>,
      );
      const list = container.querySelector("ul");
      expect(list).toHaveClass("vpg-inline");
      expect(list?.style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
    });
  });

  describe("className", () => {
    it("keeps vpg-inline alongside the caller's class", () => {
      const inline = renderInline({ className: "caller" });
      expect(inline).toHaveClass("vpg-inline", "caller");
      expect(inline.className).toBe("vpg-inline caller");
    });

    it("carries only vpg-inline when the caller gives no class", () => {
      expect(renderInline().className).toBe("vpg-inline");
    });
  });

  describe("style", () => {
    it("lets a caller's style override the gap custom property", () => {
      const inline = renderInline({ gap: "space-2", style: { "--vpg-inline-gap": "13px" } as never });
      expect(inline.style.getPropertyValue(GAP)).toBe("13px");
    });

    it("lets a caller's style override the wrap custom property", () => {
      const inline = renderInline({ wrap: true, style: { "--vpg-inline-wrap": "wrap-reverse" } as never });
      expect(inline.style.getPropertyValue(WRAP)).toBe("wrap-reverse");
    });

    it("keeps the other custom properties when a caller's style sets an ordinary property", () => {
      const inline = renderInline({ style: { color: "red" } });
      expect(inline.style.color).toBe("red");
      expect(inline.style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
      expect(inline.style.getPropertyValue(WRAP)).toBe("wrap");
    });
  });

  describe("ref", () => {
    it("reaches the rendered element", () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(<Inline ref={ref} />);
      expect(ref.current).toBe(container.querySelector(".vpg-inline"));
    });
  });

  it("forwards other attributes to the element", () => {
    const inline = renderInline({ id: "inline-id", "data-testid": "inline" } as never);
    expect(inline).toHaveAttribute("id", "inline-id");
  });
});
