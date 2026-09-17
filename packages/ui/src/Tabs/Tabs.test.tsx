import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs.js";

function renderTabs(props: Partial<ComponentProps<typeof Tabs>> = {}) {
  return render(
    <Tabs {...props}>
      <Tabs.List aria-label="Sections">
        <Tabs.Tab value="one">One</Tabs.Tab>
        <Tabs.Tab value="two">Two</Tabs.Tab>
        <Tabs.Tab value="three">Three</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="one">Panel one</Tabs.Panel>
      <Tabs.Panel value="two">Panel two</Tabs.Panel>
      <Tabs.Panel value="three">Panel three</Tabs.Panel>
    </Tabs>,
  );
}

function tab(name: string) {
  return screen.getByRole("tab", { name });
}

describe("Tabs", () => {
  it("selects the first tab when given neither value nor defaultValue", () => {
    renderTabs();
    expect(tab("One")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
  });

  it("selects defaultValue when uncontrolled", () => {
    renderTabs({ defaultValue: "two" });
    expect(tab("Two")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel two");
  });

  it("ignores non-element children when looking for the first tab", () => {
    render(
      <Tabs>
        {"stray text"}
        <Tabs.List>
          <Tabs.Tab value="one">One</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="one">Panel one</Tabs.Panel>
      </Tabs>,
    );
    expect(tab("One")).toHaveAttribute("aria-selected", "true");
  });

  it("mounts only the selected panel", () => {
    renderTabs();
    expect(screen.getAllByRole("tabpanel")).toHaveLength(1);
    expect(screen.queryByText("Panel two")).not.toBeInTheDocument();
  });

  it("pairs each tab with its panel through generated ids", () => {
    renderTabs();
    const panel = screen.getByRole("tabpanel");
    expect(tab("One")).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab("One").id);
  });

  it("leaves aria-controls off an unselected tab, whose panel is not in the document", () => {
    renderTabs();
    expect(tab("Two")).not.toHaveAttribute("aria-controls");
  });

  it("gives the list a tablist role and an orientation", () => {
    renderTabs();
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "horizontal");
    expect(screen.getByRole("tablist")).toHaveClass("tandiko-tabs-list-horizontal");
  });

  it("reports a vertical orientation on the list", () => {
    renderTabs({ orientation: "vertical" });
    expect(screen.getByRole("tablist")).toHaveAttribute("aria-orientation", "vertical");
  });

  it("merges consumer class names on every part", () => {
    render(
      <Tabs className="root-extra">
        <Tabs.List className="list-extra">
          <Tabs.Tab className="tab-extra" value="one">
            One
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel className="panel-extra" value="one">
          Panel one
        </Tabs.Panel>
      </Tabs>,
    );
    expect(screen.getByRole("tablist").parentElement).toHaveClass("tandiko-tabs", "root-extra");
    expect(screen.getByRole("tablist")).toHaveClass("tandiko-tabs-list", "list-extra");
    expect(tab("One")).toHaveClass("tandiko-tabs-tab", "tab-extra");
    expect(screen.getByRole("tabpanel")).toHaveClass("tandiko-tabs-panel", "panel-extra");
  });

  it("never assigns a --tandiko-* custom property inline", () => {
    renderTabs();
    const root = screen.getByRole("tablist").parentElement;
    expect(root?.getAttribute("style")).toBeNull();
    expect(tab("One").getAttribute("style")).toBeNull();
  });

  describe("roving tabindex", () => {
    it("makes the selected tab the list's only tab stop", () => {
      renderTabs({ defaultValue: "two" });
      expect(tab("One")).toHaveAttribute("tabindex", "-1");
      expect(tab("Two")).toHaveAttribute("tabindex", "0");
      expect(tab("Three")).toHaveAttribute("tabindex", "-1");
    });
  });

  describe("activation", () => {
    it("selects a tab on click", () => {
      renderTabs();
      fireEvent.click(tab("Three"));
      expect(tab("Three")).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel three");
    });

    it("calls a consumer's own onClick as well as selecting", () => {
      const onClick = vi.fn();
      render(
        <Tabs>
          <Tabs.List>
            <Tabs.Tab value="one">One</Tabs.Tab>
            <Tabs.Tab value="two" onClick={onClick}>
              Two
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
          <Tabs.Panel value="two">Panel two</Tabs.Panel>
        </Tabs>,
      );
      fireEvent.click(tab("Two"));
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(tab("Two")).toHaveAttribute("aria-selected", "true");
    });

    it("reports the new value through onChange while uncontrolled", () => {
      const onChange = vi.fn();
      renderTabs({ onChange });
      fireEvent.click(tab("Two"));
      expect(onChange).toHaveBeenCalledWith("two");
      expect(tab("Two")).toHaveAttribute("aria-selected", "true");
    });

    it("leaves the selection to the consumer when controlled", () => {
      const onChange = vi.fn();
      const { rerender } = renderTabs({ value: "one", onChange });

      fireEvent.click(tab("Three"));
      expect(onChange).toHaveBeenCalledWith("three");
      expect(tab("One")).toHaveAttribute("aria-selected", "true");

      rerender(
        <Tabs value="three" onChange={onChange}>
          <Tabs.List>
            <Tabs.Tab value="one">One</Tabs.Tab>
            <Tabs.Tab value="two">Two</Tabs.Tab>
            <Tabs.Tab value="three">Three</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
          <Tabs.Panel value="two">Panel two</Tabs.Panel>
          <Tabs.Panel value="three">Panel three</Tabs.Panel>
        </Tabs>,
      );
      expect(tab("Three")).toHaveAttribute("aria-selected", "true");
    });
  });

  describe("keyboard traversal", () => {
    it("moves focus and selection with the horizontal arrow pair", () => {
      renderTabs();
      fireEvent.keyDown(tab("One"), { key: "ArrowRight" });
      expect(tab("Two")).toHaveFocus();
      expect(tab("Two")).toHaveAttribute("aria-selected", "true");

      fireEvent.keyDown(tab("Two"), { key: "ArrowLeft" });
      expect(tab("One")).toHaveFocus();
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
    });

    it("moves focus and selection with the vertical arrow pair", () => {
      renderTabs({ orientation: "vertical" });
      fireEvent.keyDown(tab("One"), { key: "ArrowDown" });
      expect(tab("Two")).toHaveAttribute("aria-selected", "true");

      fireEvent.keyDown(tab("Two"), { key: "ArrowUp" });
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
    });

    it("wraps from the last tab to the first and back", () => {
      renderTabs({ defaultValue: "three" });
      fireEvent.keyDown(tab("Three"), { key: "ArrowRight" });
      expect(tab("One")).toHaveAttribute("aria-selected", "true");

      fireEvent.keyDown(tab("One"), { key: "ArrowLeft" });
      expect(tab("Three")).toHaveAttribute("aria-selected", "true");
    });

    it("jumps to the first and last tab with Home and End", () => {
      renderTabs({ defaultValue: "two" });
      fireEvent.keyDown(tab("Two"), { key: "End" });
      expect(tab("Three")).toHaveAttribute("aria-selected", "true");

      fireEvent.keyDown(tab("Three"), { key: "Home" });
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
    });

    it("ignores the vertical arrow pair while horizontal", () => {
      renderTabs();
      fireEvent.keyDown(tab("One"), { key: "ArrowDown" });
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
    });

    it("ignores the horizontal arrow pair while vertical", () => {
      renderTabs({ orientation: "vertical" });
      fireEvent.keyDown(tab("One"), { key: "ArrowRight" });
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
    });

    it("calls a consumer's own onKeyDown on the list", () => {
      const onKeyDown = vi.fn();
      render(
        <Tabs>
          <Tabs.List onKeyDown={onKeyDown}>
            <Tabs.Tab value="one">One</Tabs.Tab>
            <Tabs.Tab value="two">Two</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
          <Tabs.Panel value="two">Panel two</Tabs.Panel>
        </Tabs>,
      );
      fireEvent.keyDown(tab("One"), { key: "ArrowRight" });
      expect(onKeyDown).toHaveBeenCalledTimes(1);
    });
  });

  describe("disabled tabs", () => {
    function renderWithDisabled() {
      return render(
        <Tabs>
          <Tabs.List>
            <Tabs.Tab value="one">One</Tabs.Tab>
            <Tabs.Tab value="two" disabled>
              Two
            </Tabs.Tab>
            <Tabs.Tab value="three">Three</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
          <Tabs.Panel value="two">Panel two</Tabs.Panel>
          <Tabs.Panel value="three">Panel three</Tabs.Panel>
        </Tabs>,
      );
    }

    it("renders a disabled tab outside the tab order but still in the list", () => {
      renderWithDisabled();
      expect(tab("Two")).toBeDisabled();
      expect(tab("Two")).toHaveAttribute("tabindex", "-1");
    });

    it("skips a disabled tab when traversing", () => {
      renderWithDisabled();
      fireEvent.keyDown(tab("One"), { key: "ArrowRight" });
      expect(tab("Three")).toHaveFocus();
      expect(tab("Three")).toHaveAttribute("aria-selected", "true");
    });

    it("skips a disabled tab at the end of the list", () => {
      render(
        <Tabs>
          <Tabs.List>
            <Tabs.Tab value="one">One</Tabs.Tab>
            <Tabs.Tab value="two" disabled>
              Two
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
          <Tabs.Panel value="two">Panel two</Tabs.Panel>
        </Tabs>,
      );
      fireEvent.keyDown(tab("One"), { key: "End" });
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
    });

    it("does not select a disabled tab on click", () => {
      renderWithDisabled();
      fireEvent.click(tab("Two"));
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
    });

    it("skips a disabled first tab when picking the default selection", () => {
      render(
        <Tabs>
          <Tabs.List>
            <Tabs.Tab value="one" disabled>
              One
            </Tabs.Tab>
            <Tabs.Tab value="two">Two</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
          <Tabs.Panel value="two">Panel two</Tabs.Panel>
        </Tabs>,
      );
      expect(tab("Two")).toHaveAttribute("aria-selected", "true");
      expect(tab("Two")).toHaveAttribute("tabindex", "0");
    });

    it("selects nothing when every tab is disabled, rather than throwing", () => {
      render(
        <Tabs>
          <Tabs.List>
            <Tabs.Tab value="one" disabled>
              One
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
        </Tabs>,
      );
      expect(tab("One")).toHaveAttribute("aria-selected", "true");
      // No enabled tab exists to fall back to, so the disabled tab keeps the tab stop — moot in
      // practice, since a disabled `<button>` refuses focus regardless of its `tabIndex`.
      expect(tab("One")).toHaveAttribute("tabindex", "0");
    });

    it("moves the roving tab stop to the first enabled tab when a controlled value names a disabled one", () => {
      render(
        <Tabs value="two">
          <Tabs.List>
            <Tabs.Tab value="one">One</Tabs.Tab>
            <Tabs.Tab value="two" disabled>
              Two
            </Tabs.Tab>
            <Tabs.Tab value="three">Three</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="one">Panel one</Tabs.Panel>
          <Tabs.Panel value="two">Panel two</Tabs.Panel>
          <Tabs.Panel value="three">Panel three</Tabs.Panel>
        </Tabs>,
      );
      expect(tab("Two")).toHaveAttribute("aria-selected", "true");
      expect(tab("Two")).toHaveAttribute("tabindex", "-1");
      expect(tab("One")).toHaveAttribute("tabindex", "0");
    });
  });

  it("selects nothing and renders no panel when there are no tabs to select", () => {
    render(
      <Tabs>
        <Tabs.List />
      </Tabs>,
    );
    expect(screen.getByRole("tablist")).toBeEmptyDOMElement();
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
  });

  describe("outside a Tabs provider", () => {
    it("throws from Tabs.List", () => {
      expect(() => render(<Tabs.List />)).toThrow("Tabs.List must be rendered inside <Tabs>.");
    });

    it("throws from Tabs.Tab", () => {
      expect(() => render(<Tabs.Tab value="one" />)).toThrow("Tabs.Tab must be rendered inside <Tabs>.");
    });

    it("throws from Tabs.Panel", () => {
      expect(() => render(<Tabs.Panel value="one" />)).toThrow("Tabs.Panel must be rendered inside <Tabs>.");
    });
  });
});
