import { Check, Minus } from "@tandiko/icons";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { Dropdown, type DropdownAsyncOption, type DropdownValue } from "./Dropdown.js";

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

/** Every case here is a `searchable={false}` one: the trigger holds real focus, a keystroke on it
 * is type-ahead, and `getByRole("combobox")` resolves to the one combobox on the page. The search
 * row's own cases are the `searchable` block at the end of this file, which passes the prop
 * nowhere — the default is what they exercise. */
describe("Dropdown", () => {
  it("renders a closed combobox trigger showing the placeholder", () => {
    renderThemed(
      <Dropdown searchable={false} placeholder="Pick a size">
        {sizes}
      </Dropdown>,
    );

    const combobox = trigger();
    expect(combobox).toHaveTextContent("Pick a size");
    expect(combobox).toHaveAttribute("aria-haspopup", "listbox");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).toHaveAttribute("tabindex", "0");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the listbox on a trigger click and closes it on the next one", async () => {
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(trigger()).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);

    fireEvent.click(trigger());
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
  });

  it("selects an option by click, closes, and shows its label and icon in the trigger", () => {
    const onChange = vi.fn();
    renderThemed(
      <Dropdown searchable={false} onChange={onChange}>
        {sizes}
      </Dropdown>,
    );

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Small" }));

    expect(onChange).toHaveBeenCalledWith(small);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(trigger()).toHaveTextContent("Small");
    expect(trigger().querySelector(".tandiko-dropdown-trigger-icon")).not.toBeNull();
  });

  it("seeds an uncontrolled selection from defaultValue and needs no onChange", () => {
    renderThemed(
      <Dropdown searchable={false} defaultValue={medium}>
        {sizes}
      </Dropdown>,
    );
    expect(trigger()).toHaveTextContent("Medium");

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("option", { name: "Large" }));
    expect(trigger()).toHaveTextContent("Large");
  });

  it("leaves a controlled selection to the caller", () => {
    const onChange = vi.fn();
    const { rerender } = renderThemed(
      <Dropdown searchable={false} value={small} onChange={onChange}>
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
        <Dropdown searchable={false} value={large} onChange={onChange}>
          {sizes}
        </Dropdown>
      </div>,
    );
    expect(trigger()).toHaveTextContent("Large");
  });

  it("treats a controlled null value as no selection", () => {
    renderThemed(
      <Dropdown searchable={false} value={null} placeholder="Nothing yet">
        {sizes}
      </Dropdown>,
    );
    expect(trigger()).toHaveTextContent("Nothing yet");
  });

  it("marks the selected option with aria-selected", () => {
    renderThemed(
      <Dropdown searchable={false} defaultValue={medium}>
        {sizes}
      </Dropdown>,
    );

    fireEvent.click(trigger());
    expect(screen.getByRole("option", { name: "Medium" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Large" })).toHaveAttribute("aria-selected", "false");
  });

  it("opens on Enter and selects the highlighted option with Enter", async () => {
    const onChange = vi.fn();
    renderThemed(
      <Dropdown searchable={false} onChange={onChange}>
        {sizes}
      </Dropdown>,
    );

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
    renderThemed(
      <Dropdown searchable={false} onChange={onChange}>
        {sizes}
      </Dropdown>,
    );

    fireEvent.keyDown(trigger(), { key: " " });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await waitFor(() => expect(highlightedLabel()).toBe("Small"));

    fireEvent.keyDown(trigger(), { key: " " });
    expect(onChange).toHaveBeenCalledWith(small);
  });

  it("ignores keys it has no meaning for", () => {
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "Tab" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("moves the highlight with the arrow keys, wrapping at both ends", async () => {
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

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
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

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
          <Dropdown searchable={false}>{sizes.slice(0, count)}</Dropdown>
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
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

    fireEvent.keyDown(trigger(), { key: "ArrowDown" });
    await waitFor(() => {
      const activeId = trigger().getAttribute("aria-activedescendant");
      expect(activeId).toBeTruthy();
      expect(screen.getByRole("option", { name: "Small" })).toHaveAttribute("id", activeId);
    });
  });

  it("closes on Escape", async () => {
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(trigger(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    expect(trigger()).not.toHaveAttribute("aria-activedescendant");
  });

  it("selects nothing when Enter is pressed with no option highlighted", () => {
    const onChange = vi.fn();
    renderThemed(
      <Dropdown searchable={false} onChange={onChange}>
        {sizes}
      </Dropdown>,
    );

    // `detail: 1` is what makes this a real pointer click: floating-ui reads a click with
    // `detail: 0` as one synthesised from the keyboard and highlights the first option for it.
    fireEvent.click(trigger(), { detail: 1 });
    fireEvent.keyDown(trigger(), { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("jumps the highlight to the next label match as the user types", async () => {
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

    fireEvent.click(trigger());
    fireEvent.keyDown(trigger(), { key: "l" });
    await waitFor(() => expect(highlightedLabel()).toBe("Large"));
  });

  it("does nothing when a character is typed with the listbox closed", () => {
    renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

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
      renderThemed(<Dropdown searchable={false}>{withDisabled}</Dropdown>);

      fireEvent.keyDown(trigger(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Small"));

      fireEvent.keyDown(trigger(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Large"));
    });

    it("skips it when matching a type-ahead keystroke", async () => {
      renderThemed(
        <Dropdown searchable={false}>
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
      renderThemed(
        <Dropdown searchable={false} onChange={onChange}>
          {withDisabled}
        </Dropdown>,
      );

      fireEvent.click(trigger());
      const option = screen.getByRole("option", { name: "Medium" });
      expect(option).toHaveAttribute("aria-disabled", "true");

      fireEvent.click(option);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("refuses to select it when the pointer has highlighted it", async () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown searchable={false} onChange={onChange}>
          {withDisabled}
        </Dropdown>,
      );

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
        <Dropdown searchable={false} multiple onChange={onChange} placeholder="Pick sizes">
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
        <Dropdown searchable={false} multiple defaultValue={[medium]}>
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
        <Dropdown searchable={false} multiple defaultValue={[small, large]} onChange={onChange}>
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
        <Dropdown searchable={false} multiple defaultValue={[large, small]}>
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
          <Dropdown searchable={false} multiple value={value} onChange={setValue}>
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
        <Dropdown searchable={false} multiple onChange={onChange}>
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
            <Dropdown searchable={false} value={{ value: "medium", label: "Medium" }}>
              {sizes}
            </Dropdown>
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
        <Dropdown searchable={false} multiple value={[{ value: "medium", label: "Medium" }]} onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("option", { name: "Medium" }));
      expect(onChange).toHaveBeenCalledWith([]);
    });

    it("renders the matching option's label and icon over the value object's own", () => {
      renderThemed(
        <Dropdown searchable={false} value={{ value: "small", label: "Med." }}>
          {sizes}
        </Dropdown>,
      );

      expect(trigger()).toHaveTextContent("Small");
      expect(trigger()).not.toHaveTextContent("Med.");
      expect(trigger().querySelector(".tandiko-dropdown-trigger-icon")).not.toBeNull();
    });

    it("falls back to the value object's own label and icon when no option carries its value", () => {
      renderThemed(
        <Dropdown searchable={false} value={{ value: "huge", label: "Huge", icon: Check }}>
          {sizes}
        </Dropdown>,
      );

      expect(trigger()).toHaveTextContent("Huge");
      expect(trigger().querySelector(".tandiko-dropdown-trigger-icon")).not.toBeNull();
    });

    it("labels a chip from the value object when no option carries its value", () => {
      renderThemed(
        <Dropdown searchable={false} multiple value={[{ value: "huge", label: "Huge" }]}>
          {sizes}
        </Dropdown>,
      );

      expect(screen.getByRole("button", { name: "Remove Huge" })).toBeInTheDocument();
    });

    it("reports the whole option object through onChange", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown searchable={false} onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.click(trigger());
      fireEvent.click(screen.getByRole("option", { name: "Small" }));

      expect(onChange).toHaveBeenCalledWith({ value: "small", label: "Small", icon: Minus });
    });

    it("reports the whole option object of every selection through a multiple onChange", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown searchable={false} multiple onChange={onChange}>
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
          <Dropdown searchable={false}>
            <span>Small</span>
          </Dropdown>,
        ),
      ).toThrow("Dropdown only accepts Dropdown.Option and Dropdown.Group as children.");
    });

    it("throws on a text child", () => {
      expect(() => renderThemed(<Dropdown searchable={false}>Small</Dropdown>)).toThrow(
        "Dropdown only accepts Dropdown.Option and Dropdown.Group as children.",
      );
    });

    it("skips falsy children", () => {
      const showLarge = false;
      renderThemed(
        <Dropdown searchable={false}>
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
            <Dropdown searchable={false}>{sizes}</Dropdown>
          </FormField>
        </div>,
      );

      const combobox = screen.getByRole("combobox", { name: "Size" });
      expect(combobox.id).toBeTruthy();
      expect(combobox).toHaveAccessibleDescription("Pick one Required");
      expect(combobox).toHaveAttribute("aria-invalid", "true");
    });

    it("takes a plain aria-label", () => {
      renderThemed(
        <Dropdown searchable={false} aria-label="Size">
          {sizes}
        </Dropdown>,
      );
      expect(screen.getByRole("combobox", { name: "Size" })).toBeInTheDocument();
    });
  });

  describe("field shell", () => {
    it("renders the trigger as a direct child of the field shell", () => {
      const { container } = renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

      const shell = container.querySelector(".tandiko-field-shell");
      expect(shell).toHaveClass("tandiko-dropdown-control");
      expect(trigger().parentElement).toBe(shell);
    });

    it("renders the chips as one row beside the trigger, inside the field shell", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} multiple defaultValue={[small, large]}>
          {sizes}
        </Dropdown>,
      );

      const row = container.querySelector(".tandiko-listbox-chips");
      expect(row?.parentElement).toBe(container.querySelector(".tandiko-field-shell"));
      expect(row?.nextElementSibling).toBe(trigger());
      expect(row?.querySelectorAll(".tandiko-listbox-chip")).toHaveLength(2);
    });

    it("marks the chip row as collapsing and gives it an indicator to reserve room for", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} multiple defaultValue={[small, large]}>
          {sizes}
        </Dropdown>,
      );

      const row = container.querySelector(".tandiko-listbox-chips");
      expect(row).toHaveAttribute("data-collapsing");
      expect(row?.lastElementChild).toHaveClass("tandiko-listbox-overflow-chip");
    });

    it("keeps every chip on a row nothing can measure", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} multiple defaultValue={[small, large]}>
          {sizes}
        </Dropdown>,
      );

      // An engine that lays nothing out reports a zero-wide row, which is no answer about what
      // fits — so the whole selection stays on screen rather than collapsing behind an indicator.
      expect(chipLabels()).toEqual(["Small", "Large"]);
      for (const chip of container.querySelectorAll(".tandiko-listbox-chip")) {
        expect(chip).not.toHaveAttribute("data-hidden");
      }
      expect(container.querySelector(".tandiko-listbox-overflow-chip")).toHaveAttribute("data-hidden");
    });

    it("describes the trigger by every selection, alongside the ids FormField forwards", () => {
      render(
        <div className="tandiko-root">
          <FormField label="Size" hint="Pick one" error="Required">
            <Dropdown searchable={false} multiple defaultValue={[small, large]}>
              {sizes}
            </Dropdown>
          </FormField>
        </div>,
      );

      // Three separate descriptions reach the trigger through one attribute: two of them are
      // `FormField`'s to forward and one is the selection's. Each has to name an element that
      // exists — an id pointing at nothing describes the field as nothing at all.
      const ids = (trigger().getAttribute("aria-describedby") ?? "").split(" ");
      expect(ids.map((id) => document.getElementById(id)?.textContent)).toEqual(["Pick one", "Required", "Selected: Small, Large"]);
      expect(trigger()).toHaveAccessibleDescription("Pick one Required Selected: Small, Large");
    });

    it("describes the trigger by the whole selection, chips on the row or not", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} multiple aria-label="Size" defaultValue={[small, medium, large]}>
          {sizes}
        </Dropdown>,
      );

      expect(trigger()).toHaveAccessibleDescription("Selected: Small, Medium, Large");
      expect(container.querySelector(".tandiko-dropdown-selection-description")?.parentElement).toBe(
        container.querySelector(".tandiko-dropdown"),
      );
    });

    it("describes the trigger by nothing while nothing is selected", () => {
      renderThemed(
        <Dropdown searchable={false} multiple aria-label="Size">
          {sizes}
        </Dropdown>,
      );

      expect(trigger()).not.toHaveAttribute("aria-describedby");
    });

    it("neither marks nor measures a wrapping chip row", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} wrapChips multiple defaultValue={[small, large]}>
          {sizes}
        </Dropdown>,
      );

      const row = container.querySelector(".tandiko-listbox-chips");
      expect(row).not.toHaveAttribute("data-collapsing");
      expect(container.querySelector(".tandiko-listbox-overflow-chip")).toBeNull();
      expect(chipLabels()).toEqual(["Small", "Large"]);
    });

    it("renders no chip row in multiple mode while nothing is selected", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} multiple>
          {sizes}
        </Dropdown>,
      );
      expect(container.querySelector(".tandiko-listbox-chips")).toBeNull();
    });

    it("keeps focus where it is and leaves the listbox closed on a secondary press on the field", () => {
      const { container } = renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

      const pressed = fireEvent.mouseDown(container.querySelector(".tandiko-field-shell") as HTMLElement, { button: 2 });

      expect(pressed).toBe(false);
      expect(trigger()).not.toHaveFocus();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });

    it("renders a decorative chevron inside the trigger", () => {
      renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

      const chevron = trigger().querySelector(".tandiko-dropdown-chevron");
      expect(chevron).not.toBeNull();
      expect(chevron).toHaveAttribute("aria-hidden", "true");
    });
  });

  describe("clearable", () => {
    function clearButton(): HTMLElement {
      return screen.getByRole("button", { name: "Clear selection" });
    }

    /** A press followed by its click, as a pointer produces them: the field's own `mousedown`
     * handler is what a press anywhere in the field runs, and it is what decides whether the
     * listbox opens. */
    function press(element: HTMLElement) {
      fireEvent.mouseDown(element);
      fireEvent.click(element);
    }

    it("offers no clear button unless asked for one", () => {
      renderThemed(
        <Dropdown searchable={false} defaultValue={medium}>
          {sizes}
        </Dropdown>,
      );

      expect(screen.queryByRole("button", { name: "Clear selection" })).toBeNull();
    });

    it("offers no clear button while nothing is selected", () => {
      renderThemed(
        <Dropdown searchable={false} clearable placeholder="Pick a size">
          {sizes}
        </Dropdown>,
      );

      expect(screen.queryByRole("button", { name: "Clear selection" })).toBeNull();
    });

    it("empties a single selection and reports null", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown searchable={false} clearable defaultValue={medium} onChange={onChange} placeholder="Pick a size">
          {sizes}
        </Dropdown>,
      );
      expect(trigger()).toHaveTextContent("Medium");

      press(clearButton());

      expect(onChange).toHaveBeenCalledWith(null);
      expect(trigger()).toHaveTextContent("Pick a size");
      expect(screen.queryByRole("button", { name: "Clear selection" })).toBeNull();
    });

    it("empties a multiple selection and reports an empty array", () => {
      const onChange = vi.fn();
      renderThemed(
        <Dropdown searchable={false} multiple clearable defaultValue={[small, large]} onChange={onChange} placeholder="Pick sizes">
          {sizes}
        </Dropdown>,
      );
      expect(chipLabels()).toEqual(["Small", "Large"]);

      press(clearButton());

      expect(onChange).toHaveBeenCalledWith([]);
      expect(chipLabels()).toEqual([]);
      expect(trigger()).toHaveTextContent("Pick sizes");
    });

    it("leaves the listbox closed", () => {
      renderThemed(
        <Dropdown searchable={false} clearable defaultValue={medium}>
          {sizes}
        </Dropdown>,
      );

      press(clearButton());

      expect(screen.queryByRole("listbox")).toBeNull();
      expect(trigger()).toHaveAttribute("aria-expanded", "false");
    });

    it("returns focus to the trigger", () => {
      renderThemed(
        <Dropdown searchable={false} clearable defaultValue={medium}>
          {sizes}
        </Dropdown>,
      );

      press(clearButton());

      expect(trigger()).toHaveFocus();
    });

    it("renders the clear button inside the shell's trailing slot rather than as a child of the shell", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} clearable defaultValue={medium}>
          {sizes}
        </Dropdown>,
      );

      const shell = container.querySelector(".tandiko-field-shell");
      const slot = container.querySelector(".tandiko-field-shell-trailing");
      expect(slot?.parentElement).toBe(shell);
      expect(clearButton().parentElement).toBe(slot);
    });
  });

  describe("theming", () => {
    it("assigns no --tandiko- property inline", () => {
      const { container } = renderThemed(
        <Dropdown searchable={false} className="custom" defaultValue={small}>
          {sizes}
        </Dropdown>,
      );

      const root = container.querySelector(".tandiko-dropdown");
      expect(root).toHaveClass("custom");
      expect(root?.getAttribute("style") ?? "").not.toContain("--tandiko-");
      expect(trigger().getAttribute("style") ?? "").not.toContain("--tandiko-");
    });

    it("portals the listbox into the nearest .tandiko-root", () => {
      const { container } = renderThemed(<Dropdown searchable={false}>{sizes}</Dropdown>);

      fireEvent.click(trigger());
      const themeRoot = container.querySelector(".tandiko-root") as HTMLElement;
      expect(themeRoot).toContainElement(screen.getByRole("listbox"));
    });

    it("renders the listbox inline when there is no themed root", () => {
      const { container } = render(<Dropdown searchable={false}>{sizes}</Dropdown>);

      fireEvent.click(trigger());
      expect(container).toContainElement(screen.getByRole("listbox"));
    });
  });

  it("renders an option's leading icon", () => {
    renderThemed(
      <Dropdown searchable={false}>
        <Dropdown.Option value="done" label="Done" icon={Check} />
      </Dropdown>,
    );

    fireEvent.click(trigger());
    expect(screen.getByRole("option", { name: "Done" }).querySelector(".tandiko-listbox-option-icon")).not.toBeNull();
  });
});

