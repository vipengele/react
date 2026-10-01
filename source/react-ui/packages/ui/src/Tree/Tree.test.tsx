import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, type MouseEvent, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Tree, type TreeItemState, type TreeProps } from "./Tree.js";

interface Node {
  id: string;
  label: string;
  children?: Node[];
  disabled?: boolean;
}

const items: Node[] = [
  {
    id: "a",
    label: "Apple",
    children: [
      { id: "a1", label: "Avocado" },
      { id: "a2", label: "Apricot", children: [{ id: "a2x", label: "Almond" }] },
    ],
  },
  { id: "b", label: "Banana" },
  { id: "c", label: "Cherry", children: [{ id: "c1", label: "Cranberry" }] },
];

const getId = (node: Node) => node.id;
const getLabel = (node: Node) => node.label;
const getChildren = (node: Node) => node.children;
const getDisabled = (node: Node) => node.disabled === true;

function defaultRenderItem(node: Node, state: TreeItemState) {
  return <div {...state.getItemProps()}>{node.label}</div>;
}

type Props = Partial<Omit<TreeProps<Node>, "virtualized" | "rowHeight">>;

function tree(props: Props = {}) {
  return (
    <Tree
      aria-label="Fruit"
      items={items}
      getId={getId}
      getLabel={getLabel}
      getChildren={getChildren}
      getDisabled={getDisabled}
      renderItem={defaultRenderItem}
      {...props}
    />
  );
}

function renderTree(props: Props = {}) {
  const result = render(tree(props));
  return { ...result, rerenderTree: (next: Props) => result.rerender(tree(next)) };
}

function row(name: string) {
  return screen.getByRole("treeitem", { name });
}

function rowNames() {
  return screen.getAllByRole("treeitem").map((element) => element.textContent);
}

function tabbableNames() {
  return screen
    .getAllByRole("treeitem")
    .filter((element) => element.tabIndex === 0)
    .map((element) => element.textContent);
}

function press(name: string, key: string, init: Partial<KeyboardEventInit> = {}) {
  return fireEvent.keyDown(row(name), { key, ...init });
}

