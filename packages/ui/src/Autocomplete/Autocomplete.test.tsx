import { Check, Minus } from "@tandiko/icons";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { Autocomplete } from "./Autocomplete.js";

/** Renders inside a `.tandiko-root`, the subtree `ThemeProvider` establishes and the listbox
 * portals into. */
function renderThemed(ui: ReactNode) {
  return render(<div className="tandiko-root">{ui}</div>);
}

function input(): HTMLInputElement {
  return screen.getByRole("combobox") as HTMLInputElement;
}

/** Types into the input, replacing whatever it holds. */
function type(text: string) {
  fireEvent.change(input(), { target: { value: text } });
}

/** The highlighted option, or `null` — the highlight is virtual, so it is an attribute rather
 * than DOM focus. */
function highlightedLabel(): string | null {
  const option = document.querySelector("[data-highlighted]");
  return option === null ? null : option.textContent;
}

function optionLabels(): string[] {
  return screen.queryAllByRole("option").map((option) => option.textContent ?? "");
}

/** An array rather than a fragment: `Children.toArray` flattens an array into its elements, but
 * sees a fragment as one child of a type `Autocomplete` doesn't accept — the same limit `Card`'s
 * child inspection carries. */
const sizes = [
  <Autocomplete.Option key="small" value="small" label="Small" icon={Minus} />,
  <Autocomplete.Option key="medium" value="medium" label="Medium" />,
  <Autocomplete.Option key="large" value="large" label="Large" />,
];

