import { fireEvent, render, screen } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { type UseRovingFocusOptions, useRovingFocus } from "./useRovingFocus.js";

interface HarnessItem {
  label: string;
  disabled?: boolean;
  ariaDisabled?: boolean;
}

const ABC: HarnessItem[] = [{ label: "A" }, { label: "B" }, { label: "C" }];

type HarnessProps = Partial<UseRovingFocusOptions<HTMLDivElement>> & { items?: HarnessItem[]; rtl?: boolean };

/** A group of buttons with a non-item control inside the container, wired to the hook. */
function Harness({ items = ABC, itemSelector = "[data-item]", rtl = false, ...options }: HarnessProps) {
  const { onKeyDown } = useRovingFocus<HTMLDivElement>({ itemSelector, ...options });
  return (
    <div role="toolbar" aria-label="Group" style={rtl ? { direction: "rtl" } : undefined} onKeyDown={onKeyDown}>
      {items.map((item) => (
        <button key={item.label} type="button" data-item="" disabled={item.disabled} aria-disabled={item.ariaDisabled ? "true" : undefined}>
          {item.label}
        </button>
      ))}
      <button type="button">Outside</button>
    </div>
  );
}

function item(label: string) {
  return screen.getByRole("button", { name: label });
}

/** Presses `key` on whatever has focus and reports whether the hook prevented its default. */
function press(key: string): boolean {
  return !fireEvent.keyDown(document.activeElement as Element, { key });
}

