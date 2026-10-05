import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Disclosure } from "../Disclosure/Disclosure.js";
import { Accordion, type AccordionHeadingLevel } from "./Accordion.js";

function trigger(name: string) {
  return screen.getByRole("button", { name });
}

function expanded(name: string) {
  return trigger(name).getAttribute("aria-expanded") === "true";
}

function items() {
  return [
    <Disclosure key="a" value="a" label="Alpha">
      Alpha body
    </Disclosure>,
    <Disclosure key="b" value="b" label="Beta">
      Beta body
    </Disclosure>,
    <Disclosure key="c" value="c" label="Gamma">
      Gamma body
    </Disclosure>,
  ];
}

describe("Accordion", () => {
  describe("single mode", () => {
    it("starts with every item closed when given no defaultValue", () => {
      render(<Accordion>{items()}</Accordion>);
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(false);
      expect(expanded("Gamma")).toBe(false);
    });

    it("starts with the defaultValue item open", () => {
      render(<Accordion defaultValue="b">{items()}</Accordion>);
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(true);
    });

    it("starts with every item closed when defaultValue is null", () => {
      render(<Accordion defaultValue={null}>{items()}</Accordion>);
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(false);
    });

    it("opens one item and closes the other when uncontrolled", () => {
      const onChange = vi.fn();
      render(<Accordion onChange={onChange}>{items()}</Accordion>);

      fireEvent.click(trigger("Alpha"));
      expect(expanded("Alpha")).toBe(true);
      expect(onChange).toHaveBeenLastCalledWith("a");

      fireEvent.click(trigger("Beta"));
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(true);
      expect(onChange).toHaveBeenLastCalledWith("b");
    });

    it("closes the open item when it is toggled, reporting null", () => {
      const onChange = vi.fn();
      render(
        <Accordion defaultValue="a" onChange={onChange}>
          {items()}
        </Accordion>,
      );

      fireEvent.click(trigger("Alpha"));
      expect(expanded("Alpha")).toBe(false);
      expect(onChange).toHaveBeenLastCalledWith(null);
    });

    it("toggles without an onChange", () => {
      render(<Accordion>{items()}</Accordion>);
      fireEvent.click(trigger("Gamma"));
      expect(expanded("Gamma")).toBe(true);
    });

    it("follows value when controlled, reporting a click without acting on it", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <Accordion value="a" onChange={onChange}>
          {items()}
        </Accordion>,
      );
      expect(expanded("Alpha")).toBe(true);

      fireEvent.click(trigger("Beta"));
      expect(onChange).toHaveBeenLastCalledWith("b");
      expect(expanded("Alpha")).toBe(true);
      expect(expanded("Beta")).toBe(false);

      fireEvent.click(trigger("Alpha"));
      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(expanded("Alpha")).toBe(true);

      rerender(
        <Accordion value="b" onChange={onChange}>
          {items()}
        </Accordion>,
      );
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(true);
    });

    it("opens nothing when controlled with null, and updates through its owner", () => {
      function Owner() {
        const [value, setValue] = useState<string | null>(null);
        return (
          <Accordion value={value} onChange={setValue}>
            {items()}
          </Accordion>
        );
      }
      render(<Owner />);
      expect(expanded("Alpha")).toBe(false);

      fireEvent.click(trigger("Alpha"));
      expect(expanded("Alpha")).toBe(true);

      fireEvent.click(trigger("Gamma"));
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Gamma")).toBe(true);

      fireEvent.click(trigger("Gamma"));
      expect(expanded("Gamma")).toBe(false);
    });
  });

  describe("multiple mode", () => {
    it("starts with every item closed when given no defaultValue", () => {
      render(<Accordion multiple>{items()}</Accordion>);
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(false);
      expect(expanded("Gamma")).toBe(false);
    });

    it("starts with the defaultValue items open, leaving the passed-in set unchanged", () => {
      const initial = new Set(["a", "c"]);
      const onChange = vi.fn();
      render(
        <Accordion multiple defaultValue={initial} onChange={onChange}>
          {items()}
        </Accordion>,
      );
      expect(expanded("Alpha")).toBe(true);
      expect(expanded("Beta")).toBe(false);
      expect(expanded("Gamma")).toBe(true);

      fireEvent.click(trigger("Alpha"));
      fireEvent.click(trigger("Beta"));
      expect(initial).toEqual(new Set(["a", "c"]));
      expect(onChange).toHaveBeenLastCalledWith(new Set(["b", "c"]));
    });

    it("keeps its own open items when the caller mutates the defaultValue set after mount", () => {
      const initial = new Set(["a"]);
      const { rerender } = render(
        <Accordion multiple defaultValue={initial}>
          {items()}
        </Accordion>,
      );

      initial.add("c");
      rerender(
        <Accordion multiple defaultValue={initial}>
          {items()}
        </Accordion>,
      );
      expect(expanded("Alpha")).toBe(true);
      expect(expanded("Gamma")).toBe(false);
    });

    it("toggles items independently when uncontrolled, reporting a new set every time", () => {
      const onChange = vi.fn();
      render(
        <Accordion multiple onChange={onChange}>
          {items()}
        </Accordion>,
      );

      fireEvent.click(trigger("Alpha"));
      fireEvent.click(trigger("Beta"));
      expect(expanded("Alpha")).toBe(true);
      expect(expanded("Beta")).toBe(true);

      fireEvent.click(trigger("Alpha"));
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(true);

      const reported = onChange.mock.calls.map(([set]) => set as ReadonlySet<string>);
      expect(reported).toEqual([new Set(["a"]), new Set(["a", "b"]), new Set(["b"])]);
      expect(new Set(reported).size).toBe(reported.length);
    });

    it("toggles without an onChange", () => {
      render(<Accordion multiple>{items()}</Accordion>);
      fireEvent.click(trigger("Beta"));
      expect(expanded("Beta")).toBe(true);
    });

    it("follows value when controlled, never mutating it", () => {
      const value = new Set(["a"]);
      const onChange = vi.fn();
      const { rerender } = render(
        <Accordion multiple value={value} onChange={onChange}>
          {items()}
        </Accordion>,
      );

      fireEvent.click(trigger("Beta"));
      expect(onChange).toHaveBeenLastCalledWith(new Set(["a", "b"]));
      expect(onChange.mock.lastCall?.[0]).not.toBe(value);
      expect(expanded("Beta")).toBe(false);

      fireEvent.click(trigger("Alpha"));
      expect(onChange).toHaveBeenLastCalledWith(new Set());
      expect(expanded("Alpha")).toBe(true);
      expect(value).toEqual(new Set(["a"]));

      rerender(
        <Accordion multiple value={new Set(["b", "c"])} onChange={onChange}>
          {items()}
        </Accordion>,
      );
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(true);
      expect(expanded("Gamma")).toBe(true);
    });

    it("updates through its owner when controlled", () => {
      function Owner() {
        const [value, setValue] = useState<ReadonlySet<string>>(new Set());
        return (
          <Accordion multiple value={value} onChange={setValue}>
            {items()}
          </Accordion>
        );
      }
      render(<Owner />);

      fireEvent.click(trigger("Alpha"));
      fireEvent.click(trigger("Gamma"));
      expect(expanded("Alpha")).toBe(true);
      expect(expanded("Gamma")).toBe(true);

      fireEvent.click(trigger("Alpha"));
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Gamma")).toBe(true);
    });
  });

  describe("headingLevel", () => {
    it("wraps each trigger in an h3 by default", () => {
      render(<Accordion>{items()}</Accordion>);
      expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
      expect(trigger("Alpha").parentElement?.tagName).toBe("H3");
    });

    it.each<AccordionHeadingLevel>([2, 4, 5, 6])("wraps each trigger in an h%i", (level) => {
      render(<Accordion headingLevel={level}>{items()}</Accordion>);
      expect(screen.getAllByRole("heading", { level })).toHaveLength(3);
      expect(trigger("Beta").parentElement?.tagName).toBe(`H${level}`);
    });
  });

  describe("the disclosures it groups", () => {
    it("ignores a disclosure's own open and defaultOpen, still firing its onOpenChange", () => {
      const onOpenChange = vi.fn();
      const onChange = vi.fn();
      render(
        <Accordion onChange={onChange}>
          <Disclosure value="a" label="Alpha" open onOpenChange={onOpenChange}>
            Alpha body
          </Disclosure>
          <Disclosure value="b" label="Beta" defaultOpen>
            Beta body
          </Disclosure>
        </Accordion>,
      );
      expect(expanded("Alpha")).toBe(false);
      expect(expanded("Beta")).toBe(false);

      fireEvent.click(trigger("Alpha"));
      expect(onOpenChange).toHaveBeenLastCalledWith(true);
      expect(onChange).toHaveBeenLastCalledWith("a");
      expect(expanded("Alpha")).toBe(true);

      fireEvent.click(trigger("Alpha"));
      expect(onOpenChange).toHaveBeenLastCalledWith(false);
      expect(onChange).toHaveBeenLastCalledWith(null);
      expect(expanded("Alpha")).toBe(false);
    });

    it("leaves a disclosure nested in an item's panel standing alone", () => {
      const onChange = vi.fn();
      const onNestedOpenChange = vi.fn();
      render(
        <Accordion defaultValue="a" onChange={onChange}>
          <Disclosure value="a" label="Alpha">
            <Disclosure value="nested" label="Nested" defaultOpen onOpenChange={onNestedOpenChange}>
              Nested body
            </Disclosure>
          </Disclosure>
          <Disclosure value="b" label="Beta">
            Beta body
          </Disclosure>
        </Accordion>,
      );
      expect(expanded("Nested")).toBe(true);
      expect(trigger("Nested").parentElement?.tagName).not.toMatch(/^H\d$/);
      expect(screen.getAllByRole("heading")).toHaveLength(2);

      fireEvent.click(trigger("Nested"));
      expect(onNestedOpenChange).toHaveBeenLastCalledWith(false);
      expect(expanded("Nested")).toBe(false);
      expect(expanded("Alpha")).toBe(true);
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.click(trigger("Nested"));
      expect(onNestedOpenChange).toHaveBeenLastCalledWith(true);
      expect(expanded("Nested")).toBe(true);
      expect(expanded("Alpha")).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("leaves a controlled disclosure nested in an item's panel following its own open", () => {
      const onChange = vi.fn();
      const onNestedOpenChange = vi.fn();
      render(
        <Accordion defaultValue="a" onChange={onChange}>
          <Disclosure value="a" label="Alpha">
            <Disclosure label="Nested" open onOpenChange={onNestedOpenChange}>
              Nested body
            </Disclosure>
          </Disclosure>
        </Accordion>,
      );
      expect(expanded("Nested")).toBe(true);

      fireEvent.click(trigger("Nested"));
      expect(onNestedOpenChange).toHaveBeenLastCalledWith(false);
      expect(expanded("Nested")).toBe(true);
      expect(expanded("Alpha")).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("root element", () => {
    it("merges className, spreads the rest and forwards ref", () => {
      const ref = createRef<HTMLDivElement>();
      render(
        <Accordion ref={ref} className="extra" id="faq" data-testid="accordion" aria-label="FAQ">
          {items()}
        </Accordion>,
      );
      const root = screen.getByTestId("accordion");
      expect(root).toHaveClass("vpg-accordion", "extra");
      expect(root).toHaveAttribute("id", "faq");
      expect(root).toHaveAttribute("aria-label", "FAQ");
      expect(ref.current).toBe(root);
    });

    it("carries only its own class without a className", () => {
      render(<Accordion data-testid="accordion">{items()}</Accordion>);
      expect(screen.getByTestId("accordion").className).toBe("vpg-accordion");
    });

    it("injects one stylesheet for any number of accordions", () => {
      render(
        <>
          <Accordion>{items().slice(0, 1)}</Accordion>
          <Accordion multiple>{items().slice(1)}</Accordion>
        </>,
      );
      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const styles = document.querySelectorAll('style[data-href="vpg-accordion"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-accordion {");
    });
  });
});