describe("Autocomplete", () => {
  it("renders a closed combobox input showing its placeholder", () => {
    renderThemed(<Autocomplete placeholder="Find a size">{sizes}</Autocomplete>);

    const combobox = input();
    expect(combobox.tagName).toBe("INPUT");
    expect(combobox).toHaveAttribute("placeholder", "Find a size");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).toHaveValue("");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens the listbox on focus and shows every option", () => {
    renderThemed(<Autocomplete>{sizes}</Autocomplete>);

    fireEvent.focus(input());
    expect(optionLabels()).toEqual(["Small", "Medium", "Large"]);
    expect(input()).toHaveAttribute("aria-expanded", "true");
    expect(input()).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
  });

  it("stays open when the input is clicked", () => {
    renderThemed(<Autocomplete>{sizes}</Autocomplete>);

    fireEvent.focus(input());
    fireEvent.click(input());
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("filters the options by a case-insensitive substring of the label", () => {
    renderThemed(<Autocomplete>{sizes}</Autocomplete>);

    type("m");
    expect(optionLabels()).toEqual(["Small", "Medium"]);

    type("LAR");
    expect(optionLabels()).toEqual(["Large"]);
  });

  it("highlights the top match on every keystroke, so Enter selects it", () => {
    const onChange = vi.fn();
    renderThemed(<Autocomplete onChange={onChange}>{sizes}</Autocomplete>);

    type("l");
    expect(highlightedLabel()).toBe("Small");

    fireEvent.keyDown(input(), { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith("small");
    expect(input()).toHaveValue("Small");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("renders a non-interactive no-results message rather than closing on an empty result set", () => {
    renderThemed(<Autocomplete>{sizes}</Autocomplete>);

    type("zzz");
    const listbox = screen.getByRole("listbox");
    expect(listbox).toHaveTextContent("No results");
    expect(optionLabels()).toEqual([]);
    expect(highlightedLabel()).toBeNull();

    fireEvent.keyDown(input(), { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("keeps focus on the input when an option is clicked, so no blur reverts the text", () => {
    const onChange = vi.fn();
    renderThemed(<Autocomplete onChange={onChange}>{sizes}</Autocomplete>);

    type("sm");
    const option = screen.getByRole("option", { name: "Small" });
    // `fireEvent` returns `false` for a cancelable event whose default was prevented — here, the
    // default that would move focus off the input.
    expect(fireEvent.mouseDown(option)).toBe(false);
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith("small");
    expect(input()).toHaveValue("Small");
  });

  it("reverts unmatched text to the selected option's label on a genuine blur", () => {
    renderThemed(<Autocomplete defaultValue="medium">{sizes}</Autocomplete>);
    expect(input()).toHaveValue("Medium");

    type("larg");
    fireEvent.blur(input());

    expect(input()).toHaveValue("Medium");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears unmatched text on blur when nothing is selected", () => {
    renderThemed(<Autocomplete>{sizes}</Autocomplete>);

    type("larg");
    fireEvent.blur(input());
    expect(input()).toHaveValue("");
  });

  it("seeds an uncontrolled selection from defaultValue and needs no onChange", () => {
    renderThemed(<Autocomplete defaultValue="medium">{sizes}</Autocomplete>);
    expect(input()).toHaveValue("Medium");

    type("larg");
    fireEvent.click(screen.getByRole("option", { name: "Large" }));
    expect(input()).toHaveValue("Large");
  });

  it("leaves a controlled selection to the caller", () => {
    const onChange = vi.fn();
    const { rerender } = renderThemed(
      <Autocomplete value="small" onChange={onChange}>
        {sizes}
      </Autocomplete>,
    );
    expect(input()).toHaveValue("Small");

    type("larg");
    fireEvent.click(screen.getByRole("option", { name: "Large" }));
    expect(onChange).toHaveBeenCalledWith("large");

    rerender(
      <div className="tandiko-root">
        <Autocomplete value="large" onChange={onChange}>
          {sizes}
        </Autocomplete>
      </div>,
    );
    // The text follows the selection the input itself made; the caller's later `value` change is
    // reflected the next time the input is left.
    fireEvent.blur(input());
    expect(input()).toHaveValue("Large");
  });

  it("treats a controlled null value as no selection", () => {
    renderThemed(<Autocomplete value={null}>{sizes}</Autocomplete>);
    expect(input()).toHaveValue("");
  });

  it("marks the selected option with aria-selected", () => {
    renderThemed(<Autocomplete defaultValue="medium">{sizes}</Autocomplete>);

    // The input is seeded with the selected label, which is itself a query — clearing it brings
    // the rest of the options back.
    type("");
    expect(screen.getByRole("option", { name: "Medium" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: "Large" })).toHaveAttribute("aria-selected", "false");
  });

  describe("keyboard", () => {
    it("opens on ArrowDown while closed and moves the highlight with the arrow keys", async () => {
      renderThemed(<Autocomplete>{sizes}</Autocomplete>);

      fireEvent.keyDown(input(), { key: "ArrowDown" });
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      await waitFor(() => expect(highlightedLabel()).toBe("Small"));

      fireEvent.keyDown(input(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Medium"));

      fireEvent.keyDown(input(), { key: "ArrowUp" });
      await waitFor(() => expect(highlightedLabel()).toBe("Small"));
    });

    it("leaves Home and End to the text caret", async () => {
      renderThemed(<Autocomplete>{sizes}</Autocomplete>);

      fireEvent.keyDown(input(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Small"));

      // The input owns the query, so both keys belong to the caret in it — unlike `Dropdown`,
      // whose trigger holds no text and jumps the highlight to the first/last option with them.
      fireEvent.keyDown(input(), { key: "End" });
      expect(highlightedLabel()).toBe("Small");

      fireEvent.keyDown(input(), { key: "Home" });
      expect(highlightedLabel()).toBe("Small");
    });

    it("points aria-activedescendant at the highlighted option", () => {
      renderThemed(<Autocomplete>{sizes}</Autocomplete>);

      type("m");
      const activeId = input().getAttribute("aria-activedescendant");
      expect(activeId).toBeTruthy();
      expect(screen.getByRole("option", { name: "Small" })).toHaveAttribute("id", activeId);
    });

    it("closes on Escape", async () => {
      renderThemed(<Autocomplete>{sizes}</Autocomplete>);

      fireEvent.focus(input());
      fireEvent.keyDown(input(), { key: "Escape" });

      await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
      expect(input()).not.toHaveAttribute("aria-activedescendant");
    });

    it("leaves Enter alone while the listbox is closed", () => {
      const onChange = vi.fn();
      renderThemed(<Autocomplete onChange={onChange}>{sizes}</Autocomplete>);

      fireEvent.keyDown(input(), { key: "Enter" });
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("selects nothing when Enter is pressed with no option highlighted", () => {
      const onChange = vi.fn();
      renderThemed(<Autocomplete onChange={onChange}>{sizes}</Autocomplete>);

      fireEvent.focus(input());
      fireEvent.keyDown(input(), { key: "Enter" });

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("types a query instead of jumping the highlight to a matching label", () => {
      renderThemed(<Autocomplete>{sizes}</Autocomplete>);

      // Dropdown's type-ahead would move the highlight to "Large" here. Typing filters instead:
      // the list narrows to the labels containing an "l", and the top one is highlighted.
      type("l");
      expect(optionLabels()).toEqual(["Small", "Large"]);
      expect(highlightedLabel()).toBe("Small");
    });
  });

  describe("with a disabled option", () => {
    const withDisabled = [
      <Autocomplete.Option key="small" value="small" label="Small" />,
      <Autocomplete.Option key="medium" value="medium" label="Medium" disabled />,
      <Autocomplete.Option key="large" value="large" label="Large" />,
    ];

    it("skips it with the arrow keys", async () => {
      renderThemed(<Autocomplete>{withDisabled}</Autocomplete>);

      fireEvent.keyDown(input(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Small"));

      fireEvent.keyDown(input(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toBe("Large"));
    });

    it("skips it when a keystroke re-scopes the highlight to the top match", () => {
      renderThemed(
        <Autocomplete>
          <Autocomplete.Option value="mini" label="Mini" disabled />
          <Autocomplete.Option value="medium" label="Medium" />
        </Autocomplete>,
      );

      type("mi");
      expect(optionLabels()).toEqual(["Mini"]);
      expect(highlightedLabel()).toBeNull();

      type("m");
      expect(highlightedLabel()).toBe("Medium");
    });

    it("marks it aria-disabled and ignores a click on it", () => {
      const onChange = vi.fn();
      renderThemed(<Autocomplete onChange={onChange}>{withDisabled}</Autocomplete>);

      fireEvent.focus(input());
      const option = screen.getByRole("option", { name: "Medium" });
      expect(option).toHaveAttribute("aria-disabled", "true");

      fireEvent.click(option);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    it("refuses to select it when the pointer has highlighted it", async () => {
      const onChange = vi.fn();
      renderThemed(<Autocomplete onChange={onChange}>{withDisabled}</Autocomplete>);

      fireEvent.focus(input());
      fireEvent.mouseMove(screen.getByRole("option", { name: "Medium" }));
      await waitFor(() => expect(highlightedLabel()).toBe("Medium"));

      fireEvent.keyDown(input(), { key: "Enter" });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("multiple", () => {
    it("toggles options without closing, clearing the input after each selection", () => {
      const onChange = vi.fn();
      renderThemed(
        <Autocomplete multiple onChange={onChange}>
          {sizes}
        </Autocomplete>,
      );

      type("sm");
      expect(screen.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");

      fireEvent.click(screen.getByRole("option", { name: "Small" }));
      expect(onChange).toHaveBeenLastCalledWith(["small"]);
      expect(input()).toHaveValue("");
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(highlightedLabel()).toBe("Small");

      fireEvent.click(screen.getByRole("option", { name: "Large" }));
      expect(onChange).toHaveBeenLastCalledWith(["small", "large"]);

      fireEvent.click(screen.getByRole("option", { name: "Small" }));
      expect(onChange).toHaveBeenLastCalledWith(["large"]);
    });

    it("checks the selected options in the listbox", () => {
      renderThemed(
        <Autocomplete multiple defaultValue={["medium"]}>
          {sizes}
        </Autocomplete>,
      );

      fireEvent.focus(input());
      const checked = screen
        .getByRole("option", { name: "Medium" })
        .querySelector(".tandiko-listbox-checkbox");
      const unchecked = screen
        .getByRole("option", { name: "Large" })
        .querySelector(".tandiko-listbox-checkbox");
      expect(checked).toHaveAttribute("data-checked");
      expect(unchecked).not.toHaveAttribute("data-checked");
    });

    it("renders a removable chip per selection, before the input rather than inside it", () => {
      const onChange = vi.fn();
      const { container } = renderThemed(
        <Autocomplete multiple defaultValue={["small", "large"]} onChange={onChange}>
          {sizes}
        </Autocomplete>,
      );

      const control = container.querySelector(".tandiko-autocomplete-control") as HTMLElement;
      expect([...control.children].map((child) => child.className)).toEqual([
        "tandiko-listbox-chip",
        "tandiko-listbox-chip",
        "tandiko-autocomplete-input",
      ]);
      expect(input()).toHaveValue("");

      fireEvent.click(screen.getByRole("button", { name: "Remove Small" }));
      expect(onChange).toHaveBeenCalledWith(["large"]);
      expect(screen.queryByRole("button", { name: "Remove Small" })).not.toBeInTheDocument();
    });

    it("removes the last chip on Backspace with an empty input", () => {
      const onChange = vi.fn();
      renderThemed(
        <Autocomplete multiple defaultValue={["small", "large"]} onChange={onChange}>
          {sizes}
        </Autocomplete>,
      );

      fireEvent.keyDown(input(), { key: "Backspace" });
      expect(onChange).toHaveBeenLastCalledWith(["small"]);
      expect(screen.queryByRole("button", { name: "Remove Large" })).not.toBeInTheDocument();
    });

    it("leaves the chips alone while Backspace has text to delete", () => {
      const onChange = vi.fn();
      renderThemed(
        <Autocomplete multiple defaultValue={["small"]} onChange={onChange}>
          {sizes}
        </Autocomplete>,
      );

      type("me");
      fireEvent.keyDown(input(), { key: "Backspace" });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("ignores Backspace with nothing selected", () => {
      const onChange = vi.fn();
      renderThemed(
        <Autocomplete multiple onChange={onChange}>
          {sizes}
        </Autocomplete>,
      );

      fireEvent.keyDown(input(), { key: "Backspace" });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("leaves Backspace to the text in single-select", () => {
      const onChange = vi.fn();
      renderThemed(
        <Autocomplete defaultValue="small" onChange={onChange}>
          {sizes}
        </Autocomplete>,
      );

      type("");
      fireEvent.keyDown(input(), { key: "Backspace" });
      expect(onChange).not.toHaveBeenCalled();
    });

    it("clears the input on blur rather than reverting it to a selection", () => {
      renderThemed(
        <Autocomplete multiple defaultValue={["small"]}>
          {sizes}
        </Autocomplete>,
      );

      type("larg");
      fireEvent.blur(input());
      expect(input()).toHaveValue("");
    });

    it("leaves a controlled multiple selection to the caller", () => {
      function Controlled() {
        const [value, setValue] = useState<string[]>(["small"]);
        return (
          <Autocomplete multiple value={value} onChange={setValue}>
            {sizes}
          </Autocomplete>
        );
      }

      renderThemed(<Controlled />);
      type("larg");
      fireEvent.click(screen.getByRole("option", { name: "Large" }));

      expect(screen.getByRole("button", { name: "Remove Large" })).toBeInTheDocument();
    });

    it("toggles the highlighted option with Enter and keeps the listbox open", async () => {
      const onChange = vi.fn();
      renderThemed(
        <Autocomplete multiple onChange={onChange}>
          {sizes}
        </Autocomplete>,
      );

      fireEvent.keyDown(input(), { key: "ArrowDown" });
      await waitFor(() => expect(highlightedLabel()).toContain("Small"));

      fireEvent.keyDown(input(), { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith(["small"]);
      expect(screen.getByRole("listbox")).toBeInTheDocument();

      fireEvent.keyDown(input(), { key: "Enter" });
      expect(onChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe("children validation", () => {
    it("throws on a child that is not an Autocomplete.Option", () => {
      expect(() =>
        renderThemed(
          <Autocomplete>
            <span>Small</span>
          </Autocomplete>,
        ),
      ).toThrow("Autocomplete only accepts Autocomplete.Option as children.");
    });

    it("throws on a text child", () => {
      expect(() => renderThemed(<Autocomplete>Small</Autocomplete>)).toThrow(
        "Autocomplete only accepts Autocomplete.Option as children.",
      );
    });

    it("skips falsy children", () => {
      const showLarge = false;
      renderThemed(
        <Autocomplete>
          <Autocomplete.Option value="small" label="Small" />
          {null}
          {showLarge && <Autocomplete.Option value="large" label="Large" />}
        </Autocomplete>,
      );

      fireEvent.focus(input());
      expect(optionLabels()).toEqual(["Small"]);
    });

    it("throws when Autocomplete.Option is rendered outside an Autocomplete", () => {
      expect(() => render(<Autocomplete.Option value="small" label="Small" />)).toThrow(
        "Autocomplete.Option must be rendered inside <Autocomplete>.",
      );
    });
  });

  describe("labelling", () => {
    it("resolves its accessible name from a wrapping FormField", () => {
      render(
        <div className="tandiko-root">
          <FormField label="Size" hint="Start typing" error="Required">
            <Autocomplete>{sizes}</Autocomplete>
          </FormField>
        </div>,
      );

      const combobox = screen.getByRole("combobox", { name: "Size" });
      expect(combobox.id).toBeTruthy();
      expect(combobox).toHaveAccessibleDescription("Start typing Required");
      expect(combobox).toHaveAttribute("aria-invalid", "true");
    });

    it("takes a plain aria-label", () => {
      renderThemed(<Autocomplete aria-label="Size">{sizes}</Autocomplete>);
      expect(screen.getByRole("combobox", { name: "Size" })).toBeInTheDocument();
    });
  });

  describe("theming", () => {
    it("assigns no --tandiko- property inline", () => {
      const { container } = renderThemed(
        <Autocomplete className="custom" defaultValue="small">
          {sizes}
        </Autocomplete>,
      );

      const root = container.querySelector(".tandiko-autocomplete");
      expect(root).toHaveClass("custom");
      expect(root?.getAttribute("style") ?? "").not.toContain("--tandiko-");
      expect(input().getAttribute("style") ?? "").not.toContain("--tandiko-");
    });

    it("portals the listbox into the nearest .tandiko-root", () => {
      const { container } = renderThemed(<Autocomplete>{sizes}</Autocomplete>);

      fireEvent.focus(input());
      const themeRoot = container.querySelector(".tandiko-root") as HTMLElement;
      expect(themeRoot).toContainElement(screen.getByRole("listbox"));
    });

    it("renders the listbox inline when there is no themed root", () => {
      const { container } = render(<Autocomplete>{sizes}</Autocomplete>);

      fireEvent.focus(input());
      expect(container).toContainElement(screen.getByRole("listbox"));
    });
  });

  it("renders an option's leading icon", () => {
    renderThemed(
      <Autocomplete>
        <Autocomplete.Option value="done" label="Done" icon={Check} />
      </Autocomplete>,
    );

    fireEvent.focus(input());
    expect(
      screen.getByRole("option", { name: "Done" }).querySelector(".tandiko-listbox-option-icon"),
    ).not.toBeNull();
  });
});
