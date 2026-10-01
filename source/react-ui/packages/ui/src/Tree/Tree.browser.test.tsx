import { ThemeProvider } from "@vipengele/react-tokens";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { Tree, type TreeItemState, type TreeProps } from "./Tree.js";

// The chromium project has no setup file, so nothing auto-cleans between tests the way the
// jsdom project's does; without this every render after the first collides with the previous
// one and `getByRole` starts matching more than one tree.
afterEach(cleanup);

interface Node {
  id: string;
  label: string;
  children?: Node[];
}

const GROUPS = 100;
const CHILDREN = 99;
/** Every group and every child of it, all expanded: 10,000 rows. */
const ROW_COUNT = GROUPS * (CHILDREN + 1);
/** Shorter than the control scale's md step, so the row's minimum height would win if it could. */
const ROW_HEIGHT = 20;
const VIEWPORT_ROWS = 10;
const VIEWPORT_HEIGHT = ROW_HEIGHT * VIEWPORT_ROWS;

/** Groups are labelled "Group N", except the last, whose label is the only one starting with "z". */
const items: Node[] = Array.from({ length: GROUPS }, (_, group) => ({
  id: `g${group}`,
  label: group === GROUPS - 1 ? "Zulu" : `Group ${group}`,
  children: Array.from({ length: CHILDREN }, (_, child) => ({ id: `g${group}-${child}`, label: `Item ${group}.${child}` })),
}));
const allGroups: ReadonlySet<string> = new Set(items.map((node) => node.id));

/** The id of the row at `index` in the fully expanded tree. */
function idAt(index: number) {
  const group = Math.floor(index / (CHILDREN + 1));
  const offset = index % (CHILDREN + 1);
  return offset === 0 ? `g${group}` : `g${group}-${offset - 1}`;
}

function renderItem(node: Node, state: TreeItemState) {
  return <div {...state.getItemProps({ id: node.id })}>{node.label}</div>;
}

type Props = Partial<Omit<TreeProps<Node>, "virtualized" | "rowHeight">>;

function tree(props: Props = {}) {
  return (
    <Tree
      aria-label="Groups"
      items={items}
      getId={(node) => node.id}
      getLabel={(node) => node.label}
      getChildren={(node) => node.children}
      renderItem={renderItem}
      defaultExpanded={allGroups}
      virtualized
      rowHeight={ROW_HEIGHT}
      style={{ height: `${VIEWPORT_HEIGHT}px` }}
      {...props}
    />
  );
}

function renderTree(props: Props = {}) {
  const result = render(
    <ThemeProvider>
      <button type="button">Before</button>
      {tree(props)}
    </ThemeProvider>,
  );
  return {
    treeElement: screen.getByRole("tree"),
    rerenderTree: (next: Props) =>
      result.rerender(
        <ThemeProvider>
          <button type="button">Before</button>
          {tree(next)}
        </ThemeProvider>,
      ),
  };
}

function mountedIds() {
  return screen.getAllByRole("treeitem").map((element) => element.id);
}

function rowById(id: string) {
  return document.getElementById(id);
}

function focusedId() {
  return document.activeElement?.id;
}

/** Whether `element` lies wholly inside the scroll container's visible box. */
function inView(element: Element, container: Element) {
  const row = element.getBoundingClientRect();
  const box = container.getBoundingClientRect();
  return row.top >= box.top - 0.5 && row.bottom <= box.bottom + 0.5;
}