function disable(ids: string[], nodes: Node[] = items): Node[] {
  return nodes.map((node) => ({
    ...node,
    disabled: ids.includes(node.id),
    ...(node.children ? { children: disable(ids, node.children) } : {}),
  }));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("Tree", () => {
  describe("semantics", () => {
    it("renders a labelled tree holding flat treeitem rows and no groups", () => {
      renderTree({ defaultExpanded: ["a"] });
      const container = screen.getByRole("tree", { name: "Fruit" });
      expect(container).toHaveClass("vpg-tree");
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
      for (const element of screen.getAllByRole("treeitem")) {
        expect(element.parentElement).toBe(container);
        expect(element).toHaveClass("vpg-tree-item");
      }
      expect(rowNames()).toEqual(["Apple", "Avocado", "Apricot", "Banana", "Cherry"]);
    });

    it("joins a consumer className with its own and passes other container props through", () => {
      renderTree({ className: "mine", id: "fruit-tree" });
      const container = screen.getByRole("tree");
      expect(container).toHaveClass("vpg-tree", "mine");
      expect(container).toHaveAttribute("id", "fruit-tree");
    });

    it("injects its stylesheet under the vpg-tree href", () => {
      renderTree();
      // React hoists the style into `<head>` and rewrites `href`/`precedence` to
      // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
      const style = document.head.querySelector('style[data-href="vpg-tree"]');
      expect(style).toHaveAttribute("data-precedence", "vpg-tree");
      expect(style?.textContent).toContain(".vpg-tree {");
    });

    it("gives each row its level, set size and position among its siblings", () => {
      renderTree({ defaultExpanded: ["a", "a2"] });
      expect(row("Apple")).toHaveAttribute("aria-level", "1");
      expect(row("Apple")).toHaveAttribute("aria-setsize", "3");
      expect(row("Apple")).toHaveAttribute("aria-posinset", "1");
      expect(row("Apricot")).toHaveAttribute("aria-level", "2");
      expect(row("Apricot")).toHaveAttribute("aria-setsize", "2");
      expect(row("Apricot")).toHaveAttribute("aria-posinset", "2");
      expect(row("Almond")).toHaveAttribute("aria-level", "3");
      expect(row("Cherry")).toHaveAttribute("aria-posinset", "3");
    });

    it("indents each row by its level", () => {
      renderTree({ defaultExpanded: ["a"] });
      expect(row("Apple").style.paddingInlineStart).toBe("calc(var(--vpg-space-2) + 0 * var(--vpg-space-5))");
      expect(row("Avocado").style.paddingInlineStart).toBe("calc(var(--vpg-space-2) + 1 * var(--vpg-space-5))");
    });

    it("sets aria-expanded only on rows with children", () => {
      renderTree({ defaultExpanded: ["a"] });
      expect(row("Apple")).toHaveAttribute("aria-expanded", "true");
      expect(row("Cherry")).toHaveAttribute("aria-expanded", "false");
      expect(row("Banana")).not.toHaveAttribute("aria-expanded");
      expect(row("Avocado")).not.toHaveAttribute("aria-expanded");
    });

    it("leaves aria-selected off every row when selection is off", () => {
      renderTree();
      for (const element of screen.getAllByRole("treeitem")) {
        expect(element).not.toHaveAttribute("aria-selected");
      }
    });

    it("sets aria-selected on every row in single selection mode", () => {
      renderTree({ selectionMode: "single", defaultSelectedId: "b" });
      expect(row("Banana")).toHaveAttribute("aria-selected", "true");
      expect(row("Apple")).toHaveAttribute("aria-selected", "false");
    });

    it("marks disabled rows with aria-disabled and leaves it off the rest", () => {
      renderTree({ items: disable(["b"]) });
      expect(row("Banana")).toHaveAttribute("aria-disabled", "true");
      expect(row("Apple")).not.toHaveAttribute("aria-disabled");
    });

    it("treats every node as enabled without getDisabled", () => {
      renderTree({ items: disable(["a"]), getDisabled: undefined });
      expect(row("Apple")).not.toHaveAttribute("aria-disabled");
      expect(tabbableNames()).toEqual(["Apple"]);
    });
  });

  describe("roving tabindex", () => {
    it("makes the first row the only tabbable one when nothing is selected", () => {
      renderTree();
      expect(tabbableNames()).toEqual(["Apple"]);
      expect(row("Banana")).toHaveAttribute("tabindex", "-1");
    });

    it("skips a disabled first row when choosing the tabbable row", () => {
      renderTree({ items: disable(["a"]) });
      expect(tabbableNames()).toEqual(["Banana"]);
    });

    it("makes the selected row tabbable", () => {
      renderTree({ selectionMode: "single", defaultSelectedId: "c" });
      expect(tabbableNames()).toEqual(["Cherry"]);
    });

    it("falls back to the first enabled row when the selected row is disabled", () => {
      renderTree({ items: disable(["c"]), selectionMode: "single", defaultSelectedId: "c" });
      expect(tabbableNames()).toEqual(["Apple"]);
    });

    it("falls back to the first enabled row when the selected row is not visible", () => {
      renderTree({ selectionMode: "single", defaultSelectedId: "c1" });
      expect(tabbableNames()).toEqual(["Apple"]);
    });

    it("ignores a selection when selection is off", () => {
      renderTree({ selectedId: "c" });
      expect(tabbableNames()).toEqual(["Apple"]);
    });

    it("makes no row tabbable when every row is disabled", () => {
      renderTree({ items: disable(["a", "b", "c"]) });
      expect(tabbableNames()).toEqual([]);
    });

    it("keeps the row the user moved to tabbable over the selected row", () => {
      renderTree({ selectionMode: "single", defaultSelectedId: "c" });
      act(() => row("Banana").focus());
      expect(tabbableNames()).toEqual(["Banana"]);
    });
  });

  describe("keyboard", () => {
    it("moves focus down and up through the visible rows, skipping disabled ones", () => {
      renderTree({ items: disable(["b"]), defaultExpanded: ["a"] });
      act(() => row("Apple").focus());
      press("Apple", "ArrowDown");
      expect(row("Avocado")).toHaveFocus();
      press("Avocado", "ArrowDown");
      press("Apricot", "ArrowDown");
      expect(row("Cherry")).toHaveFocus();
      expect(tabbableNames()).toEqual(["Cherry"]);
      press("Cherry", "ArrowUp");
      expect(row("Apricot")).toHaveFocus();
    });

    it("stays on the last row at the bottom and the first row at the top", () => {
      renderTree();
      act(() => row("Cherry").focus());
      press("Cherry", "ArrowDown");
      expect(row("Cherry")).toHaveFocus();
      act(() => row("Apple").focus());
      press("Apple", "ArrowUp");
      expect(row("Apple")).toHaveFocus();
    });

    it("moves to the first and last enabled rows with Home and End", () => {
      renderTree({ items: disable(["a", "c"]), defaultExpanded: ["a", "c"] });
      act(() => row("Banana").focus());
      press("Banana", "End");
      expect(row("Cranberry")).toHaveFocus();
      press("Cranberry", "Home");
      expect(row("Avocado")).toHaveFocus();
    });

    it("expands a collapsed row with Right, then moves to its first child", () => {
      const onExpandedChange = vi.fn();
      renderTree({ onExpandedChange });
      act(() => row("Apple").focus());
      press("Apple", "ArrowRight");
      expect(onExpandedChange).toHaveBeenLastCalledWith(new Set(["a"]));
      expect(row("Apple")).toHaveAttribute("aria-expanded", "true");
      expect(row("Apple")).toHaveFocus();
      press("Apple", "ArrowRight");
      expect(row("Avocado")).toHaveFocus();
    });

    it("does nothing with Right on a leaf", () => {
      const onExpandedChange = vi.fn();
      renderTree({ onExpandedChange });
      act(() => row("Banana").focus());
      press("Banana", "ArrowRight");
      expect(onExpandedChange).not.toHaveBeenCalled();
      expect(row("Banana")).toHaveFocus();
    });

    it("collapses an expanded row with Left, and moves a child to its parent", () => {
      renderTree({ defaultExpanded: ["a"] });
      act(() => row("Avocado").focus());
      press("Avocado", "ArrowLeft");
      expect(row("Apple")).toHaveFocus();
      press("Apple", "ArrowLeft");
      expect(row("Apple")).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByRole("treeitem", { name: "Avocado" })).not.toBeInTheDocument();
    });

    it("does nothing with Left on a collapsed root row", () => {
      renderTree();
      act(() => row("Banana").focus());
      press("Banana", "ArrowLeft");
      expect(row("Banana")).toHaveFocus();
    });

    it("does not move Left onto a disabled parent", () => {
      renderTree({ items: disable(["a"]), defaultExpanded: ["a"] });
      act(() => row("Avocado").focus());
      press("Avocado", "ArrowLeft");
      expect(row("Avocado")).toHaveFocus();
    });

    it("swaps Left and Right in a right-to-left tree", () => {
      renderTree({ style: { direction: "rtl" } });
      act(() => row("Apple").focus());
      press("Apple", "ArrowLeft");
      expect(row("Apple")).toHaveAttribute("aria-expanded", "true");
      press("Apple", "ArrowLeft");
      expect(row("Avocado")).toHaveFocus();
      press("Avocado", "ArrowRight");
      expect(row("Apple")).toHaveFocus();
      press("Apple", "ArrowRight");
      expect(row("Apple")).toHaveAttribute("aria-expanded", "false");
    });

    it("activates a row with Enter, selecting it in single mode", () => {
      const onAction = vi.fn();
      const onSelectedChange = vi.fn();
      renderTree({ selectionMode: "single", onAction, onSelectedChange });
      act(() => row("Banana").focus());
      press("Banana", "Enter");
      expect(onAction).toHaveBeenCalledWith("b");
      expect(onSelectedChange).toHaveBeenCalledWith("b");
      expect(row("Banana")).toHaveAttribute("aria-selected", "true");
    });

    it("activates a row with Enter without selecting it when selection is off", () => {
      const onAction = vi.fn();
      const onSelectedChange = vi.fn();
      renderTree({ onAction, onSelectedChange });
      press("Banana", "Enter");
      expect(onAction).toHaveBeenCalledWith("b");
      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it("selects a row with Space without activating it", () => {
      const onAction = vi.fn();
      renderTree({ selectionMode: "single", onAction });
      const event = press("Cherry", " ");
      expect(row("Cherry")).toHaveAttribute("aria-selected", "true");
      expect(onAction).not.toHaveBeenCalled();
      expect(event).toBe(false);
    });

    it("selects nothing with Space when selection is off", () => {
      const onSelectedChange = vi.fn();
      renderTree({ onSelectedChange });
      press("Cherry", " ");
      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it("neither activates nor selects a disabled row", () => {
      const onAction = vi.fn();
      const onSelectedChange = vi.fn();
      renderTree({ items: disable(["b"]), selectionMode: "single", onAction, onSelectedChange });
      press("Banana", "Enter");
      press("Banana", " ");
      expect(onAction).not.toHaveBeenCalled();
      expect(onSelectedChange).not.toHaveBeenCalled();
    });

    it("expands every enabled sibling with children with *", () => {
      const nodes: Node[] = [...items, { id: "d", label: "Date", disabled: true, children: [{ id: "d1", label: "Dried" }] }];
      const onExpandedChange = vi.fn();
      renderTree({ items: nodes, onExpandedChange });
      act(() => row("Banana").focus());
      press("Banana", "*");
      expect(onExpandedChange).toHaveBeenCalledWith(new Set(["a", "c"]));
      expect(rowNames()).toEqual(["Apple", "Avocado", "Apricot", "Banana", "Cherry", "Cranberry", "Date"]);
      expect(row("Banana")).toHaveFocus();
    });

    it("expands only the focused row's own siblings with *", () => {
      renderTree({ defaultExpanded: ["a"] });
      press("Avocado", "*");
      expect(row("Apricot")).toHaveAttribute("aria-expanded", "true");
      expect(row("Cherry")).toHaveAttribute("aria-expanded", "false");
    });

    it("leaves keys it does not handle to the page", () => {
      renderTree();
      expect(press("Apple", "Tab")).toBe(true);
      expect(press("Apple", "a", { ctrlKey: true })).toBe(true);
      expect(press("Apple", "a", { metaKey: true })).toBe(true);
      expect(press("Apple", "a", { altKey: true })).toBe(true);
      expect(press("Apple", "ArrowDown")).toBe(false);
    });

    it("works the same on a disabled row that has DOM focus", () => {
      const onFocusChange = vi.fn();
      renderTree({ items: disable(["b"]), onFocusChange });
      act(() => row("Banana").focus());
      expect(onFocusChange).not.toHaveBeenCalled();
      expect(tabbableNames()).toEqual(["Apple"]);
      press("Banana", "ArrowDown");
      expect(row("Cherry")).toHaveFocus();
    });
  });

  describe("type-ahead", () => {
    it("moves to the next row whose label starts with the typed character", () => {
      renderTree();
      act(() => row("Apple").focus());
      press("Apple", "c");
      expect(row("Cherry")).toHaveFocus();
    });

    it("matches a typed prefix, accumulating characters typed without a pause", () => {
      vi.useFakeTimers();
      renderTree({ defaultExpanded: ["a"] });
      act(() => row("Banana").focus());
      press("Banana", "A");
      expect(row("Apple")).toHaveFocus();
      press("Apple", "p");
      expect(row("Apple")).toHaveFocus();
      press("Apple", "r");
      expect(row("Apricot")).toHaveFocus();
    });

    it("wraps around past the last row", () => {
      renderTree();
      act(() => row("Cherry").focus());
      press("Cherry", "b");
      expect(row("Banana")).toHaveFocus();
    });

    it("cycles through rows sharing a first character after each pause", () => {
      vi.useFakeTimers();
      renderTree({ defaultExpanded: ["a"] });
      act(() => row("Apple").focus());
      press("Apple", "a");
      expect(row("Avocado")).toHaveFocus();
      act(() => vi.advanceTimersByTime(500));
      press("Avocado", "a");
      expect(row("Apricot")).toHaveFocus();
    });

    it("leaves focus where it is when nothing matches", () => {
      vi.useFakeTimers();
      renderTree();
      act(() => row("Apple").focus());
      press("Apple", "z");
      expect(row("Apple")).toHaveFocus();
      act(() => vi.advanceTimersByTime(500));
      press("Apple", "b");
      expect(row("Banana")).toHaveFocus();
    });

    it("skips disabled rows", () => {
      renderTree({ items: disable(["b"]) });
      act(() => row("Apple").focus());
      press("Apple", "b");
      expect(row("Apple")).toHaveFocus();
    });
  });

  describe("pointer", () => {
    it("moves the focus position to a clicked row and activates it", () => {
      const onAction = vi.fn();
      const onFocusChange = vi.fn();
      renderTree({ selectionMode: "single", onAction, onFocusChange });
      fireEvent.click(row("Cherry"));
      expect(onAction).toHaveBeenCalledWith("c");
      expect(onFocusChange).toHaveBeenCalledWith("c");
      expect(row("Cherry")).toHaveAttribute("aria-selected", "true");
      expect(tabbableNames()).toEqual(["Cherry"]);
    });

    it("does nothing for a click on a disabled row", () => {
      const onAction = vi.fn();
      const onFocusChange = vi.fn();
      renderTree({ items: disable(["b"]), onAction, onFocusChange });
      fireEvent.click(row("Banana"));
      expect(onAction).not.toHaveBeenCalled();
      expect(onFocusChange).not.toHaveBeenCalled();
      expect(tabbableNames()).toEqual(["Apple"]);
    });
  });

  describe("onFocusChange", () => {
    it("fires when the focus position moves to another row, and not again for the same row", () => {
      const onFocusChange = vi.fn();
      renderTree({ onFocusChange });
      act(() => row("Apple").focus());
      expect(onFocusChange).not.toHaveBeenCalled();
      press("Apple", "ArrowDown");
      expect(onFocusChange).toHaveBeenCalledTimes(1);
      expect(onFocusChange).toHaveBeenLastCalledWith("b");
      act(() => row("Cherry").focus());
      expect(onFocusChange).toHaveBeenLastCalledWith("c");
      expect(onFocusChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("row state", () => {
    function stateRenderItem(node: Node, state: TreeItemState) {
      return (
        <div
          {...state.getItemProps()}
          data-focused={state.focused}
          data-selected={state.selected}
          data-level={state.level}
          data-has-children={state.hasChildren}
          data-expanded={state.expanded}
          data-disabled={state.disabled}
          data-id={state.id}
        >
          {node.label}
          {/* biome-ignore lint/a11y/noStaticElementInteractions: a pointer-only expand affordance; the row's own arrow keys expand it from the keyboard */}
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: as above, the keyboard reaches expansion through the row */}
          <span
            data-testid={`toggle-${state.id}`}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              state.toggle();
            }}
          />
        </div>
      );
    }

    it("tells renderItem the row's level, children, expansion, selection and disabledness", () => {
      renderTree({
        items: disable(["b"]),
        renderItem: stateRenderItem,
        selectionMode: "single",
        defaultSelectedId: "a1",
        defaultExpanded: ["a"],
      });
      expect(row("Apple")).toHaveAttribute("data-has-children", "true");
      expect(row("Apple")).toHaveAttribute("data-expanded", "true");
      expect(row("Avocado")).toHaveAttribute("data-level", "2");
      expect(row("Avocado")).toHaveAttribute("data-selected", "true");
      expect(row("Avocado")).toHaveAttribute("data-id", "a1");
      expect(row("Banana")).toHaveAttribute("data-disabled", "true");
    });

    it("reports a row focused only while DOM focus is inside the tree", () => {
      render(
        <>
          {tree({ renderItem: stateRenderItem })}
          <button type="button">Outside</button>
        </>,
      );
      expect(row("Apple")).toHaveAttribute("data-focused", "false");
      act(() => row("Apple").focus());
      expect(row("Apple")).toHaveAttribute("data-focused", "true");
      press("Apple", "ArrowDown");
      expect(row("Banana")).toHaveAttribute("data-focused", "true");
      expect(row("Apple")).toHaveAttribute("data-focused", "false");
      act(() => screen.getByRole("button", { name: "Outside" }).focus());
      expect(row("Banana")).toHaveAttribute("data-focused", "false");
    });

    it("toggles a row's expansion through state.toggle without activating it", () => {
      const onAction = vi.fn();
      renderTree({ renderItem: stateRenderItem, onAction });
      fireEvent.click(screen.getByTestId("toggle-a"));
      expect(row("Apple")).toHaveAttribute("aria-expanded", "true");
      fireEvent.click(screen.getByTestId("toggle-a"));
      expect(row("Apple")).toHaveAttribute("aria-expanded", "false");
      expect(onAction).not.toHaveBeenCalled();
    });

    it("makes state.toggle a no-op on a leaf and on a disabled row", () => {
      const onExpandedChange = vi.fn();
      renderTree({ items: disable(["c"]), renderItem: stateRenderItem, onExpandedChange });
      fireEvent.click(screen.getByTestId("toggle-b"));
      fireEvent.click(screen.getByTestId("toggle-c"));
      expect(onExpandedChange).not.toHaveBeenCalled();
    });
  });

  describe("getItemProps", () => {
    it("lets the tree's role, aria, tabIndex and handlers win over the consumer's", () => {
      const consumerClick = vi.fn();
      const consumerKeyDown = vi.fn();
      const consumerFocus = vi.fn();
      const onAction = vi.fn();
      renderTree({
        onAction,
        renderItem: (node, state) => (
          <div
            {...state.getItemProps({
              role: "button",
              tabIndex: 3,
              "aria-level": 9,
              "aria-expanded": true,
              onClick: consumerClick,
              onKeyDown: consumerKeyDown,
              onFocus: consumerFocus,
            })}
          >
            {node.label}
          </div>
        ),
      });
      expect(row("Banana")).toHaveAttribute("tabindex", "-1");
      expect(row("Banana")).toHaveAttribute("aria-level", "1");
      expect(row("Banana")).not.toHaveAttribute("aria-expanded");
      fireEvent.click(row("Banana"));
      act(() => row("Banana").focus());
      press("Banana", "ArrowDown");
      expect(onAction).toHaveBeenCalledWith("b");
      expect(row("Cherry")).toHaveFocus();
      expect(consumerClick).not.toHaveBeenCalled();
      expect(consumerKeyDown).not.toHaveBeenCalled();
      expect(consumerFocus).not.toHaveBeenCalled();
    });

    it("passes the consumer's other props through, joins className and lays style over its own", () => {
      const onDragStart = vi.fn();
      renderTree({
        renderItem: (node, state) => (
          <div
            {...state.getItemProps({
              className: "row",
              style: { paddingInlineStart: "4px", color: "red" },
              draggable: true,
              onDragStart,
              title: node.label,
            })}
          >
            {node.label}
          </div>
        ),
      });
      const apple = row("Apple");
      expect(apple).toHaveClass("vpg-tree-item", "row");
      expect(apple.style.paddingInlineStart).toBe("4px");
      expect(apple.style.color).toBe("red");
      expect(apple).toHaveAttribute("draggable", "true");
      expect(apple).toHaveAttribute("title", "Apple");
      fireEvent.dragStart(apple);
      expect(onDragStart).toHaveBeenCalled();
    });

    it("merges a consumer's ref object and ref callback with its own", () => {
      const objectRef = createRef<HTMLElement>();
      const callbackRef = vi.fn();
      const { unmount } = renderTree({
        renderItem: (node, state) => <div {...state.getItemProps({ ref: node.id === "a" ? objectRef : callbackRef })}>{node.label}</div>,
      });
      expect(objectRef.current).toBe(row("Apple"));
      expect(callbackRef).toHaveBeenCalledWith(row("Banana"));
      act(() => row("Apple").focus());
      press("Apple", "ArrowDown");
      expect(row("Banana")).toHaveFocus();
      unmount();
      expect(objectRef.current).toBeNull();
      expect(callbackRef).toHaveBeenLastCalledWith(null);
    });

    it("accepts a null ref", () => {
      renderTree({
        renderItem: (node, state) => <div {...state.getItemProps({ ref: null })}>{node.label}</div>,
      });
      act(() => row("Apple").focus());
      press("Apple", "ArrowDown");
      expect(row("Banana")).toHaveFocus();
    });

    it("moves the focus position to a row that did not take the ref, without moving DOM focus", () => {
      const onFocusChange = vi.fn();
      renderTree({
        onFocusChange,
        renderItem: (node, state) => {
          const { ref: _ref, ...props } = state.getItemProps();
          return <div {...(node.id === "b" ? props : state.getItemProps())}>{node.label}</div>;
        },
      });
      act(() => row("Apple").focus());
      press("Apple", "ArrowDown");
      expect(onFocusChange).toHaveBeenCalledWith("b");
      expect(tabbableNames()).toEqual(["Banana"]);
      expect(row("Apple")).toHaveFocus();
    });
  });

  describe("controlled and uncontrolled state", () => {
    it("reports expansion without applying it while expanded is controlled", () => {
      const onExpandedChange = vi.fn();
      const { rerenderTree } = renderTree({ expanded: new Set(), onExpandedChange });
      press("Apple", "ArrowRight");
      expect(onExpandedChange).toHaveBeenCalledWith(new Set(["a"]));
      expect(row("Apple")).toHaveAttribute("aria-expanded", "false");
      rerenderTree({ expanded: new Set(["a"]), onExpandedChange });
      expect(row("Apple")).toHaveAttribute("aria-expanded", "true");
    });

    it("reports selection without applying it while selectedId is controlled", () => {
      const onSelectedChange = vi.fn();
      const { rerenderTree } = renderTree({ selectionMode: "single", selectedId: null, onSelectedChange });
      fireEvent.click(row("Banana"));
      expect(onSelectedChange).toHaveBeenCalledWith("b");
      expect(row("Banana")).toHaveAttribute("aria-selected", "false");
      rerenderTree({ selectionMode: "single", selectedId: "b", onSelectedChange });
      expect(row("Banana")).toHaveAttribute("aria-selected", "true");
    });

    it("works without any callbacks", () => {
      renderTree({ selectionMode: "single" });
      press("Apple", "ArrowRight");
      press("Apple", "Enter");
      press("Apple", "ArrowDown");
      expect(row("Apple")).toHaveAttribute("aria-selected", "true");
      expect(row("Avocado")).toHaveFocus();
    });
  });

  describe("focus recovery", () => {
    function ControlledTree(props: Props & { outside?: boolean }) {
      const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(["a", "a2"]));
      return (
        <>
          <button type="button" onClick={() => setExpanded(new Set())}>
            Collapse all
          </button>
          {tree({ expanded, onExpandedChange: setExpanded, ...props })}
        </>
      );
    }

    it("moves focus to the nearest surviving ancestor when a collapse hides the focused row", () => {
      const onFocusChange = vi.fn();
      const { rerenderTree } = renderTree({ expanded: new Set(["a", "a2"]), onFocusChange });
      act(() => row("Almond").focus());
      rerenderTree({ expanded: new Set(["a"]), onFocusChange });
      expect(row("Apricot")).toHaveFocus();
      expect(tabbableNames()).toEqual(["Apricot"]);
      expect(onFocusChange).toHaveBeenLastCalledWith("a2");
    });

    it("skips a hidden or disabled ancestor for the nearest enabled one", () => {
      const { rerenderTree } = renderTree({ expanded: new Set(["a", "a2"]) });
      act(() => row("Almond").focus());
      rerenderTree({ items: disable(["a2"]), expanded: new Set(["a"]) });
      expect(row("Apple")).toHaveFocus();
    });

    it("moves the tabbable row without taking DOM focus when focus was outside the tree", () => {
      render(<ControlledTree />);
      act(() => row("Almond").focus());
      const button = screen.getByRole("button", { name: "Collapse all" });
      act(() => button.focus());
      fireEvent.click(button);
      expect(tabbableNames()).toEqual(["Apple"]);
      expect(button).toHaveFocus();
    });

    it("moves to the row that takes the removed row's place when no ancestor survives", () => {
      const { rerenderTree } = renderTree();
      act(() => row("Banana").focus());
      rerenderTree({ items: items.filter((node) => node.id !== "b") });
      expect(row("Cherry")).toHaveFocus();
    });

    it("moves to the nearest row before it when the removed row was last", () => {
      const { rerenderTree } = renderTree();
      act(() => row("Cherry").focus());
      rerenderTree({ items: items.filter((node) => node.id !== "c") });
      expect(row("Banana")).toHaveFocus();
    });

    it("moves off a row that becomes disabled", () => {
      const onFocusChange = vi.fn();
      const { rerenderTree } = renderTree({ onFocusChange });
      act(() => row("Banana").focus());
      rerenderTree({ items: disable(["b"]), onFocusChange });
      expect(row("Cherry")).toHaveFocus();
      expect(onFocusChange).toHaveBeenLastCalledWith("c");
    });

    it("keeps nothing tabbable when every row is gone, and takes no focus when rows return", () => {
      const { rerenderTree } = renderTree();
      act(() => row("Banana").focus());
      rerenderTree({ items: [] });
      expect(screen.queryAllByRole("treeitem")).toHaveLength(0);
      rerenderTree({});
      expect(tabbableNames()).toEqual(["Apple"]);
      expect(document.activeElement).toBe(document.body);
    });

    it("recovers to a row that did not take the ref without moving DOM focus", () => {
      const { rerenderTree } = renderTree({
        renderItem: (node, state) => {
          const { ref: _ref, ...props } = state.getItemProps();
          return <div {...(node.id === "c" ? props : state.getItemProps())}>{node.label}</div>;
        },
      });
      act(() => row("Banana").focus());
      rerenderTree({
        items: items.filter((node) => node.id !== "b"),
        renderItem: (node, state) => {
          const { ref: _ref, ...props } = state.getItemProps();
          return <div {...(node.id === "c" ? props : state.getItemProps())}>{node.label}</div>;
        },
      });
      expect(tabbableNames()).toEqual(["Cherry"]);
      expect(row("Cherry")).not.toHaveFocus();
    });
  });

  describe("windowing", () => {
    // A virtualized tree's rows are placed by real layout, which jsdom has none of; its
    // behaviour is proven in Tree.browser.test.tsx.
    it("mounts every row in place without virtualized, ignoring a rowHeight", () => {
      const virtualized: boolean = false;
      render(
        <Tree
          aria-label="Fruit"
          items={items}
          getId={getId}
          getLabel={getLabel}
          getChildren={getChildren}
          renderItem={defaultRenderItem}
          defaultExpanded={["a"]}
          virtualized={virtualized}
          rowHeight={24}
        />,
      );
      const container = screen.getByRole("tree");
      expect(container).not.toHaveClass("vpg-tree-virtualized");
      expect(rowNames()).toEqual(["Apple", "Avocado", "Apricot", "Banana", "Cherry"]);
      for (const element of screen.getAllByRole("treeitem")) {
        expect(element.parentElement).toBe(container);
        expect(element.style.position).toBe("");
        expect(element.style.height).toBe("");
        expect(element.style.transform).toBe("");
      }
    });

    it("requires a rowHeight with virtualized", () => {
      const base = { items, getId, getLabel, getChildren, renderItem: defaultRenderItem };
      // @ts-expect-error -- windowing positions rows by a fixed height, so it cannot go without one
      const withoutHeight: TreeProps<Node> = { ...base, virtualized: true };
      const withHeight: TreeProps<Node> = { ...base, virtualized: true, rowHeight: 24 };
      expect(withoutHeight.rowHeight).toBeUndefined();
      expect(withHeight.rowHeight).toBe(24);
    });
  });

  describe("container focus handlers", () => {
    it("calls the consumer's onFocus and onBlur", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(
        <>
          {tree({ onFocus, onBlur })}
          <button type="button">Outside</button>
        </>,
      );
      act(() => row("Apple").focus());
      expect(onFocus).toHaveBeenCalled();
      press("Apple", "ArrowDown");
      expect(onBlur).toHaveBeenCalledTimes(1);
      act(() => screen.getByRole("button", { name: "Outside" }).focus());
      expect(onBlur).toHaveBeenCalledTimes(2);
    });
  });
});
