import { act, fireEvent, render, screen } from "@testing-library/react";
import { Numeric } from "@vipengele/ts-core-common/types/numeric";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NumberInput } from "./NumberInput.js";

// The component formats and parses at the runtime's own resolved locale, so every expectation
// about what is in the box is computed with the same helpers rather than written as a literal —
// a literal would spell one locale's grouping and fail on a machine set to another.
const locale = Intl.NumberFormat().resolvedOptions().locale;
const formatted = (value: number) => Numeric.format(value, locale);

const field = () => screen.getByRole("spinbutton", { name: "Amount" });
/** The input carrying the form value. It has no role, so no query in `screen` reaches it. */
const hidden = (container: HTMLElement) =>
  [...container.querySelectorAll("input")].find((input) => input.type === "hidden") as HTMLInputElement;
const steppers = () =>
  [screen.getByRole("button", { name: "Increase value" }), screen.getByRole("button", { name: "Decrease value" })] as const;

/** Real focus, not a synthesised event: the stepper buttons are asserted against `activeElement`. */
const focus = (element: HTMLElement) => act(() => element.focus());
const blur = (element: HTMLElement) => act(() => element.blur());
const type = (element: HTMLElement, text: string) => fireEvent.change(element, { target: { value: text } });

describe("NumberInput", () => {
  it("renders a text input in decimal mode rather than a native number input", () => {
    render(<NumberInput aria-label="Amount" />);
    expect(field()).toHaveAttribute("type", "text");
    expect(field()).toHaveAttribute("inputmode", "decimal");
    expect(field()).toHaveAttribute("autocomplete", "off");
  });

  it("marks the input as the shell's growing control and composes a caller's className", () => {
    render(<NumberInput aria-label="Amount" className="custom" />);
    expect(field()).toHaveClass("vpg-number-input", "vpg-field-shell-control", "custom");
    expect(field().parentElement).toHaveClass("vpg-field-shell");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<NumberInput aria-label="Amount" data-testid="target" placeholder="0.00" />);
    expect(screen.getByTestId("target")).toHaveAttribute("placeholder", "0.00");
  });

  it("passes adornments to the shell's slots", () => {
    render(<NumberInput aria-label="Amount" leading={<span>$</span>} trailing={<span>USD</span>} />);
    expect(field().parentElement?.querySelector(".vpg-field-shell-leading")).toHaveTextContent("$");
    expect(field().parentElement?.querySelector(".vpg-field-shell-trailing")).toHaveTextContent("USD");
  });

  it("injects its stylesheet once for any number of inputs", () => {
    render(
      <>
        <NumberInput aria-label="Amount" />
        <NumberInput aria-label="Total" />
      </>,
    );

    const styles = document.head.querySelectorAll('style[data-href="vpg-number-input"]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain(".vpg-number-input {");
  });

  it("never assigns a --vpg-* custom property inline", () => {
    render(<NumberInput aria-label="Amount" defaultValue={1} steppers />);
    expect(field().getAttribute("style")).toBeNull();
    expect(steppers()[0].getAttribute("style")).toBeNull();
  });

  describe("spinbutton semantics", () => {
    it("reports the committed value through aria-valuenow and aria-valuetext", () => {
      render(<NumberInput aria-label="Amount" min={0} max={9000} defaultValue={1234.5} />);
      expect(field()).toHaveAttribute("aria-valuemin", "0");
      expect(field()).toHaveAttribute("aria-valuemax", "9000");
      expect(field()).toHaveAttribute("aria-valuenow", "1234.5");
      expect(field()).toHaveAttribute("aria-valuetext", formatted(1234.5));
    });

    it("omits the bounds it was not given, and still steps", () => {
      render(<NumberInput aria-label="Amount" defaultValue={4} />);
      expect(field()).not.toHaveAttribute("aria-valuemin");
      expect(field()).not.toHaveAttribute("aria-valuemax");

      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(field()).toHaveAttribute("aria-valuenow", "5");
    });

    it("omits aria-valuenow and aria-valuetext while there is no value", () => {
      render(<NumberInput aria-label="Amount" />);
      expect(field()).not.toHaveAttribute("aria-valuenow");
      expect(field()).not.toHaveAttribute("aria-valuetext");
      expect(field()).toHaveValue("");
    });

    it("shows the committed value formatted for the locale", () => {
      render(<NumberInput aria-label="Amount" value={1234.5} />);
      expect(field()).toHaveValue(formatted(1234.5));
    });
  });

  describe("stepping", () => {
    it("steps up and down by one by default", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={4} onChange={onChange} />);

      fireEvent.keyDown(field(), { key: "ArrowUp" });
      fireEvent.keyDown(field(), { key: "ArrowDown" });
      expect(onChange.mock.calls).toEqual([[5], [4]]);
    });

    it("steps by the given step", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={10} step={5} onChange={onChange} />);

      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith(15);
    });

    it("steps from the text on screen rather than the last committed value", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={4} onChange={onChange} />);

      focus(field());
      type(field(), "10");
      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith(11);
    });

    it("steps from zero when the box holds no readable number", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" onChange={onChange} />);

      focus(field());
      type(field(), "not a number");
      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith(1);
    });

    it("rounds each step to the step's own precision", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={0} step={0.1} onChange={onChange} />);

      fireEvent.keyDown(field(), { key: "ArrowUp" });
      fireEvent.keyDown(field(), { key: "ArrowUp" });
      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(onChange.mock.calls).toEqual([[0.1], [0.2], [0.3]]);
      expect(field()).toHaveValue(formatted(0.3));
    });

    it("reads the precision of a step written in exponent notation", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={0} step={1e-7} onChange={onChange} />);

      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith(1e-7);
    });

    it("caps the precision a step can demand", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={0} step={0.30000000000000004} onChange={onChange} />);

      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith(0.3);
    });

    it("clamps a step to the bounds", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" min={0} max={10} defaultValue={9.5} step={1} onChange={onChange} />);

      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(onChange).toHaveBeenLastCalledWith(10);

      focus(field());
      type(field(), "0.5");
      fireEvent.keyDown(field(), { key: "ArrowDown" });
      expect(onChange).toHaveBeenLastCalledWith(0);
    });

    it("takes the arrow keys away from the browser", () => {
      render(<NumberInput aria-label="Amount" defaultValue={1} />);
      expect(fireEvent.keyDown(field(), { key: "ArrowUp" })).toBe(false);
      expect(fireEvent.keyDown(field(), { key: "ArrowDown" })).toBe(false);
    });

    it("leaves every other key alone", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={1} onChange={onChange} />);

      expect(fireEvent.keyDown(field(), { key: "a" })).toBe(true);
      expect(onChange).not.toHaveBeenCalled();
    });

    it("steps without an onChange handler", () => {
      render(<NumberInput aria-label="Amount" defaultValue={1} />);
      fireEvent.keyDown(field(), { key: "ArrowUp" });
      expect(field()).toHaveValue(formatted(2));
    });
  });

  describe("committing", () => {
    it("reports nothing per keystroke", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" onChange={onChange} />);

      focus(field());
      type(field(), "1");
      type(field(), "12");
      expect(onChange).not.toHaveBeenCalled();
    });

    it("commits on blur and reformats what it read", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" onChange={onChange} />);

      focus(field());
      type(field(), "1234.5");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(1234.5);
      expect(field()).toHaveValue(formatted(1234.5));
    });

    it("commits on Enter", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" onChange={onChange} />);

      focus(field());
      type(field(), "42");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith(42);
    });

    it("has the form value in the DOM before Enter's own handler returns", () => {
      // The browser's implicit submission reads the hidden input in this same tick. Reading it
      // from a handler that runs after the component's own proves the commit was flushed rather
      // than left to React's end-of-event batch.
      let valueDuringKeyDown: string | undefined;
      const { container } = render(
        <form>
          <NumberInput
            aria-label="Amount"
            name="amount"
            onKeyDown={() => {
              valueDuringKeyDown = hidden(container).value;
            }}
          />
        </form>,
      );

      focus(field());
      type(field(), "42");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(valueDuringKeyDown).toBe("42");
    });

    it("ignores an Enter that ends an IME composition", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" onChange={onChange} />);

      focus(field());
      type(field(), "42");
      fireEvent.keyDown(field(), { key: "Enter", isComposing: true });
      expect(onChange).not.toHaveBeenCalled();

      fireEvent.keyDown(field(), { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith(42);
    });

    it("re-reads nothing when the text has not moved since the last commit", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={7} onChange={onChange} />);

      focus(field());
      blur(field());
      expect(onChange).not.toHaveBeenCalled();
    });

    it("round-trips a value written with the locale's own grouping", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" onChange={onChange} />);

      focus(field());
      type(field(), formatted(1234.5));
      blur(field());
      expect(onChange).toHaveBeenCalledWith(1234.5);
    });

    it("commits an emptied field as no value, and does not call that a mistake", () => {
      const onChange = vi.fn();
      const { container } = render(<NumberInput aria-label="Amount" name="amount" defaultValue={7} onChange={onChange} />);

      focus(field());
      type(field(), "");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(undefined);
      expect(field()).not.toHaveAttribute("aria-invalid");
      expect(hidden(container)).toHaveValue("");
    });

    it("treats a box holding only whitespace the same as an empty one", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={7} onChange={onChange} />);

      focus(field());
      type(field(), "   ");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(undefined);
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("keeps an unreadable string on screen and flags it", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" onChange={onChange} />);

      focus(field());
      type(field(), "twelve");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(undefined);
      expect(field()).toHaveValue("twelve");
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("clears the flag once the box holds a number again", () => {
      render(<NumberInput aria-label="Amount" />);

      focus(field());
      type(field(), "twelve");
      blur(field());
      focus(field());
      type(field(), "12");
      blur(field());
      expect(field()).not.toHaveAttribute("aria-invalid");
      expect(field()).toHaveValue(formatted(12));
    });
  });

  describe("out of range", () => {
    it("commits a typed value above the maximum as typed, and flags it", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" min={0} max={10} onChange={onChange} />);

      focus(field());
      type(field(), "99");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(99);
      expect(field()).toHaveAttribute("aria-valuenow", "99");
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("commits a typed value below the minimum as typed, and flags it", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" min={0} max={10} onChange={onChange} />);

      focus(field());
      type(field(), "-5");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(-5);
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("controlled", () => {
    it("leaves the edit under the caret alone when the value changes", () => {
      const { rerender } = render(<NumberInput aria-label="Amount" value={1} />);

      focus(field());
      type(field(), "23");
      rerender(<NumberInput aria-label="Amount" value={9} />);
      expect(field()).toHaveValue("23");
    });

    it("shows the new value once focus has left", () => {
      const { rerender } = render(<NumberInput aria-label="Amount" value={1} />);
      rerender(<NumberInput aria-label="Amount" value={9} />);
      expect(field()).toHaveValue(formatted(9));
    });

    it("reverts to the value the parent kept when a commit is not adopted", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" value={1} onChange={onChange} />);

      focus(field());
      type(field(), "23");
      blur(field());
      expect(onChange).toHaveBeenCalledWith(23);
      expect(field()).toHaveValue(formatted(1));
    });

    it("adopts what a parent stores, formatted, once focus has left", () => {
      function Controlled() {
        const [amount, setAmount] = useState<number | undefined>(1);
        return <NumberInput aria-label="Amount" value={amount} onChange={setAmount} />;
      }
      render(<Controlled />);

      focus(field());
      type(field(), "1234.5");
      blur(field());
      expect(field()).toHaveValue(formatted(1234.5));
    });

    it("clears a stuck invalid flag once a parent moves the value on without adopting the failed commit", () => {
      const { rerender } = render(<NumberInput aria-label="Amount" value={5} />);

      focus(field());
      type(field(), "twelve");
      blur(field());
      expect(field()).toHaveValue("twelve");
      expect(field()).toHaveAttribute("aria-invalid", "true");

      rerender(<NumberInput aria-label="Amount" value={7} />);
      expect(field()).toHaveValue(formatted(7));
      expect(field()).not.toHaveAttribute("aria-invalid");
    });

    it("clears a stuck invalid flag on blur when the value moved on while still focused", () => {
      const { rerender } = render(<NumberInput aria-label="Amount" value={5} />);

      focus(field());
      type(field(), "twelve");
      fireEvent.keyDown(field(), { key: "Enter" });
      expect(field()).toHaveAttribute("aria-invalid", "true");

      rerender(<NumberInput aria-label="Amount" value={7} />);
      expect(field()).toHaveValue("twelve");

      blur(field());
      expect(field()).toHaveValue(formatted(7));
      expect(field()).not.toHaveAttribute("aria-invalid");
    });
  });

  describe("hidden input", () => {
    it("carries the name and the unformatted value", () => {
      const { container } = render(<NumberInput aria-label="Amount" name="amount" defaultValue={1234.5} />);
      expect(hidden(container)).toHaveAttribute("name", "amount");
      expect(hidden(container)).toHaveValue("1234.5");
      expect(field()).not.toHaveAttribute("name");
    });

    it("carries nothing when there is no value", () => {
      const { container } = render(<NumberInput aria-label="Amount" name="amount" />);
      expect(hidden(container)).toHaveValue("");
    });
  });

  describe("steppers", () => {
    it("renders no stepper buttons unless asked for them", () => {
      render(<NumberInput aria-label="Amount" />);
      expect(screen.queryByRole("button")).toBeNull();
      expect(document.querySelector(".vpg-number-input-steppers")).toBeNull();
    });

    it("puts the steppers after a caller's own trailing adornment", () => {
      render(<NumberInput aria-label="Amount" trailing={<span>USD</span>} steppers />);
      const trailing = field().parentElement?.querySelector(".vpg-field-shell-trailing");
      expect(trailing?.firstElementChild).toHaveTextContent("USD");
      expect(trailing?.lastElementChild).toHaveClass("vpg-number-input-steppers");
    });

    it("steps by the same amount a key does", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={4} step={0.1} onChange={onChange} steppers />);
      const [increase, decrease] = steppers();

      fireEvent.click(increase);
      fireEvent.click(decrease);
      const byButton = onChange.mock.calls;

      onChange.mockClear();
      fireEvent.keyDown(field(), { key: "ArrowUp" });
      fireEvent.keyDown(field(), { key: "ArrowDown" });
      expect(onChange.mock.calls).toEqual(byButton);
    });

    it("clamps a press the way it clamps a key", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" min={0} max={5} defaultValue={5} onChange={onChange} steppers />);

      fireEvent.click(steppers()[0]);
      expect(onChange).toHaveBeenLastCalledWith(5);
    });

    it("pulls focus to the input rather than to itself", () => {
      render(<NumberInput aria-label="Amount" defaultValue={1} steppers />);

      fireEvent.click(steppers()[0]);
      expect(document.activeElement).toBe(field());
    });

    it("leaves focus on the input it already had", () => {
      const onChange = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={1} onChange={onChange} steppers />);

      focus(field());
      fireEvent.click(steppers()[0]);
      expect(document.activeElement).toBe(field());
      expect(onChange.mock.calls).toEqual([[2]]);
    });

    it("stops the press from moving focus at all", () => {
      render(<NumberInput aria-label="Amount" defaultValue={1} steppers />);
      expect(fireEvent.mouseDown(steppers()[0])).toBe(false);
    });

    it("submits nothing and takes no tab stop", () => {
      render(<NumberInput aria-label="Amount" defaultValue={1} steppers />);
      for (const button of steppers()) {
        expect(button).toHaveAttribute("type", "button");
        expect(button).toHaveAttribute("tabindex", "-1");
      }
    });
  });

  describe("disabled and invalid", () => {
    it("disables the input, the form value and both steppers", () => {
      const { container } = render(<NumberInput aria-label="Amount" name="amount" defaultValue={1} disabled steppers />);
      expect(field()).toBeDisabled();
      expect(hidden(container)).toBeDisabled();
      for (const button of steppers()) {
        expect(button).toBeDisabled();
      }
    });

    it("honours a caller's own aria-invalid", () => {
      render(<NumberInput aria-label="Amount" defaultValue={1} aria-invalid />);
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("stays invalid when the caller says so and the value is readable and in range", () => {
      render(<NumberInput aria-label="Amount" min={0} max={10} defaultValue={5} aria-invalid />);
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });

    it("is invalid when it reads a mistake even though the caller says otherwise", () => {
      render(<NumberInput aria-label="Amount" aria-invalid={false} />);

      focus(field());
      type(field(), "twelve");
      blur(field());
      expect(field()).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("ref and handlers", () => {
    it("points an object ref at the visible input", () => {
      const ref = createRef<HTMLInputElement>();
      render(<NumberInput aria-label="Amount" name="amount" ref={ref} />);
      expect(ref.current).toBe(field());
    });

    it("points a callback ref at the visible input", () => {
      const seen: (HTMLInputElement | null)[] = [];
      render(
        <NumberInput
          aria-label="Amount"
          ref={(node) => {
            seen.push(node);
          }}
        />,
      );
      expect(seen[0]).toBe(field());
    });

    it("calls a caller's focus, blur and keydown handlers", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const onKeyDown = vi.fn();
      render(<NumberInput aria-label="Amount" defaultValue={1} onFocus={onFocus} onBlur={onBlur} onKeyDown={onKeyDown} />);

      focus(field());
      fireEvent.keyDown(field(), { key: "ArrowUp" });
      blur(field());
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });
});
