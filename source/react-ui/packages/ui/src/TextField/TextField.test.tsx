import { fireEvent, render, screen } from "@testing-library/react";
import { type ChangeEvent, createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TextField } from "./TextField.js";

const input = () => screen.getByRole("textbox", { name: "Query" });
const clearButton = () => screen.getByRole("button", { name: "Clear" });
const queryClearButton = () => screen.queryByRole("button", { name: "Clear" });

describe("TextField", () => {
  it("renders a native text input by default", () => {
    render(<TextField aria-label="Email" />);
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field).toBeInTheDocument();
    expect(field).toHaveAttribute("type", "text");
  });

  it("renders with a different native input type", () => {
    render(<TextField aria-label="Password" type="password" />);
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
  });

  it("composes a caller-supplied className alongside its own classes", () => {
    render(<TextField aria-label="Email" className="custom" />);
    const field = screen.getByRole("textbox", { name: "Email" });
    expect(field).toHaveClass("custom");
    expect(field).toHaveClass("vpg-text-field");
  });

  it("forwards arbitrary attributes to the input", () => {
    render(<TextField aria-label="Email" data-testid="target" placeholder="you@example.com" />);
    expect(screen.getByTestId("target")).toHaveAttribute("placeholder", "you@example.com");
  });

  describe("shell", () => {
    it("renders the input inside a field shell", () => {
      render(<TextField aria-label="Email" />);
      const field = screen.getByRole("textbox", { name: "Email" });
      expect(field.parentElement).toHaveClass("vpg-field-shell");
    });

    it("keeps the chrome on the shell and off the input", () => {
      render(<TextField aria-label="Email" className="custom" />);
      const field = screen.getByRole("textbox", { name: "Email" });
      expect(field).not.toHaveClass("vpg-field-shell");
      expect(field.parentElement).not.toHaveClass("vpg-text-field");
      expect(field.parentElement).not.toHaveClass("custom");
    });

    it("renders a leading adornment before the input in the shell's leading slot", () => {
      render(<TextField aria-label="Amount" leading={<span>$</span>} />);
      const field = screen.getByRole("textbox", { name: "Amount" });
      const leading = field.parentElement?.querySelector(".vpg-field-shell-leading");
      expect(leading).toHaveTextContent("$");
      expect(leading?.nextElementSibling).toBe(field);
    });

    it("renders a trailing adornment after the input in the shell's trailing slot", () => {
      render(<TextField aria-label="Amount" trailing={<span>USD</span>} />);
      const field = screen.getByRole("textbox", { name: "Amount" });
      const trailing = field.parentElement?.querySelector(".vpg-field-shell-trailing");
      expect(trailing).toHaveTextContent("USD");
      expect(field.nextElementSibling).toBe(trailing);
    });

    it("renders no slot element for an adornment it is not given", () => {
      render(<TextField aria-label="Email" />);
      const shell = screen.getByRole("textbox", { name: "Email" }).parentElement;
      expect(shell?.querySelector(".vpg-field-shell-leading")).toBeNull();
      expect(shell?.querySelector(".vpg-field-shell-trailing")).toBeNull();
    });

    it("injects the shell's stylesheet alongside its own", () => {
      render(<TextField aria-label="Email" />);
      const styles = document.head.querySelectorAll('style[data-href="vpg-field-shell"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-field-shell {");
    });
  });

  describe("ref", () => {
    it("hands the input to an object ref", () => {
      const ref = createRef<HTMLInputElement>();
      render(<TextField aria-label="Email" ref={ref} />);
      expect(ref.current).toBe(screen.getByRole("textbox", { name: "Email" }));
    });

    it("hands the input to a callback ref and clears it on unmount", () => {
      const ref = vi.fn();
      const { unmount } = render(<TextField aria-label="Email" ref={ref} />);
      expect(ref).toHaveBeenLastCalledWith(screen.getByRole("textbox", { name: "Email" }));

      unmount();

      expect(ref).toHaveBeenLastCalledWith(null);
    });

    it("keeps its own hold on the input alongside the caller's ref, so clearing still works", () => {
      const ref = createRef<HTMLInputElement>();
      render(<TextField aria-label="Query" ref={ref} clearable defaultValue="shoes" />);

      fireEvent.click(clearButton());

      expect(ref.current).toHaveValue("");
    });
  });

  describe("clearable", () => {
    it("shows no clear button unless clearable", () => {
      render(<TextField aria-label="Query" defaultValue="shoes" />);
      expect(queryClearButton()).toBeNull();
    });

    it("hides the clear button while the input is empty", () => {
      render(<TextField aria-label="Query" clearable />);
      expect(queryClearButton()).toBeNull();
    });

    it("hides the clear button while disabled", () => {
      render(<TextField aria-label="Query" clearable disabled defaultValue="shoes" />);
      expect(queryClearButton()).toBeNull();
    });

    it("hides the clear button while read-only", () => {
      render(<TextField aria-label="Query" clearable readOnly value="shoes" />);
      expect(queryClearButton()).toBeNull();
    });

    it("shows the clear button for a non-empty value, named by clearLabel", () => {
      render(<TextField aria-label="Query" clearable clearLabel="Clear search" defaultValue="shoes" />);
      expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
    });

    it("shows the clear button as soon as text is typed into an empty input", () => {
      render(<TextField aria-label="Query" clearable />);

      fireEvent.change(input(), { target: { value: "s" } });

      expect(clearButton()).toBeInTheDocument();
    });

    it("places the clear button after the caller's trailing content, in the trailing slot", () => {
      render(<TextField aria-label="Query" clearable defaultValue="shoes" trailing={<span>USD</span>} />);
      const trailing = input().nextElementSibling;

      expect(trailing).toHaveClass("vpg-field-shell-trailing");
      expect(trailing?.firstElementChild).toHaveTextContent("USD");
      expect(trailing?.lastElementChild).toBe(clearButton());
    });

    it("keeps the input the shell's marked direct child with the clear button showing", () => {
      render(<TextField aria-label="Query" clearable defaultValue="shoes" />);
      expect(input().parentElement).toHaveClass("vpg-field-shell");
      expect(input()).toHaveClass("vpg-field-shell-control");
    });

    it("empties an uncontrolled input, hides the button and focuses the input", () => {
      const onChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => event.target.value);
      render(<TextField aria-label="Query" clearable defaultValue="shoes" onChange={onChange} />);

      fireEvent.click(clearButton());

      expect(input()).toHaveValue("");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveReturnedWith("");
      expect(input()).toHaveFocus();
      expect(queryClearButton()).toBeNull();
    });

    it("reports the clear to a controlled onChange as a change to an empty value", () => {
      function Controlled({ onChange }: { onChange: (value: string) => void }) {
        const [value, setValue] = useState("shoes");
        return (
          <TextField
            aria-label="Query"
            clearable
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              setValue(event.target.value);
            }}
          />
        );
      }
      const onChange = vi.fn();
      render(<Controlled onChange={onChange} />);

      fireEvent.click(clearButton());

      expect(onChange).toHaveBeenCalledExactlyOnceWith("");
      expect(input()).toHaveValue("");
      expect(input()).toHaveFocus();
      expect(queryClearButton()).toBeNull();
    });

    it("keeps a controlled value the parent declines to clear", () => {
      const onChange = vi.fn((event: ChangeEvent<HTMLInputElement>) => event.target.value);
      render(<TextField aria-label="Query" clearable value="shoes" onChange={onChange} />);

      fireEvent.click(clearButton());

      expect(onChange).toHaveReturnedWith("");
      expect(input()).toHaveValue("shoes");
      expect(clearButton()).toBeInTheDocument();
    });

    it("follows a controlled value the parent changes", () => {
      const { rerender } = render(<TextField aria-label="Query" clearable value="" onChange={() => {}} />);
      expect(queryClearButton()).toBeNull();

      rerender(<TextField aria-label="Query" clearable value="shoes" onChange={() => {}} />);
      expect(clearButton()).toBeInTheDocument();

      rerender(<TextField aria-label="Query" clearable value="" onChange={() => {}} />);
      expect(queryClearButton()).toBeNull();
    });

    it("passes every change through to the caller's onChange", () => {
      const onChange = vi.fn();
      render(<TextField aria-label="Query" clearable onChange={onChange} />);

      fireEvent.change(input(), { target: { value: "s" } });

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("leaves the caller's other input handlers in place", () => {
      const onInput = vi.fn();
      render(<TextField aria-label="Query" clearable defaultValue="shoes" onInput={onInput} />);

      fireEvent.click(clearButton());

      expect(onInput).toHaveBeenCalledTimes(1);
    });
  });

  describe("stylesheet", () => {
    it("injects its stylesheet once for any number of text fields", () => {
      render(
        <>
          <TextField aria-label="First" />
          <TextField aria-label="Second" />
        </>,
      );

      const styles = document.head.querySelectorAll('style[data-href="vpg-text-field"]');
      expect(styles).toHaveLength(1);
      expect(styles[0]?.textContent).toContain(".vpg-text-field {");
    });

    it("never assigns a --vpg-* custom property inline", () => {
      render(<TextField aria-label="Email" />);
      expect(screen.getByRole("textbox", { name: "Email" }).getAttribute("style")).toBeNull();
    });
  });

  it("imports and server-renders without DOM globals", async () => {
    vi.stubGlobal("HTMLInputElement", undefined);
    vi.resetModules();
    try {
      const { TextField: Isolated } = await import("./TextField.js");
      expect(() => renderToString(<Isolated aria-label="Q" clearable defaultValue="x" />)).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