describe("useRovingFocus", () => {
  describe("horizontal", () => {
    it("moves to the next and previous item with ArrowRight and ArrowLeft", () => {
      render(<Harness />);
      item("A").focus();

      expect(press("ArrowRight")).toBe(true);
      expect(item("B")).toHaveFocus();
      expect(press("ArrowLeft")).toBe(true);
      expect(item("A")).toHaveFocus();
    });

    it("wraps from the last item to the first and back", () => {
      render(<Harness />);
      item("C").focus();

      press("ArrowRight");
      expect(item("A")).toHaveFocus();
      press("ArrowLeft");
      expect(item("C")).toHaveFocus();
    });

    it("leaves the vertical arrow pair alone", () => {
      render(<Harness />);
      item("A").focus();

      expect(press("ArrowDown")).toBe(false);
      expect(press("ArrowUp")).toBe(false);
      expect(item("A")).toHaveFocus();
    });

    it("swaps the arrows when the container's direction is rtl", () => {
      render(<Harness rtl />);
      item("A").focus();

      press("ArrowLeft");
      expect(item("B")).toHaveFocus();
      press("ArrowRight");
      expect(item("A")).toHaveFocus();
    });
  });

  describe("vertical", () => {
    it("moves with ArrowDown and ArrowUp and leaves the horizontal pair alone", () => {
      render(<Harness orientation="vertical" />);
      item("A").focus();

      expect(press("ArrowDown")).toBe(true);
      expect(item("B")).toHaveFocus();
      expect(press("ArrowUp")).toBe(true);
      expect(item("A")).toHaveFocus();
      expect(press("ArrowRight")).toBe(false);
      expect(press("ArrowLeft")).toBe(false);
      expect(item("A")).toHaveFocus();
    });

    it("ignores the container's direction", () => {
      render(<Harness orientation="vertical" rtl />);
      item("A").focus();

      press("ArrowDown");
      expect(item("B")).toHaveFocus();
      press("ArrowUp");
      expect(item("A")).toHaveFocus();
    });
  });

  it("jumps to the first and last item with Home and End", () => {
    render(<Harness />);
    item("B").focus();

    expect(press("End")).toBe(true);
    expect(item("C")).toHaveFocus();
    expect(press("Home")).toBe(true);
    expect(item("A")).toHaveFocus();
  });

  it("leaves keys it does not navigate with alone", () => {
    render(<Harness />);
    item("A").focus();

    expect(press("Enter")).toBe(false);
    expect(press("a")).toBe(false);
    expect(item("A")).toHaveFocus();
  });

  describe("without wrap", () => {
    it("stays on the last item and still handles the key", () => {
      render(<Harness wrap={false} />);
      item("C").focus();

      expect(press("ArrowRight")).toBe(true);
      expect(item("C")).toHaveFocus();
    });

    it("stays on the first item and still handles the key", () => {
      render(<Harness wrap={false} />);
      item("A").focus();

      expect(press("ArrowLeft")).toBe(true);
      expect(item("A")).toHaveFocus();
    });

    it("moves between items short of the ends", () => {
      render(<Harness wrap={false} />);
      item("A").focus();

      press("ArrowRight");
      expect(item("B")).toHaveFocus();
    });
  });

  describe("disabled items", () => {
    const items: HarnessItem[] = [
      { label: "A", ariaDisabled: true },
      { label: "B" },
      { label: "C", disabled: true },
      { label: "D", ariaDisabled: true },
    ];

    it("skips disabled and aria-disabled items by default", () => {
      render(<Harness items={[{ label: "A" }, { label: "B", ariaDisabled: true }, { label: "C" }]} />);
      item("A").focus();

      press("ArrowRight");
      expect(item("C")).toHaveFocus();
      press("ArrowRight");
      expect(item("A")).toHaveFocus();
    });

    it("lands Home and End on the first and last enabled item", () => {
      render(<Harness items={items} />);
      item("B").focus();

      press("End");
      expect(item("B")).toHaveFocus();
      press("Home");
      expect(item("B")).toHaveFocus();
    });

    it("moves from an aria-disabled item that holds focus to the next enabled one", () => {
      render(<Harness items={items} />);
      item("A").focus();

      press("ArrowRight");
      expect(item("B")).toHaveFocus();
    });

    it("stays put and still handles the key when no item is enabled", () => {
      render(
        <Harness
          items={[
            { label: "A", ariaDisabled: true },
            { label: "B", ariaDisabled: true },
          ]}
        />,
      );
      item("A").focus();

      expect(press("ArrowRight")).toBe(true);
      expect(item("A")).toHaveFocus();
      expect(press("End")).toBe(true);
      expect(item("A")).toHaveFocus();
    });

    it("stops on aria-disabled items under the focusable policy", () => {
      render(
        <Harness
          items={[{ label: "A", ariaDisabled: true }, { label: "B" }, { label: "C", ariaDisabled: true }]}
          disabledPolicy="focusable"
        />,
      );
      item("B").focus();

      press("ArrowRight");
      expect(item("C")).toHaveFocus();
      press("Home");
      expect(item("A")).toHaveFocus();
      press("End");
      expect(item("C")).toHaveFocus();
    });
  });

  describe("targets that are not items", () => {
    it("does not move focus when the key is pressed on a non-item inside the container", () => {
      render(<Harness />);
      item("Outside").focus();

      expect(press("ArrowRight")).toBe(false);
      expect(press("Home")).toBe(false);
      expect(item("Outside")).toHaveFocus();
    });

    it("does not move focus when the key is pressed on the container itself", () => {
      render(<Harness />);
      const toolbar = screen.getByRole("toolbar");

      expect(fireEvent.keyDown(toolbar, { key: "ArrowRight" })).toBe(true);
      expect(document.body).toHaveFocus();
    });
  });

  describe("key yield", () => {
    /** A group whose items are every kind of element the hook yields to, ending in a plain button. */
    function YieldHarness({ orientation }: { orientation?: "horizontal" | "vertical" }) {
      const { onKeyDown } = useRovingFocus<HTMLDivElement>({ itemSelector: "[data-item]", orientation });
      return (
        <div role="toolbar" aria-label="Fields" onKeyDown={onKeyDown}>
          <input data-item="" aria-label="Input" />
          <textarea data-item="" aria-label="Textarea" />
          <select data-item="" aria-label="Select">
            <option>One</option>
            <option>Two</option>
          </select>
          <div data-item="" tabIndex={-1} data-testid="editable" />
          <div data-item="" tabIndex={-1} role="slider" aria-valuenow={0} aria-label="Slider" />
          <div data-item="" tabIndex={-1} role="spinbutton" aria-valuenow={0} aria-label="Spin" />
          <div data-item="" tabIndex={-1} role="combobox" aria-expanded={false} aria-controls="none" aria-label="Combo" />
          {/* biome-ignore lint/a11y/useSemanticElements: the role on a non-native element is what the hook reads */}
          <div data-item="" tabIndex={-1} role="textbox" aria-label="Textbox" />
          {/* biome-ignore lint/a11y/useSemanticElements: the role on a non-native element is what the hook reads */}
          <div data-item="" tabIndex={-1} role="searchbox" aria-label="Searchbox" />
          <button data-item="" type="button">
            Last
          </button>
        </div>
      );
    }

    function editable() {
      const element = screen.getByTestId("editable");
      // jsdom does not implement `isContentEditable`.
      Object.defineProperty(element, "isContentEditable", { value: true });
      return element;
    }

    it.each(["Input", "Textarea", "Select", "Slider", "Spin", "Combo", "Textbox", "Searchbox"])(
      "leaves the inline arrows, Home and End to %s",
      (name) => {
        render(<YieldHarness />);
        const target = screen.getByLabelText(name);
        target.focus();

        for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
          expect(press(key)).toBe(false);
          expect(target).toHaveFocus();
        }
      },
    );

    it("leaves the inline arrows, Home and End to a contentEditable element", () => {
      render(<YieldHarness />);
      const target = editable();
      target.focus();

      for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) {
        expect(press(key)).toBe(false);
        expect(target).toHaveFocus();
      }
    });

    it("still moves off an editable item with the vertical arrows", () => {
      render(<YieldHarness orientation="vertical" />);
      screen.getByLabelText("Input").focus();

      expect(press("ArrowDown")).toBe(true);
      expect(screen.getByLabelText("Textarea")).toHaveFocus();
    });
  });

  describe("consumer's onKeyDown", () => {
    it("runs before the hook moves focus", () => {
      const seen: Array<string | undefined> = [];
      const onKeyDown = vi.fn((_event: KeyboardEvent<HTMLDivElement>) => {
        seen.push(document.activeElement?.textContent ?? undefined);
      });
      render(<Harness onKeyDown={onKeyDown} />);
      item("A").focus();

      press("ArrowRight");
      expect(onKeyDown).toHaveBeenCalledTimes(1);
      expect(seen).toEqual(["A"]);
      expect(item("B")).toHaveFocus();
    });

    it("stops the hook when it prevents the default", () => {
      render(<Harness onKeyDown={(event) => event.preventDefault()} />);
      item("A").focus();

      press("ArrowRight");
      expect(item("A")).toHaveFocus();
    });
  });

  describe("onNavigate", () => {
    it("reports the item focus moved to", () => {
      const onNavigate = vi.fn();
      render(<Harness onNavigate={onNavigate} />);
      item("A").focus();

      press("End");
      expect(onNavigate).toHaveBeenCalledExactlyOnceWith(item("C"));
    });

    it("is not called when the move lands on the focused item", () => {
      const onNavigate = vi.fn();
      render(<Harness onNavigate={onNavigate} />);
      item("A").focus();

      expect(press("Home")).toBe(true);
      expect(onNavigate).not.toHaveBeenCalled();
    });
  });
});