describe("Tree, virtualized, in a real browser", () => {
  it("mounts only the window of rows in view, starting at the first, in a spacer as tall as every row", () => {
    const { treeElement } = renderTree();
    const ids = mountedIds();
    expect(ids[0]).toBe("g0");
    expect(ids.length).toBeGreaterThanOrEqual(VIEWPORT_ROWS);
    expect(ids.length).toBeLessThan(VIEWPORT_ROWS * 2);
    expect(treeElement).toHaveClass("vpg-tree", "vpg-tree-virtualized");
    expect(treeElement.getBoundingClientRect().height).toBeCloseTo(VIEWPORT_HEIGHT, 0);
    const spacer = treeElement.querySelector(".vpg-tree-spacer") as HTMLElement;
    expect(spacer.getBoundingClientRect().height).toBeCloseTo(ROW_COUNT * ROW_HEIGHT, 0);
  });

  it("holds every windowed row at its fixed height and offset, under the control scale's minimum", () => {
    const { treeElement } = renderTree();
    const top = treeElement.getBoundingClientRect().top;
    for (const [index, id] of mountedIds().entries()) {
      const rect = (rowById(id) as HTMLElement).getBoundingClientRect();
      expect(rect.height).toBeCloseTo(ROW_HEIGHT, 0);
      expect(rect.top - top).toBeCloseTo(index * ROW_HEIGHT, 0);
    }
  });

  it("renders the rows at the scrolled-to offset, keeping the tabbable first row mounted", async () => {
    const { treeElement } = renderTree();
    treeElement.scrollTop = 5000 * ROW_HEIGHT;
    await expect.poll(() => rowById(idAt(5000))).not.toBeNull();
    expect(inView(rowById(idAt(5000)) as HTMLElement, treeElement)).toBe(true);
    expect(rowById(idAt(1))).toBeNull();
    expect(rowById("g0")).toHaveAttribute("tabindex", "0");
    expect(mountedIds().length).toBeLessThan(VIEWPORT_ROWS * 2 + 1);
  });

  it("gives every mounted row the level, set size and position the whole model gives it", async () => {
    const { treeElement } = renderTree();
    treeElement.scrollTop = 5050 * ROW_HEIGHT;
    await expect.poll(() => rowById(idAt(5050))).not.toBeNull();
    const child = rowById("g50-49") as HTMLElement;
    expect(child).toHaveAttribute("aria-level", "2");
    expect(child).toHaveAttribute("aria-setsize", String(CHILDREN));
    expect(child).toHaveAttribute("aria-posinset", "50");
    const first = rowById("g0") as HTMLElement;
    expect(first).toHaveAttribute("aria-level", "1");
    expect(first).toHaveAttribute("aria-setsize", String(GROUPS));
    expect(first).toHaveAttribute("aria-posinset", "1");
  });

  it("keeps an out-of-view selected row mounted and tabbable, so Tab lands on it", async () => {
    const { treeElement } = renderTree({ selectionMode: "single", defaultSelectedId: "g70-5" });
    const selected = rowById("g70-5") as HTMLElement;
    expect(selected).not.toBeNull();
    expect(selected).toHaveAttribute("tabindex", "0");
    expect(inView(selected, treeElement)).toBe(false);
    expect(mountedIds()).toContain("g70-5");

    screen.getByRole("button", { name: "Before" }).focus();
    await userEvent.tab();
    expect(focusedId()).toBe("g70-5");
    await expect.poll(() => inView(rowById("g70-5") as HTMLElement, treeElement)).toBe(true);
  });

  it("mounts the window with no tabbable row when every row is disabled", () => {
    renderTree({ getDisabled: () => true });
    const rows = screen.getAllByRole("treeitem");
    expect(rows[0]?.id).toBe("g0");
    expect(rows.length).toBeLessThan(VIEWPORT_ROWS * 2);
    expect(rows.every((element) => element.tabIndex === -1)).toBe(true);
  });

  it("scrolls to and focuses the last row with End, and the first with Home", async () => {
    const { treeElement } = renderTree();
    await userEvent.click(rowById("g0") as HTMLElement);
    expect(rowById(idAt(ROW_COUNT - 1))).toBeNull();

    await userEvent.keyboard("{End}");
    await expect.poll(focusedId).toBe(idAt(ROW_COUNT - 1));
    await expect.poll(() => inView(rowById(idAt(ROW_COUNT - 1)) as HTMLElement, treeElement)).toBe(true);
    expect(rowById(idAt(1))).toBeNull();

    await userEvent.keyboard("{Home}");
    await expect.poll(focusedId).toBe("g0");
    await expect.poll(() => treeElement.scrollTop).toBe(0);
    expect(rowById(idAt(ROW_COUNT - 1))).toBeNull();
  });

  it("moves focus row by row with ArrowDown past the bottom of the window", async () => {
    const { treeElement } = renderTree();
    await userEvent.click(rowById("g0") as HTMLElement);
    for (let index = 1; index <= VIEWPORT_ROWS * 3; index += 1) {
      await userEvent.keyboard("{ArrowDown}");
      await expect.poll(focusedId).toBe(idAt(index));
    }
    await expect.poll(() => inView(rowById(idAt(VIEWPORT_ROWS * 3)) as HTMLElement, treeElement)).toBe(true);
    expect(rowById(idAt(1))).toBeNull();
  });

  it("type-ahead focuses a matching row that is not mounted", async () => {
    const { treeElement } = renderTree();
    await userEvent.click(rowById("g0") as HTMLElement);
    expect(rowById("g99")).toBeNull();
    await userEvent.keyboard("z");
    await expect.poll(focusedId).toBe("g99");
    await expect.poll(() => inView(rowById("g99") as HTMLElement, treeElement)).toBe(true);
  });

  it("moves focus to the surviving ancestor when a collapse hides the focused row far down", async () => {
    const { treeElement, rerenderTree } = renderTree({ expanded: allGroups });
    await userEvent.click(rowById("g0") as HTMLElement);
    await userEvent.keyboard("{End}");
    await expect.poll(focusedId).toBe(idAt(ROW_COUNT - 1));

    rerenderTree({ expanded: new Set() });
    await expect.poll(focusedId).toBe("g99");
    expect(rowById("g99")).toHaveAttribute("tabindex", "0");
    await expect.poll(() => inView(rowById("g99") as HTMLElement, treeElement)).toBe(true);
    const spacer = treeElement.querySelector(".vpg-tree-spacer") as HTMLElement;
    expect(spacer.getBoundingClientRect().height).toBeCloseTo(GROUPS * ROW_HEIGHT, 0);
  });
});
