import { fireEvent, render, screen } from "@testing-library/react";
import { type ChangeEvent, createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Textarea } from "./Textarea.js";

const textarea = () => screen.getByRole("textbox", { name: "Notes" });
const clearButton = () => screen.getByRole("button", { name: "Clear" });
const queryClearButton = () => screen.queryByRole("button", { name: "Clear" });

describe("Textarea", () => {
  it("renders a native textarea", () => {
    render(<Textarea aria-label="Notes" />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("rows", "3");
  });

  it("forwards arbitrary attributes and rows to the textarea", () => {
    render(<Textarea aria-label="Notes" data-testid="target" placeholder="Write here" rows={6} />);
    const field = screen.getByTestId("target");
    expect(field).toHaveAttribute("placeholder", "Write here");
    expect(field).toHaveAttribute("rows", "6");
  });

  it("orders its classes as component, shell-control marker, then the caller's", () => {
    render(<Textarea aria-label="Notes" className="custom" />);
    expect(screen.getByRole("textbox", { name: "Notes" }).className).toBe("vpg-textarea vpg-field-shell-control custom");
  });

  it("omits a caller className that is absent", () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByRole("textbox", { name: "Notes" }).className).toBe("vpg-textarea vpg-field-shell-control");
  });

  it("is a direct child of the field shell", () => {
    render(<Textarea aria-label="Notes" />);
    expect(screen.getByRole("textbox", { name: "Notes" }).parentElement).toHaveClass("vpg-field-shell");
  });

  it("renders a leading adornment before the textarea", () => {
    render(<Textarea aria-label="Notes" leading={<span>L</span>} />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    const leading = field.parentElement?.querySelector(".vpg-field-shell-leading");
    expect(leading).toHaveTextContent("L");
    expect(leading?.nextElementSibling).toBe(field);
  });

  it("renders a trailing adornment after the textarea", () => {
    render(<Textarea aria-label="Notes" trailing={<span>T</span>} />);
    const field = screen.getByRole("textbox", { name: "Notes" });
    const trailing = field.parentElement?.querySelector(".vpg-field-shell-trailing");
    expect(trailing).toHaveTextContent("T");
    expect(field.nextElementSibling).toBe(trailing);
  });

  it("injects its stylesheet once for any number of instances", () => {
    render(
      <>
        <Textarea aria-label="One" />
        <Textarea aria-label="Two" />
        <Textarea aria-label="Three" />
      </>,
    );
    expect(document.head.querySelectorAll('style[data-href="vpg-textarea"]')).toHaveLength(1);
  });

  describe("ref", () => {
    it("hands the textarea to an object ref", () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea aria-label="Notes" ref={ref} />);
      expect(ref.current).toBe(textarea());
    });

    it("hands the textarea to a callback ref and clears it on unmount", () => {
      const ref = vi.fn();
      const { unmount } = render(<Textarea aria-label="Notes" autoGrow ref={ref} />);
      expect(ref).toHaveBeenLastCalledWith(textarea());

      unmount();

      expect(ref).toHaveBeenLastCalledWith(null);
    });

    it("clears an object ref on unmount", () => {
      const ref = createRef<HTMLTextAreaElement>();
      const { unmount } = render(<Textarea aria-label="Notes" ref={ref} />);
      expect(ref.current).toBe(textarea());

      unmount();

      expect(ref.current).toBeNull();
    });

    it("runs the cleanup a callback ref returns on unmount, without calling the ref with null", () => {
      const cleanup = vi.fn();
      const ref = vi.fn(() => cleanup);
      const { unmount } = render(<Textarea aria-label="Notes" ref={ref} />);
      expect(ref).toHaveBeenCalledTimes(1);
      expect(cleanup).not.toHaveBeenCalled();

      unmount();

      expect(cleanup).toHaveBeenCalledTimes(1);
      expect(ref).toHaveBeenCalledTimes(1);
      expect(ref).not.toHaveBeenCalledWith(null);
    });

    it("keeps its own hold on the textarea alongside the caller's ref, so clearing still works", () => {
      const ref = createRef<HTMLTextAreaElement>();
      render(<Textarea aria-label="Notes" ref={ref} clearable defaultValue="draft" />);

      fireEvent.click(clearButton());

      expect(ref.current).toHaveValue("");
    });
  });

  describe("clearable", () => {
    it("shows no clear button unless clearable", () => {
      render(<Textarea aria-label="Notes" defaultValue="draft" />);
      expect(queryClearButton()).toBeNull();
    });

    it("hides the clear button while the textarea is empty", () => {
      render(<Textarea aria-label="Notes" clearable />);
      expect(queryClearButton()).toBeNull();
    });

    it("hides the clear button while disabled", () => {
      render(<Textarea aria-label="Notes" clearable disabled defaultValue="draft" />);
      expect(queryClearButton()).toBeNull();
    });

    it("hides the clear button while read-only", () => {
      render(<Textarea aria-label="Notes" clearable readOnly value="draft" />);
      expect(queryClearButton()).toBeNull();
    });

    it("shows the clear button for a non-empty value, named by clearLabel", () => {
      render(<Textarea aria-label="Notes" clearable clearLabel="Clear notes" defaultValue="draft" />);
      expect(screen.getByRole("button", { name: "Clear notes" })).toBeInTheDocument();
    });

    it("shows the clear button on an auto-growing field too", () => {
      render(<Textarea aria-label="Notes" autoGrow maxRows={6} clearable defaultValue="draft" />);
      expect(clearButton()).toBeInTheDocument();
    });

    it("shows the clear button as soon as text is typed into an empty textarea", () => {
      render(<Textarea aria-label="Notes" clearable />);

      fireEvent.change(textarea(), { target: { value: "d" } });

      expect(clearButton()).toBeInTheDocument();
    });

    it("places the clear button after the caller's trailing content, in the trailing slot", () => {
      render(<Textarea aria-label="Notes" clearable defaultValue="draft" trailing={<span>T</span>} />);
      const trailing = textarea().nextElementSibling;

      expect(trailing).toHaveClass("vpg-field-shell-trailing");
      expect(trailing?.firstElementChild).toHaveTextContent("T");
      expect(trailing?.lastElementChild).toBe(clearButton());
    });

    it("keeps the textarea the shell's marked direct child with the clear button showing", () => {
      render(<Textarea aria-label="Notes" clearable defaultValue="draft" />);
      expect(textarea().parentElement).toHaveClass("vpg-field-shell");
      expect(textarea()).toHaveClass("vpg-field-shell-control");
    });

    it("empties an uncontrolled textarea, hides the button and focuses the textarea", () => {
      const onChange = vi.fn((event: ChangeEvent<HTMLTextAreaElement>) => event.target.value);
      render(<Textarea aria-label="Notes" clearable defaultValue={"first\nsecond"} onChange={onChange} />);

      fireEvent.click(clearButton());

      expect(textarea()).toHaveValue("");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveReturnedWith("");
      expect(textarea()).toHaveFocus();
      expect(queryClearButton()).toBeNull();
    });

    it("reports the clear to a controlled onChange as a change to an empty value", () => {
      function Controlled({ onChange }: { onChange: (value: string) => void }) {
        const [value, setValue] = useState("draft");
        return (
          <Textarea
            aria-label="Notes"
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
      expect(textarea()).toHaveValue("");
      expect(textarea()).toHaveFocus();
      expect(queryClearButton()).toBeNull();
    });

    it("keeps a controlled value the parent declines to clear", () => {
      const onChange = vi.fn((event: ChangeEvent<HTMLTextAreaElement>) => event.target.value);
      render(<Textarea aria-label="Notes" clearable value="draft" onChange={onChange} />);

      fireEvent.click(clearButton());

      expect(onChange).toHaveReturnedWith("");
      expect(textarea()).toHaveValue("draft");
      expect(clearButton()).toBeInTheDocument();
    });

    it("follows a controlled value the parent changes", () => {
      const { rerender } = render(<Textarea aria-label="Notes" clearable value="" onChange={() => {}} />);
      expect(queryClearButton()).toBeNull();

      rerender(<Textarea aria-label="Notes" clearable value="draft" onChange={() => {}} />);
      expect(clearButton()).toBeInTheDocument();

      rerender(<Textarea aria-label="Notes" clearable value="" onChange={() => {}} />);
      expect(queryClearButton()).toBeNull();
    });

    it("passes every change through to the caller's onChange", () => {
      const onChange = vi.fn();
      render(<Textarea aria-label="Notes" clearable onChange={onChange} />);

      fireEvent.change(textarea(), { target: { value: "d" } });

      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("leaves the caller's other input handlers in place", () => {
      const onInput = vi.fn();
      render(<Textarea aria-label="Notes" clearable defaultValue="draft" onInput={onInput} />);

      fireEvent.click(clearButton());

      expect(onInput).toHaveBeenCalledTimes(1);
    });
  });

  describe("fixed", () => {
    it("carries no inline style and no auto-grow marker", () => {
      render(<Textarea aria-label="Notes" />);
      const field = screen.getByRole("textbox", { name: "Notes" });
      expect(field).not.toHaveAttribute("style");
      expect(field).not.toHaveAttribute("data-auto-grow");
    });

    it("applies a consumer style as given", () => {
      render(<Textarea aria-label="Notes" style={{ color: "red" }} />);
      expect(screen.getByRole("textbox", { name: "Notes" }).getAttribute("style")).toContain("color: red");
    });
  });

  describe("autoGrow", () => {
    it("marks the control with an empty data-auto-grow attribute", () => {
      render(<Textarea aria-label="Notes" autoGrow />);
      expect(screen.getByRole("textbox", { name: "Notes" })).toHaveAttribute("data-auto-grow", "");
    });

    it("sets a min-height of the default three rows and no max-height", () => {
      render(<Textarea aria-label="Notes" autoGrow />);
      const style = screen.getByRole("textbox", { name: "Notes" }).getAttribute("style");
      expect(style).toContain("min-height: 3lh");
      expect(style).not.toContain("max-height");
    });

    it("sets min-height from rows", () => {
      render(<Textarea aria-label="Notes" autoGrow rows={5} />);
      expect(screen.getByRole("textbox", { name: "Notes" }).getAttribute("style")).toContain("min-height: 5lh");
    });

    it("sets max-height from maxRows", () => {
      render(<Textarea aria-label="Notes" autoGrow rows={2} maxRows={8} />);
      const style = screen.getByRole("textbox", { name: "Notes" }).getAttribute("style");
      expect(style).toContain("min-height: 2lh");
      expect(style).toContain("max-height: 8lh");
    });

    it("lets a consumer style win over the min and max heights", () => {
      render(<Textarea aria-label="Notes" autoGrow maxRows={8} style={{ minHeight: "10px", maxHeight: "20px" }} />);
      const style = screen.getByRole("textbox", { name: "Notes" }).getAttribute("style");
      expect(style).toContain("min-height: 10px");
      expect(style).toContain("max-height: 20px");
      expect(style).not.toContain("lh");
    });

    it("assigns no --vpg-* property inline", () => {
      render(<Textarea aria-label="Notes" autoGrow maxRows={8} />);
      expect(screen.getByRole("textbox", { name: "Notes" }).getAttribute("style")).not.toContain("--vpg-");
    });
  });

  it("imports and server-renders without DOM globals", async () => {
    vi.stubGlobal("HTMLTextAreaElement", undefined);
    vi.resetModules();
    try {
      const { Textarea: Isolated } = await import("./Textarea.js");
      expect(() => renderToString(<Isolated aria-label="Q" clearable defaultValue="x" />)).not.toThrow();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