/** The default: nothing in this block passes `searchable`. Two comboboxes are on the page while
 * the panel is open — the trigger and the search input — so every query here names the one it
 * means. */
describe("a searchable Dropdown", () => {
  function triggerFor(): HTMLElement {
    return screen.getByRole("combobox", { name: "Size" });
  }

  function searchInput(): HTMLElement {
    return screen.getByRole("combobox", { name: "Search" });
  }

  /** Renders with the default search row and opens the panel. */
  function open(ui?: ReactNode) {
    renderThemed(
      ui ?? (
        <Dropdown aria-label="Size" placeholder="Pick a size">
          {sizes}
        </Dropdown>
      ),
    );
    // `detail: 1` is what makes this a real pointer press: floating-ui reads a click with
    // `detail: 0` as one synthesised from the keyboard and highlights the first option for it,
    // which would leave every case below one arrow key further along than it says it is.
    fireEvent.click(triggerFor(), { detail: 1 });
  }

  it("opens the panel with the search row as its first line, above the options", () => {
    open();

    const row = document.querySelector(".tandiko-listbox-search") as HTMLElement;
    expect(row.parentElement?.firstElementChild).toBe(row);
    expect(row.querySelector(".tandiko-listbox-search-icon")).not.toBeNull();
    expect(row.nextElementSibling).toBe(screen.getByRole("listbox"));
    expect(searchInput()).toHaveAttribute("placeholder", "Search");
  });

  it("names the search input by searchPlaceholder", () => {
    open(
      <Dropdown aria-label="Size" searchPlaceholder="Find a size">
        {sizes}
      </Dropdown>,
    );

    expect(screen.getByRole("combobox", { name: "Find a size" })).toHaveAttribute("placeholder", "Find a size");
  });

  it("renders no search row when searchable is off", () => {
    renderThemed(
      <Dropdown searchable={false} aria-label="Size">
        {sizes}
      </Dropdown>,
    );
    fireEvent.click(triggerFor(), { detail: 1 });

    expect(document.querySelector(".tandiko-listbox-search")).toBeNull();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("points both comboboxes at the listbox and marks the search input as filtering it", () => {
    open();

    const listboxId = screen.getByRole("listbox").id;
    expect(triggerFor()).toHaveAttribute("aria-controls", listboxId);
    expect(searchInput()).toHaveAttribute("aria-controls", listboxId);
    expect(searchInput()).toHaveAttribute("aria-autocomplete", "list");
    expect(searchInput()).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the accessible name and description on the trigger while the search input carries the highlight", async () => {
    render(
      <div className="tandiko-root">
        <FormField label="Size" hint="Pick one">
          <Dropdown>{sizes}</Dropdown>
        </FormField>
      </div>,
    );
    fireEvent.click(triggerFor(), { detail: 1 });

    expect(triggerFor()).toHaveAccessibleDescription("Pick one");
    fireEvent.keyDown(searchInput(), { key: "ArrowDown" });

    await waitFor(() => expect(highlightedLabel()).toBe("Small"));
    expect(searchInput()).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: "Small" }).id);
    expect(triggerFor()).not.toHaveAttribute("aria-activedescendant");
    expect(screen.getByRole("listbox")).not.toHaveAttribute("aria-activedescendant");
  });

  it("filters the options to a case-insensitive substring of their labels", () => {
    open();

    fireEvent.change(searchInput(), { target: { value: "AR" } });

    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option", { name: "Large" })).toBeInTheDocument();
  });

  it("says a query matches nothing rather than leaving the panel blank", () => {
    open();

    fireEvent.change(searchInput(), { target: { value: "gigantic" } });

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("No results")).toBeInTheDocument();
  });

  it("highlights the top match of a fresh query and selects it with Enter", async () => {
    const onChange = vi.fn();
    open(
      <Dropdown aria-label="Size" onChange={onChange}>
        {sizes}
      </Dropdown>,
    );

    fireEvent.change(searchInput(), { target: { value: "med" } });
    await waitFor(() => expect(highlightedLabel()).toBe("Medium"));

    fireEvent.keyDown(searchInput(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith(medium);
  });

  it("selects nothing with Enter while no option is highlighted", () => {
    const onChange = vi.fn();
    open(
      <Dropdown aria-label="Size" onChange={onChange}>
        {sizes}
      </Dropdown>,
    );

    fireEvent.change(searchInput(), { target: { value: "gigantic" } });
    fireEvent.keyDown(searchInput(), { key: "Enter" });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("refuses to select a disabled option the pointer has highlighted", async () => {
    const onChange = vi.fn();
    open(
      <Dropdown aria-label="Size" onChange={onChange}>
        <Dropdown.Option value="small" label="Small" />
        <Dropdown.Option value="medium" label="Medium" disabled />
      </Dropdown>,
    );

    fireEvent.mouseMove(screen.getByRole("option", { name: "Medium" }));
    await waitFor(() => expect(highlightedLabel()).toBe("Medium"));

    fireEvent.keyDown(searchInput(), { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves a key it has no meaning for to the query", () => {
    const onChange = vi.fn();
    open(
      <Dropdown aria-label="Size" onChange={onChange}>
        {sizes}
      </Dropdown>,
    );

    fireEvent.keyDown(searchInput(), { key: " " });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("keeps a selection the query filters out of the listbox", () => {
    open(
      <Dropdown multiple aria-label="Size" defaultValue={[small]}>
        {sizes}
      </Dropdown>,
    );

    fireEvent.change(searchInput(), { target: { value: "large" } });

    expect(screen.queryByRole("option", { name: "Small" })).not.toBeInTheDocument();
    expect(chipLabels()).toEqual(["Small"]);
    expect(triggerFor()).toHaveTextContent("1 selected");
  });

  describe("the search flow", () => {
    /** Renders with the default search row and leaves the panel closed. */
    function closed(ui?: ReactNode) {
      renderThemed(
        ui ?? (
          <Dropdown aria-label="Size" placeholder="Pick a size">
            {sizes}
          </Dropdown>
        ),
      );
    }

    it("opens the panel on a printable key and seeds the query with that character", async () => {
      closed();

      fireEvent.keyDown(triggerFor(), { key: "l" });

      expect(searchInput()).toHaveValue("l");
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual(["Small", "Large"]);
      await waitFor(() => expect(highlightedLabel()).toBe("Small"));
    });

    it("leaves a modifier chord on the closed trigger to the browser", () => {
      closed();

      fireEvent.keyDown(triggerFor(), { key: "v", ctrlKey: true });
      fireEvent.keyDown(triggerFor(), { key: "v", metaKey: true });
      fireEvent.keyDown(triggerFor(), { key: "v", altKey: true });
      fireEvent.keyDown(triggerFor(), { key: "Tab" });

      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("jumps no highlight when a character reaches the trigger of an open panel", () => {
      open();

      fireEvent.keyDown(triggerFor(), { key: "l" });

      expect(highlightedLabel()).toBeNull();
      expect(searchInput()).toHaveValue("");
    });

    it("clears the query when a multi-select pick keeps the panel open", async () => {
      open(
        <Dropdown multiple aria-label="Size">
          {sizes}
        </Dropdown>,
      );

      fireEvent.change(searchInput(), { target: { value: "med" } });
      fireEvent.click(screen.getByRole("option", { name: "Medium" }));

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(searchInput()).toHaveValue("");
      expect(screen.getAllByRole("option")).toHaveLength(3);
      await waitFor(() => expect(highlightedLabel()).toBe("Medium"));
    });

    it("removes the last selection on Backspace in an empty query", () => {
      const onChange = vi.fn();
      open(
        <Dropdown multiple aria-label="Size" defaultValue={[small, medium]} onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.keyDown(searchInput(), { key: "Backspace" });

      expect(onChange).toHaveBeenCalledWith([small]);
      expect(chipLabels()).toEqual(["Small"]);
    });

    it("keeps the selection while Backspace has a character of the query to delete", () => {
      open(
        <Dropdown multiple aria-label="Size" defaultValue={[small]}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.change(searchInput(), { target: { value: "la" } });
      fireEvent.keyDown(searchInput(), { key: "Backspace" });

      expect(chipLabels()).toEqual(["Small"]);
    });

    it("leaves Backspace alone with nothing selected", () => {
      open(
        <Dropdown multiple aria-label="Size" placeholder="Pick a size">
          {sizes}
        </Dropdown>,
      );

      fireEvent.keyDown(searchInput(), { key: "Backspace" });

      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(triggerFor()).toHaveTextContent("Pick a size");
    });

    /** Single-select's `onChange` takes a `DropdownValue`, with no empty selection in its
     * signature — so Backspace has nothing it could report, and reports nothing. */
    it("reports no change for Backspace over a single selection", () => {
      const onChange = vi.fn();
      open(
        <Dropdown aria-label="Size" defaultValue={medium} onChange={onChange}>
          {sizes}
        </Dropdown>,
      );

      fireEvent.keyDown(searchInput(), { key: "Backspace" });

      expect(onChange).not.toHaveBeenCalled();
      expect(triggerFor()).toHaveTextContent("Medium");
    });

    it("clears the query as the panel closes", async () => {
      open();

      fireEvent.change(searchInput(), { target: { value: "med" } });
      fireEvent.keyDown(searchInput(), { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());

      fireEvent.click(triggerFor(), { detail: 1 });

      expect(searchInput()).toHaveValue("");
      expect(screen.getAllByRole("option")).toHaveLength(3);
    });
  });

  describe("async loadOptions", () => {
    const asyncSizes: DropdownAsyncOption[] = [
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large", disabled: true },
    ];

    /** The labels the listbox is showing, in order — the async list is whatever `loadOptions`
     * resolved to, so this is what the API returned rather than a filtered view of it. */
    function optionLabels(): string[] {
      return screen.queryAllByRole("option").map((option) => option.textContent ?? "");
    }

    function search(text: string) {
      fireEvent.change(searchInput(), { target: { value: text } });
    }

    it("waits for the query to settle before calling loadOptions", () => {
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={50} />);

      search("s");

      expect(loadOptions).not.toHaveBeenCalled();
    });

    it("calls loadOptions with the settled query and renders what it resolves to", async () => {
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} />);

      search("s");

      await waitFor(() => expect(optionLabels()).toEqual(["Small", "Medium", "Large"]));
      expect(loadOptions).toHaveBeenCalledExactlyOnceWith("s");
    });

    it("shows the loading message while a search is pending", async () => {
      let resolveSearch: (options: DropdownAsyncOption[]) => void = () => {};
      const loadOptions = vi.fn(
        () =>
          new Promise<DropdownAsyncOption[]>((resolve) => {
            resolveSearch = resolve;
          }),
      );
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} />);

      search("s");

      await waitFor(() => expect(screen.getByRole("listbox")).toHaveTextContent("Loading…"));

      resolveSearch(asyncSizes);
      await waitFor(() => expect(optionLabels()).toEqual(["Small", "Medium", "Large"]));
    });

    it("shows the error message when loadOptions rejects", async () => {
      const loadOptions = vi.fn().mockRejectedValue(new Error("network down"));
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} errorMessage="Search failed." />);

      search("s");

      await waitFor(() => expect(screen.getByRole("listbox")).toHaveTextContent("Search failed."));
      expect(optionLabels()).toEqual([]);
    });

    it("discards a slower, earlier response that resolves after a faster, later one", async () => {
      let resolveFirst: (options: DropdownAsyncOption[]) => void = () => {};
      let resolveSecond: (options: DropdownAsyncOption[]) => void = () => {};
      const loadOptions = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<DropdownAsyncOption[]>((resolve) => {
              resolveFirst = resolve;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<DropdownAsyncOption[]>((resolve) => {
              resolveSecond = resolve;
            }),
        );
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} />);

      search("s");
      await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1));
      search("sm");
      await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(2));

      // The second (later) search resolves first; the first (earlier) one resolves after it —
      // its result must never overwrite the newer one.
      resolveSecond([{ value: "small", label: "Small" }]);
      await waitFor(() => expect(optionLabels()).toEqual(["Small"]));
      resolveFirst([{ value: "medium", label: "Medium" }]);
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(optionLabels()).toEqual(["Small"]);
    });

    it("discards a slower, earlier rejection that arrives after a faster, later success", async () => {
      let rejectFirst: (error: Error) => void = () => {};
      let resolveSecond: (options: DropdownAsyncOption[]) => void = () => {};
      const loadOptions = vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<DropdownAsyncOption[]>((_resolve, reject) => {
              rejectFirst = reject;
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<DropdownAsyncOption[]>((resolve) => {
              resolveSecond = resolve;
            }),
        );
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} />);

      search("s");
      await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(1));
      search("sm");
      await waitFor(() => expect(loadOptions).toHaveBeenCalledTimes(2));

      resolveSecond([{ value: "small", label: "Small" }]);
      await waitFor(() => expect(optionLabels()).toEqual(["Small"]));

      // The stale first search's own rejection arrives after the second one already succeeded —
      // it must not turn the now-current, successful results into an error state.
      rejectFirst(new Error("network down"));
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(optionLabels()).toEqual(["Small"]);
      expect(screen.queryByText("Something went wrong.")).not.toBeInTheDocument();
    });

    it("says an async search matched nothing rather than leaving the panel blank", async () => {
      const loadOptions = vi.fn().mockResolvedValue([]);
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} />);

      search("zzz");

      await waitFor(() => expect(document.querySelector(".tandiko-listbox-empty")).toHaveTextContent("No results"));
      expect(optionLabels()).toEqual([]);
    });

    it("reports the whole async option through onChange and shows its label in the trigger", async () => {
      const onChange = vi.fn();
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} onChange={onChange} />);

      search("s");
      await waitFor(() => expect(optionLabels()).toEqual(["Small", "Medium", "Large"]));
      fireEvent.click(screen.getByRole("option", { name: "Small" }));

      expect(onChange).toHaveBeenCalledExactlyOnceWith({ value: "small", label: "Small" });
      expect(triggerFor()).toHaveTextContent("Small");
    });

    it("refuses to select a disabled async option", async () => {
      const onChange = vi.fn();
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      open(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10} onChange={onChange} />);

      search("l");
      await waitFor(() => expect(optionLabels()).toEqual(["Small", "Medium", "Large"]));
      fireEvent.click(screen.getByRole("option", { name: "Large" }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it("renders an async value's own label and icon in the trigger before any search has run", () => {
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      // The value carries its own label, so a selection handed straight to `Dropdown` — controlled
      // or through `defaultValue` — renders with nothing fetched and no option child to match.
      renderThemed(<Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={1000} defaultValue={small} />);

      expect(triggerFor()).toHaveTextContent("Small");
      expect(triggerFor().querySelector(".tandiko-dropdown-trigger-icon")).not.toBeNull();
    });

    it("labels a chip from an async value before any search has run", () => {
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      renderThemed(<Dropdown multiple aria-label="Size" loadOptions={loadOptions} debounceMs={1000} defaultValue={[small]} />);

      expect(chipLabels()).toEqual(["Small"]);
    });

    it("keeps a chip's label after a later search stops returning its option", async () => {
      const loadOptions = vi
        .fn()
        .mockResolvedValueOnce(asyncSizes)
        .mockResolvedValueOnce([{ value: "xl", label: "Extra large" }]);
      open(<Dropdown multiple aria-label="Size" loadOptions={loadOptions} debounceMs={10} />);

      search("s");
      await waitFor(() => expect(optionLabels()).toEqual(["Small", "Medium", "Large"]));
      fireEvent.click(screen.getByRole("option", { name: "Small" }));

      search("xl");
      await waitFor(() => expect(optionLabels()).toEqual(["Extra large"]));

      expect(chipLabels()).toEqual(["Small"]);
    });

    it("highlights the picked option in the loaded list after a multiple-mode pick", async () => {
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      open(<Dropdown multiple aria-label="Size" loadOptions={loadOptions} debounceMs={10} />);

      search("s");
      await waitFor(() => expect(optionLabels()).toEqual(["Small", "Medium", "Large"]));
      fireEvent.click(screen.getByRole("option", { name: "Medium" }));

      // The pick clears the query, which the loaded list still answers until the debounced search
      // for the empty query replaces it — the highlight tracks that list rather than going stale.
      expect(highlightedLabel()).toBe("Medium");
    });

    it("ignores children entirely when loadOptions is provided", async () => {
      const loadOptions = vi.fn().mockResolvedValue(asyncSizes);
      expect(() =>
        open(
          <Dropdown aria-label="Size" loadOptions={loadOptions} debounceMs={10}>
            not an Option
          </Dropdown>,
        ),
      ).not.toThrow();

      await waitFor(() => expect(optionLabels()).toEqual(["Small", "Medium", "Large"]));
    });
  });
});

