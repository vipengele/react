import { render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { Stack, type StackAlign, type StackJustify } from "./Stack.js";

const GAP = "--vpg-stack-gap";
const ALIGN = "--vpg-stack-align";
const JUSTIFY = "--vpg-stack-justify";

const SPACE_STEPS = ["space-1", "space-2", "space-3", "space-4", "space-5", "space-6", "space-7", "space-8"] as const;

const ALIGN_VALUES: ReadonlyArray<readonly [StackAlign, string]> = [
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["stretch", "stretch"],
  ["baseline", "baseline"],
];

const JUSTIFY_VALUES: ReadonlyArray<readonly [StackJustify, string]> = [
  ["start", "flex-start"],
  ["center", "center"],
  ["end", "flex-end"],
  ["between", "space-between"],
];

function renderStack(props: Parameters<typeof Stack>[0] = {}) {
  const { container } = render(<Stack {...props} />);
  const stack = container.querySelector<HTMLElement>(".vpg-stack");
  if (!stack) throw new Error("Stack did not render a .vpg-stack element");
  return stack;
}

describe("Stack", () => {
  it("renders a div with the vpg-stack class", () => {
    const stack = renderStack();
    expect(stack.tagName).toBe("DIV");
    expect(stack).toHaveClass("vpg-stack");
  });

  it("renders its children", () => {
    const { getByText } = render(
      <Stack>
        <span>first</span>
        <span>second</span>
      </Stack>,
    );
    expect(getByText("first")).toBeInTheDocument();
    expect(getByText("second")).toBeInTheDocument();
  });

  it("injects one stylesheet keyed by href", () => {
    render(
      <>
        <Stack />
        <Stack />
      </>,
    );
    expect(document.querySelectorAll("style[data-href='vpg-stack']")).toHaveLength(1);
  });

  describe("defaults", () => {
    it("gaps by space-4", () => {
      expect(renderStack().style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
    });

    it("aligns to stretch", () => {
      expect(renderStack().style.getPropertyValue(ALIGN)).toBe("stretch");
    });

    it("justifies to start", () => {
      expect(renderStack().style.getPropertyValue(JUSTIFY)).toBe("flex-start");
    });
  });

  describe("gap", () => {
    it.each(SPACE_STEPS)("maps %s to a var() read of the theme step", (step) => {
      expect(renderStack({ gap: step }).style.getPropertyValue(GAP)).toBe(`var(--vpg-${step})`);
    });

    it("maps none to 0", () => {
      expect(renderStack({ gap: "none" }).style.getPropertyValue(GAP)).toBe("0");
    });
  });

  describe("align", () => {
    it.each(ALIGN_VALUES)("maps %s to %s", (keyword, value) => {
      expect(renderStack({ align: keyword }).style.getPropertyValue(ALIGN)).toBe(value);
    });
  });

  describe("justify", () => {
    it.each(JUSTIFY_VALUES)("maps %s to %s", (keyword, value) => {
      expect(renderStack({ justify: keyword }).style.getPropertyValue(JUSTIFY)).toBe(value);
    });
  });

  describe("unknown values", () => {
    it.each(["13px", "var(--my-gap)", "space-9", "toString", ""])("resolves gap %j to the default", (gap) => {
      const stack = renderStack({ gap: gap as never });
      expect(stack.style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
    });

    it.each(["flex-start", "space-around", "toString", ""])("resolves align %j to the default", (align) => {
      const stack = renderStack({ align: align as never });
      expect(stack.style.getPropertyValue(ALIGN)).toBe("stretch");
    });

    it.each(["flex-end", "space-around", "toString", ""])("resolves justify %j to the default", (justify) => {
      const stack = renderStack({ justify: justify as never });
      expect(stack.style.getPropertyValue(JUSTIFY)).toBe("flex-start");
    });
  });

  describe("inline custom properties", () => {
    it.each([
      [{}],
      [{ gap: "none", align: "baseline", justify: "between" }],
      [{ gap: "space-8", align: "center", justify: "end" }],
    ] as const)("holds a var() read, 0 or a mapped keyword for %j", (props) => {
      const style = renderStack({ ...props }).style;
      expect(style.getPropertyValue(GAP)).toMatch(/^(var\(--vpg-space-[1-8]\)|0)$/);
      expect(style.getPropertyValue(ALIGN)).toMatch(/^(flex-start|center|flex-end|stretch|baseline)$/);
      expect(style.getPropertyValue(JUSTIFY)).toMatch(/^(flex-start|center|flex-end|space-between)$/);
    });

    it("sets all three on every instance, whichever props are given", () => {
      const style = renderStack({ gap: "space-2" }).style;
      expect(style.getPropertyValue(GAP)).not.toBe("");
      expect(style.getPropertyValue(ALIGN)).not.toBe("");
      expect(style.getPropertyValue(JUSTIFY)).not.toBe("");
    });
  });

  describe("as", () => {
    it("renders the given element", () => {
      const { container } = render(
        <Stack as="ul">
          <li>item</li>
        </Stack>,
      );
      const list = container.querySelector("ul");
      expect(list).toHaveClass("vpg-stack");
      expect(list?.style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
    });
  });

  describe("className", () => {
    it("keeps vpg-stack alongside the caller's class", () => {
      const stack = renderStack({ className: "caller" });
      expect(stack).toHaveClass("vpg-stack", "caller");
    });
  });

  describe("style", () => {
    it("lets a caller's style override the gap custom property", () => {
      const stack = renderStack({ gap: "space-2", style: { "--vpg-stack-gap": "13px" } as never });
      expect(stack.style.getPropertyValue(GAP)).toBe("13px");
    });

    it("keeps the other custom properties when a caller's style sets an ordinary property", () => {
      const stack = renderStack({ style: { color: "red" } });
      expect(stack.style.color).toBe("red");
      expect(stack.style.getPropertyValue(GAP)).toBe("var(--vpg-space-4)");
    });
  });

  describe("ref", () => {
    it("reaches the rendered element", () => {
      const ref = createRef<HTMLDivElement>();
      const { container } = render(<Stack ref={ref} />);
      expect(ref.current).toBe(container.querySelector(".vpg-stack"));
    });
  });

  it("forwards other attributes to the element", () => {
    const stack = renderStack({ id: "stack-id", "data-testid": "stack" } as never);
    expect(stack).toHaveAttribute("id", "stack-id");
  });
});
