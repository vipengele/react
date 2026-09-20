import { Check, Minus } from "@tandiko/icons";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { Dropdown, type DropdownValue } from "./Dropdown.js";

/** Renders inside a `.tandiko-root`, the subtree `ThemeProvider` establishes and the listbox
 * portals into. */
function renderThemed(ui: ReactNode) {
  return render(<div className="tandiko-root">{ui}</div>);
}

function trigger(): HTMLElement {
  return screen.getByRole("combobox");
}

/** The highlighted option, or `null` — the highlight is virtual, so it is an attribute rather
 * than DOM focus. */
function highlightedLabel(): string | null {
  const option = document.querySelector("[data-highlighted]");
  return option === null ? null : option.textContent;
}

/** The chip labels in the order the field renders them. */
function chipLabels(): string[] {
  return Array.from(document.querySelectorAll(".tandiko-listbox-chip-label"), (chip) => chip.textContent ?? "");
}

/** Each size as both a `Dropdown.Option`'s props and the value object `Dropdown` reports for it:
 * the two shapes share their fields, so spreading one into the other keeps them in step. */
const small: DropdownValue = { value: "small", label: "Small", icon: Minus };
const medium: DropdownValue = { value: "medium", label: "Medium" };
const large: DropdownValue = { value: "large", label: "Large" };

/** An array rather than a fragment: `Children.forEach` flattens an array into its elements, but
 * sees a fragment as one child of a type `Dropdown` doesn't accept — the same limit `Card`'s
 * child inspection carries. */
const sizes = [
  <Dropdown.Option key="small" {...small} />,
  <Dropdown.Option key="medium" {...medium} />,
  <Dropdown.Option key="large" {...large} />,
];