describe("a grouped Dropdown", () => {
  /** An ungrouped option, then two groups — the shape decision 6 describes for async results and
   * the one a consumer declares for sync ones. */
  const groupedFruit = [
    <Dropdown.Option key="all" value="all" label="All" />,
    <Dropdown.Group key="citrus" label="Citrus">
      <Dropdown.Option value="lemon" label="Lemon" />
      <Dropdown.Option value="lime" label="Lime" />
    </Dropdown.Group>,
    <Dropdown.Group key="stone" label="Stone">
      <Dropdown.Option value="peach" label="Peach" />
    </Dropdown.Group>,
  ];

  /** The same four options with no group around any of them: the list every index assertion below
   * is measured against. */
  const flatFruit = [
    <Dropdown.Option key="all" value="all" label="All" />,
    <Dropdown.Option key="lemon" value="lemon" label="Lemon" />,
    <Dropdown.Option key="lime" value="lime" label="Lime" />,
    <Dropdown.Option key="peach" value="peach" label="Peach" />,
  ];

  function optionLabels(): string[] {
    return screen.queryAllByRole("option").map((option) => option.textContent ?? "");
  }

  function separators(): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(".tandiko-listbox-separator"));
  }

  it("names each group by its own heading", () => {
    renderThemed(
      <Dropdown searchable={false} aria-label="Fruit">
        {groupedFruit}
      </Dropdown>,
    );
    fireEvent.click(trigger());

    expect(screen.getByRole("group", { name: "Citrus" })).toHaveTextContent("Lemon");
    expect(screen.getByRole("group", { name: "Stone" })).toHaveTextContent("Peach");
  });

  it("passes the highlight from one group's last option to the next group's first", async () => {
    renderThemed(
      <Dropdown searchable={false} aria-label="Fruit">
        {groupedFruit}
      </Dropdown>,
    );
    fireEvent.click(trigger());

    const travelled: Array<string | null> = [];
    for (let step = 0; step < 4; step += 1) {
      fireEvent.keyDown(trigger(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).not.toBeNull());
      travelled.push(highlightedLabel());
    }

    // Opening highlights the first option, so the travel starts at the second one and wraps past
    // the last back to it — four steps that cross both group edges and never land on a heading.
    expect(travelled).toEqual(["Lemon", "Lime", "Peach", "All"]);
  });

  it("reaches the same first and last option whether or not its options are grouped", () => {
    function ends(children: ReactNode): [string | null, string | null] {
      const view = renderThemed(
        <Dropdown searchable={false} aria-label="Fruit">
          {children}
        </Dropdown>,
      );
      fireEvent.click(trigger());
      fireEvent.keyDown(trigger(), { key: "End" });
      const last = highlightedLabel();
      fireEvent.keyDown(trigger(), { key: "Home" });
      const first = highlightedLabel();
      // An arrow key past the top wraps to the end of the same flat list.
      fireEvent.keyDown(trigger(), { key: "ArrowUp" });
      expect(highlightedLabel()).toBe(last);
      view.unmount();
      return [first, last];
    }

    const flat = ends(flatFruit);
    const grouped = ends(groupedFruit);

    expect(grouped).toEqual(flat);
    expect(grouped).toEqual(["All", "Peach"]);
  });

  it("draws a separator between the groups and at neither end of the list", () => {
    renderThemed(
      <Dropdown searchable={false} aria-label="Fruit">
        {groupedFruit}
      </Dropdown>,
    );
    fireEvent.click(trigger());

    const [between, ...extra] = separators();
    expect(extra).toEqual([]);
    expect(between?.previousElementSibling).toBe(screen.getByRole("group", { name: "Citrus" }));
    expect(between?.nextElementSibling).toBe(screen.getByRole("group", { name: "Stone" }));
  });

  it("hides a group the query leaves no option in", () => {
    renderThemed(<Dropdown aria-label="Fruit">{groupedFruit}</Dropdown>);
    fireEvent.click(screen.getByRole("combobox", { name: "Fruit" }), { detail: 1 });

    fireEvent.change(screen.getByRole("combobox", { name: "Search" }), { target: { value: "lim" } });

    expect(screen.getByRole("group", { name: "Citrus" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Stone" })).toBeNull();
    expect(optionLabels()).toEqual(["Lime"]);
    // One group left standing is no longer between anything.
    expect(separators()).toEqual([]);
  });

  it("orders async groups by first arrival, with the ungrouped results before them", async () => {
    const loadOptions = vi.fn().mockResolvedValue([
      { value: "pear", label: "Pear" },
      { value: "lemon", label: "Lemon", group: "Citrus" },
      { value: "peach", label: "Peach", group: "Stone" },
      { value: "lime", label: "Lime", group: "Citrus" },
      { value: "all", label: "All" },
    ] satisfies DropdownAsyncOption[]);
    renderThemed(<Dropdown aria-label="Fruit" loadOptions={loadOptions} debounceMs={10} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Fruit" }), { detail: 1 });

    await waitFor(() => expect(optionLabels()).toEqual(["Pear", "All", "Lemon", "Lime", "Peach"]));
    expect(screen.getByRole("group", { name: "Citrus" })).toHaveTextContent("Lemon");
    expect(separators()).toHaveLength(1);
  });

  it("throws on a Dropdown.Group inside a Dropdown.Group", () => {
    expect(() =>
      renderThemed(
        <Dropdown searchable={false} aria-label="Fruit">
          <Dropdown.Group label="Citrus">
            <Dropdown.Group label="Sour">
              <Dropdown.Option value="lemon" label="Lemon" />
            </Dropdown.Group>
          </Dropdown.Group>
        </Dropdown>,
      ),
    ).toThrow("Dropdown.Group only accepts Dropdown.Option as children.");
  });

  it("throws on a group child that is neither a Dropdown.Option nor falsy", () => {
    expect(() =>
      renderThemed(
        <Dropdown searchable={false} aria-label="Fruit">
          <Dropdown.Group label="Citrus">
            <span>Lemon</span>
          </Dropdown.Group>
        </Dropdown>,
      ),
    ).toThrow("Dropdown.Group only accepts Dropdown.Option as children.");
  });

  it("skips falsy children inside a group", () => {
    const showLime = false;
    renderThemed(
      <Dropdown searchable={false} aria-label="Fruit">
        <Dropdown.Group label="Citrus">
          <Dropdown.Option value="lemon" label="Lemon" />
          {null}
          {showLime && <Dropdown.Option value="lime" label="Lime" />}
        </Dropdown.Group>
      </Dropdown>,
    );
    fireEvent.click(trigger());

    expect(optionLabels()).toEqual(["Lemon"]);
  });

  it("throws when Dropdown.Group is rendered outside a Dropdown", () => {
    expect(() =>
      render(
        <Dropdown.Group label="Citrus">
          <Dropdown.Option value="lemon" label="Lemon" />
        </Dropdown.Group>,
      ),
    ).toThrow("Dropdown.Group must be rendered inside <Dropdown>.");
  });
});
