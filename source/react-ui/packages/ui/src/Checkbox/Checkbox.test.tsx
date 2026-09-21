import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { FieldSet } from "../FieldSet/FieldSet.js";
import { Checkbox } from "./Checkbox.js";

describe("Checkbox", () => {
  it("renders a native checkbox input", () => {
    render(<Checkbox aria-label="Agree" />);
    const box = screen.getByRole("checkbox", { name: "Agree" });
    expect(box.tagName).toBe("INPUT");
    expect(box).toHaveAttribute("type", "checkbox");
  });

  it("renders the bare input with no wrapping label when label is absent", () => {
    const { container } = render(<Checkbox aria-label="Agree" />);
    expect(container.querySelector("label")).toBeNull();
  });

  it("wraps the input in a label that names it when label is given", () => {
    const { container } = render(<Checkbox label="Agree" />);
    const row = container.querySelector("label.vpg-checkbox-row");
    expect(row).not.toBeNull();
    expect(row).toContainElement(screen.getByRole("checkbox", { name: "Agree" }));
    expect(row?.querySelector(".vpg-checkbox-label")).toHaveTextContent("Agree");
  });

  it("composes a caller-supplied className alongside its own class", () => {
    render(<Checkbox aria-label="Agree" className="custom" />);
    const box = screen.getByRole("checkbox", { name: "Agree" });
    expect(box).toHaveClass("custom");
    expect(box).toHaveClass("vpg-checkbox");
  });

  it("sets the DOM indeterminate property when indeterminate is true", () => {
    render(<Checkbox aria-label="Agree" indeterminate />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(true);
  });

  it("leaves the DOM indeterminate property false by default", () => {
    render(<Checkbox aria-label="Agree" />);
    expect((screen.getByRole("checkbox") as HTMLInputElement).indeterminate).toBe(false);
  });

  it("never sets aria-checked and never emits an indeterminate attribute", () => {
    render(<Checkbox aria-label="Agree" indeterminate />);
    const box = screen.getByRole("checkbox");
    expect(box).not.toHaveAttribute("aria-checked");
    expect(box).not.toHaveAttribute("indeterminate");
  });

  it("re-applies indeterminate on a re-render with unchanged props after a click cleared it", () => {
    const { rerender } = render(<Checkbox aria-label="Agree" indeterminate />);
    const box = screen.getByRole("checkbox") as HTMLInputElement;
    fireEvent.click(box);
    expect(box.indeterminate).toBe(false);
    rerender(<Checkbox aria-label="Agree" indeterminate />);
    expect(box.indeterminate).toBe(true);
  });

  it("supports the uncontrolled defaultChecked prop", () => {
    render(<Checkbox aria-label="Agree" defaultChecked />);
    const box = screen.getByRole("checkbox");
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(box).not.toBeChecked();
  });

  it("follows the checked prop and reports changes when controlled", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Checkbox aria-label="Agree" checked={false} onChange={onChange} />);
    const box = screen.getByRole("checkbox");
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(box).not.toBeChecked();
    rerender(<Checkbox aria-label="Agree" checked onChange={onChange} />);
    expect(box).toBeChecked();
  });

  it("disables the input when disabled", () => {
    render(<Checkbox aria-label="Agree" disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });

  it("is disabled by an enclosing disabled FieldSet", () => {
    render(
      <FieldSet legend="Terms" disabled>
        <Checkbox label="Agree" />
      </FieldSet>,
    );
    expect(screen.getByRole("checkbox", { name: "Agree" })).toBeDisabled();
  });

  describe("ref", () => {
    it("calls a function ref with the input", () => {
      const ref = vi.fn();
      render(<Checkbox aria-label="Agree" ref={ref} />);
      expect(ref).toHaveBeenCalledWith(screen.getByRole("checkbox"));
    });

    it("assigns an object ref to the input", () => {
      const ref = createRef<HTMLInputElement>();
      render(<Checkbox aria-label="Agree" ref={ref} />);
      expect(ref.current).toBe(screen.getByRole("checkbox"));
    });

    it("renders without a ref", () => {
      expect(() => render(<Checkbox aria-label="Agree" />)).not.toThrow();
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of checkboxes", () => {
      render(
        <>
          <Checkbox aria-label="First" />
          <Checkbox aria-label="Second" />
        </>,
      );
      const styles = document.head.querySelectorAll('style[data-href="vpg-checkbox"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-checkbox");
    });
  });
});