describe("Dropdown", () => {
  it("renders a closed combobox trigger showing the placeholder", () => {
    renderThemed(<Dropdown placeholder="Pick a size">{sizes}</Dropdown>);

    const combobox = trigger();
    expect(combobox).toHaveTextContent("Pick a size");
    expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).toHaveAttribute("tabindex", "0");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the listbox on a trigger click and closes it on the next one", async () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);

    fireEvent.click(trigger());
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("selects an option by click, closes, and shows its label and icon in the trigger", () => {
    const onChange = vi.fn();
    renderThemed(<Dropdown onChange={onChange}>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Small" }));

    expect(onChange).toHaveBeenCalledWith(small);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent("Small");
    expect(trigger().querySelector(".tandiko-dropdown-trigger-icon")).not.toBeNull();
  });

  it("seeds an uncontrolled selection from defaultValue and needs no onChange", () => {
    renderThemed(<Dropdown defaultValue={medium}>{sizes}</Dropdown>);
    expect(trigger()).toHaveTextContent("Medium");

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Large" }));
    expect(trigger()).toHaveTextContent("Large");
  });

  it("leaves a controlled selection to the caller", () => {
    const onChange = vi.fn();
    const { rerender } = renderThemed(
      <Dropdown value={small} onChange={onChange}>
        {sizes}
      </Dropdown>,
    );
    expect(trigger()).toHaveTextContent("Small");

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Large" }));

    expect(onChange).toHaveBeenCalledWith(large);
    expect(trigger()).toHaveTextContent("Small");

    rerender(
      <div className="tandiko-root">
        <Dropdown value={large} onChange={onChange}>
          {sizes}
        </Dropdown>
      </div>,
    );
    expect(trigger()).toHaveTextContent("Large");
  });

  it("treats a controlled null value as no selection", () => {
    renderThemed(
      <Dropdown value={null} placeholder="Nothing yet">
        {sizes}
      </Dropdown>,
    );
    expect(trigger()).toHaveTextContent("Nothing yet");
  });

  it("marks the selected option with aria-selected", () => {
    renderThemed(<Dropdown defaultValue={medium}>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    expect(screen.getByRole("option", { name: "Medium" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Large" })).toHaveAttribute("aria-selected", "false");
  });

  it("opens on Enter and selects the highlighted option with Enter", async () => {
    const onChange = vi.fn();
    renderThemed(<Dropdown onChange={onChange}>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Opening from the keyboard highlights the first enabled option, so Enter has something to
    // act on straight away.
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));

    fireEvent.keyDown(trigger(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(small);
  });

  it("opens on Space and selects the highlighted option with Space", async () => {
    const onChange = vi.fn();
    renderThemed(<Dropdown onChange={onChange}>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: " " });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));

    fireEvent.keyDown(trigger(), { key: " " });
    expect(onChange).toHaveBeenCalledWith(small);
  });

  it("ignores keys it has no meaning for", () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "Tab" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("moves the highlight with the arrow keys, wrapping at both ends", async () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    await waitFor(() => expect(highlightedLabel()).toBe("Medium"));

    fireEvent.keyDown(trigger(), { key: "ArrowUp" });
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));

    fireEvent.keyDown(trigger(), { key: "ArrowUp" });
    await waitFor(() => expect(highlightedLabel()).toBe("Large"));
  });

  it("jumps to the first and last option with Home and End", async () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));

    fireEvent.keyDown(trigger(), { key: "End" });
    await waitFor(() => expect(highlightedLabel()).toBe("Large"));

    fireEvent.keyDown(trigger(), { key: "Home" });
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));
  });

  it("does not point End at a stale option a shrinking option list left behind", async () => {
    function Shrinkable() {
      const [count, setCount] = useState(3);
      return (
        <>
          <button type="button" onClick={() => setCount(2)}>
            Shrink
          </button>
          <Dropdown>{sizes.slice(0, count)}</Dropdown>
        </>
      );
    }
    renderThemed(<Shrinkable />);

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));

    fireEvent.click(screen.getByRole("button", { name: "Shrink" }));
    fireEvent.keyDown(trigger(), { key: "End" });

    await waitFor(() => expect(highlightedLabel()).toBe("Medium"));
    expect(screen.queryByRole("option", { name: "Large" })).not.toBeInTheDocument();
  });

  it("points aria-activedescendant at the highlighted option", async () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    await waitFor(() => {
      const activeId = trigger().getAttribute("aria-activedescendant");
      expect(activeId).toBeTruthy();
      expect(screen.getByRole("option", { name: "Small" })).toHaveAttribute("id", activeId);
    });
  });

  it("closes on Escape", async () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(trigger(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger()).not.toHaveAttribute("aria-activedescendant");
  });

  it("selects nothing when Enter is pressed with no option highlighted", () => {
    const onChange = vi.fn();
    renderThemed(<Dropdown onChange={onChange}>{sizes}</Dropdown>);

    // `detail: 1` is what makes this a real pointer click: floating-ui reads a click with
    // `detail: 0` as one synthesised from the keyboard and highlights the first option for it.
    fireEvent.click(trigger(), { detail: 1 });
    fireEvent.keyDown(trigger(), { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("jumps the highlight to the next label match as the user types", async () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: "l" });
    await waitFor(() => expect(highlightedLabel()).toBe("Large"));
  });

  it("does nothing when a character is typed with the listbox closed", () => {
    renderThemed(<Dropdown>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "l" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).not.toHaveAttribute("aria-activedescendant");
  });

  describe("with a disabled option", () => {
    const withDisabled = [
      <Dropdown.Option key="small" value="small" label="Small" />,
      <Dropdown.Option key="medium" value="medium" label="Medium" disabled />,
      <Dropdown.Option key="large" value="large" label="Large" />,
    ];

    it("skips it with the arrow keys", async () => {
      renderThemed(<Dropdown>{withDisabled}</Dropdown>);

      fireEvent.keyDown(trigger(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Small"));

      fireEvent.keyDown(trigger(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Large"));
    });

    it("skips it when matching a type-ahead keystroke", async () => {
      renderThemed(
        <Dropdown>
          <Dropdown.Option value="mini" label="Mini" disabled />
          <Dropdown.Option value="medium" label="Medium" />
        </Dropdown>,
      );

      fireEvent.click(trigger());
      fireEvent.keyDown(trigger(), { key: "m" });
      await waitFor(() => expect(highlightedLabel()).toBe("Medium"));
    });

    it("marks it aria-disabled and ignores a click on it", () => {
      const onChange = vi.fn();
      renderThemed(<Dropdown onChange={onChange}>{withDisabled}</Dropdown>);

      fireEvent.click(trigger());
      const option = screen.getByRole("option", { name: "Medium" });
      expect(option).toHaveAttribute("aria-disabled", "true");

      fireEvent.click(option);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("refuses to select it when the pointer has highlighted it", async () => {
      const onChange = vi.fn();
      renderThemed(<Dropdown onChange={onChange}>{withDisabled}</Dropdown>);

      fireEvent.click(trigger());
      fireEvent.mouseMove(screen.getByRole("option", { name: "Medium" }));
      await waitFor(() => expect(highlightedLabel()).toBe("Medium"));

      fireEvent.keyDown(trigger(), { key: "Enter" });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("multiple", () => {
    it("toggles options without closing, and summarises the count in the trigger", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown multiple onChange={onChange} placeholder="Pick sizes">
          {sizes}
        </Dropdown>,
      );
      expect(trigger()).toHaveTextContent("Pick sizes");

      fireEvent.click(trigger());
      expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");

      fireEvent.click(screen.getByRole("option", { name: "Small" }));
      expect(onChange).toHaveBeenLastCalledWith([small]);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("option", { name: "Large" }));
      expect(onChange).toHaveBeenLastCalledWith([small, large]);
      expect(trigger()).toHaveTextContent("2 selected");

      fireEvent.click(screen.getByRole("option", { name: "Small" }));
      expect(onChange).toHaveBeenLastCalledWith([large]);
      expect(trigger()).toHaveTextContent("1 selected");
    });

    it("checks the selected options in the listbox", () => {
      renderThemed(
        <Dropdown multiple defaultValue={[medium]}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.click(trigger());
      const checked = screen.getByRole("option", { name: "Medium" }).querySelector(".tandiko-listbox-checkbox");
      const unchecked = screen.getByRole("option", { name: "Large" }).querySelector(".tandiko-listbox-checkbox");
      expect(checked).toHaveAttribute("data-checked");
      expect(unchecked).not.toHaveAttribute("data-checked");
    });

    it("renders a removable chip per selection, beside the trigger rather than inside it", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown multiple defaultValue={[small, large]} onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      const remove = screen.getByRole("button", { name: "Remove Small" });
      expect(trigger()).not.toContainElement(remove);

      fireEvent.click(remove);
      expect(onChange).toHaveBeenCalledWith([large]);
      expect(screen.queryByRole("button", { name: "Remove Small" })).not.toBeInTheDocument();
      expect(trigger()).toHaveTextContent("1 selected");
    });

    it("orders the chips by the selection, appending each new pick at the end", () => {
      // The selection runs against the order the options are declared in, so a chip row taken
      // from the option list rather than from the selection reads back in a different order
      // here. The chips and the array `onChange` reports are one order, and the last chip is the
      // last selection.
      renderThemed(
        <Dropdown multiple defaultValue={[large, small]}>
          {sizes}
        </Dropdown>,
      );
      expect(chipLabels()).toEqual(["Large", "Small"]);

      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("option", { name: "Medium" }));
      expect(chipLabels()).toEqual(["Large", "Small", "Medium"]);
    });

    it("leaves a controlled multiple selection to the caller", () => {
      function Controlled() {
        const [value, setValue] = useState<DropdownValue[]>([small]);
        return (
          <Dropdown multiple value={value} onChange={setValue}>
            {sizes}
          </Dropdown>
        );
      }

      renderThemed(<Controlled />);
      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("option", { name: "Large" }));

      expect(trigger()).toHaveTextContent("2 selected");
      expect(screen.getByRole("button", { name: "Remove Large" })).toBeInTheDocument();
    });

    it("toggles the highlighted option with Enter and keeps the listbox open", async () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown multiple onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.keyDown(trigger(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toContain("Small"));

      fireEvent.keyDown(trigger(), { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith([small]);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(trigger(), { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe("object values", () => {
    it("keeps a selection whose value object is re-created on every render", () => {
      function Rerendering() {
        const [renders, setRenders] = useState(1);
        return (
          <>
            <button type="button" onClick={() => setRenders((count) => count + 1)}>
              Render again
            </button>
            {/* The object literal a consumer writes inline: a different object, of equal
                content, on every single render. */}
            <Dropdown value={{ value: "medium", label: "Medium" }}>{sizes}</Dropdown>
            <p>{`renders: ${renders}`}</p>
          </>
        );
      }

      renderThemed(<Rerendering />);
      fireEvent.click(screen.getByRole("button", { name: "Render again" }));
      fireEvent.click(screen.getByRole("button", { name: "Render again" }));
      expect(screen.getByText("renders: 3")).toBeInTheDocument();

      expect(trigger()).toHaveTextContent("Medium");
      fireEvent.click(trigger());
      expect(screen.getByRole("option", { name: "Medium" })).toHaveAttribute("aria-selected", "true");
    });

    it("toggles a selection off by its value string rather than its object identity", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown multiple value={[{ value: "medium", label: "Medium" }]} onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("option", { name: "Medium" }));
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it("renders the matching option's label and icon over the value object's own", () => {
      renderThemed(<Dropdown value={{ value: "small", label: "Med." }}>{sizes}</Dropdown>);

      expect(trigger()).toHaveTextContent("Small");
      expect(trigger()).not.toHaveTextContent("Med.");
      expect(trigger().querySelector(".tandiko-dropdown-trigger-icon")).not.toBeNull();
    });

    it("falls back to the value object's own label and icon when no option carries its value", () => {
      renderThemed(<Dropdown value={{ value: "huge", label: "Huge", icon: Check }}>{sizes}</Dropdown>);

      expect(trigger()).toHaveTextContent("Huge");
      expect(trigger().querySelector(".tandiko-dropdown-trigger-icon")).not.toBeNull();
    });

    it("labels a chip from the value object when no option carries its value", () => {
      renderThemed(
        <Dropdown multiple value={[{ value: "huge", label: "Huge" }]}>
          {sizes}
        </Dropdown>,
      );

      expect(screen.getByRole("button", { name: "Remove Huge" })).toBeInTheDocument();
    });

    it("reports the whole option object through onChange", () => {
      const onChange = vi.fn();
      renderThemed(<Dropdown onChange={onChange}>{sizes}</Dropdown>);

      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("option", { name: "Small" }));

      expect(onChange).toHaveBeenCalledWith({ value: "small", label: "Small", icon: Minus });
    });

    it("reports the whole option object of every selection through a multiple onChange", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown multiple onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("option", { name: "Small" }));
      fireEvent.click(screen.getByRole("option", { name: "Medium" }));

      expect(onChange).toHaveBeenLastCalledWith([
        { value: "small", label: "Small", icon: Minus },
        { value: "medium", label: "Medium" },
      ]);
    });
  });

  describe("children validation", () => {
    it("throws on a child that is not a Dropdown.Option", () => {
      expect(() =>
        renderThemed(
          <Dropdown>
            <span>Small</span>
          </Dropdown>,
        ),
      ).toThrow("Dropdown only accepts Dropdown.Option as children.");
    });

    it("throws on a text child", () => {
      expect(() => renderThemed(<Dropdown>Small</Dropdown>)).toThrow("Dropdown only accepts Dropdown.Option as children.");
    });

    it("skips falsy children", () => {
      const showLarge = false;
      renderThemed(
        <Dropdown>
          <Dropdown.Option value="small" label="Small" />
          {null}
          {showLarge && <Dropdown.Option value="large" label="Large" />}
        </Dropdown>,
      );

      fireEvent.click(trigger());
      expect(screen.getAllByRole("option")).toHaveLength(1);
    });

    it("throws when Dropdown.Option is rendered outside a Dropdown", () => {
      expect(() => render(<Dropdown.Option value="small" label="Small" />)).toThrow("Dropdown.Option must be rendered inside <Dropdown>.");
    });
  });

  describe("labelling", () => {
    it("resolves its accessible name from a wrapping FormField", () => {
      render(
        <div className="tandiko-root">
          <FormField label="Size" hint="Pick one" error="Required">
            <Dropdown>{sizes}</Dropdown>
          </FormField>
        </div>,
      );

      const combobox = screen.getByRole("combobox", { name: "Size" });
      expect(combobox.id).toBeTruthy();
      expect(combobox).toHaveAccessibleDescription("Pick one Required");
      expect(combobox).toHaveAttribute("aria-invalid", "true");
    });

    it("takes a plain aria-label", () => {
      renderThemed(<Dropdown aria-label="Size">{sizes}</Dropdown>);
      expect(screen.getByRole("combobox", { name: "Size" })).toBeInTheDocument();
    });
  });

  describe("field shell", () => {
    it("renders the trigger as a direct child of the field shell", () => {
      const { container } = renderThemed(<Dropdown>{sizes}</Dropdown>);

      const shell = container.querySelector(".tandiko-field-shell");
      expect(shell).toHaveClass("tandiko-dropdown-control");
      expect(trigger().parentElement).toBe(shell);
    });

    it("renders the chips as one row beside the trigger, inside the field shell", () => {
      const { container } = renderThemed(
        <Dropdown multiple defaultValue={[small, large]}>
          {sizes}
        </Dropdown>,
      );

      const row = container.querySelector(".tandiko-listbox-chips");
      expect(row?.parentElement).toBe(container.querySelector(".tandiko-field-shell"));
      expect(row?.nextElementSibling).toBe(trigger());
      expect(row?.querySelectorAll(".tandiko-listbox-chip")).toHaveLength(2);
    });

    it("renders no chip row in multiple mode while nothing is selected", () => {
      const { container } = renderThemed(<Dropdown multiple>{sizes}</Dropdown>);
      expect(container.querySelector(".tandiko-listbox-chips")).toBeNull();
    });

    it("keeps focus where it is and leaves the listbox closed on a secondary press on the field", () => {
      const { container } = renderThemed(<Dropdown>{sizes}</Dropdown>);

      const pressed = fireEvent.mouseDown(container.querySelector(".tandiko-field-shell") as HTMLElement, { button: 2 });

      expect(pressed).toBe(false);
      expect(trigger()).not.toHaveFocus();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });

    it("renders a decorative chevron inside the trigger", () => {
      renderThemed(<Dropdown>{sizes}</Dropdown>);

      const chevron = trigger().querySelector(".tandiko-dropdown-chevron");
      expect(chevron).not.toBeNull();
      expect(chevron).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("theming", () => {
    it("assigns no --tandiko- property inline", () => {
      const { container } = renderThemed(
        <Dropdown className="custom" defaultValue={small}>
          {sizes}
        </Dropdown>,
      );

      const root = container.querySelector(".tandiko-dropdown");
      expect(root).toHaveClass("custom");
      expect(root?.getAttribute("style") ?? "").not.toContain("--tandiko-");
      expect(trigger().getAttribute("style") ?? "").not.toContain("--tandiko-");
    });

    it("portals the listbox into the nearest .tandiko-root", () => {
      const { container } = renderThemed(<Dropdown>{sizes}</Dropdown>);

      fireEvent.click(trigger());
      const themeRoot = container.querySelector(".tandiko-root") as HTMLElement;
      expect(themeRoot).toContainElement(screen.getByRole("listbox"));
    });

    it("renders the listbox inline when there is no themed root", () => {
      const { container } = render(<Dropdown>{sizes}</Dropdown>);

      fireEvent.click(trigger());
      expect(container).toContainElement(screen.getByRole("listbox"));
    });
  });

  it("renders an option's leading icon", () => {
    renderThemed(
      <Dropdown>
        <Dropdown.Option value="done" label="Done" icon={Check} />
      </Dropdown>,
    );

    fireEvent.click(trigger());
    expect(screen.getByRole("option", { name: "Done" }).querySelector(".tandiko-listbox-option-icon")).not.toBeNull();
  });
});
