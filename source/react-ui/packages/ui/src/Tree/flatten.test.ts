import { describe, expect, it } from "vitest";
import { type FlatRow, type FlattenOptions, flatten } from "./flatten";

interface Node {
  id: string;
  label?: string;
  children?: Node[];
  disabled?: boolean;
}

const accessors = {
  getId: (node: Node) => node.id,
  getLabel: (node: Node) => node.label ?? node.id.toUpperCase(),
  getChildren: (node: Node) => node.children,
};

function run(items: readonly Node[], expanded: readonly string[] = [], extra: Partial<FlattenOptions<Node>> = {}) {
  return flatten({ items, expanded: new Set(expanded), ...accessors, ...extra });
}

/** The fields that describe a row's place in the tree, without the node itself. */
function shape(rows: readonly FlatRow<Node>[]) {
  return rows.map(({ node: _node, ...rest }) => rest);
}

const tree: Node[] = [
  {
    id: "a",
    children: [{ id: "a1" }, { id: "a2", children: [{ id: "a2x" }] }, { id: "a3" }],
  },
  { id: "b", children: [] },
  { id: "c" },
];

describe("flatten", () => {
  it("returns no rows for no items", () => {
    expect(run([])).toEqual([]);
  });

  it("returns every root as a level-1 row with its sibling position", () => {
    expect(shape(run(tree))).toEqual([
      {
        id: "a",
        label: "A",
        level: 1,
        setSize: 3,
        posInSet: 1,
        parentId: undefined,
        hasChildren: true,
        expanded: false,
        disabled: false,
        index: 0,
      },
      {
        id: "b",
        label: "B",
        level: 1,
        setSize: 3,
        posInSet: 2,
        parentId: undefined,
        hasChildren: false,
        expanded: false,
        disabled: false,
        index: 1,
      },
      {
        id: "c",
        label: "C",
        level: 1,
        setSize: 3,
        posInSet: 3,
        parentId: undefined,
        hasChildren: false,
        expanded: false,
        disabled: false,
        index: 2,
      },
    ]);
  });

  it("carries the node itself and its label from the accessor", () => {
    const [row] = run([{ id: "x", label: "Readme" }]);
    expect(row?.node).toEqual({ id: "x", label: "Readme" });
    expect(row?.label).toBe("Readme");
  });

  it("hides a collapsed node's children", () => {
    expect(run(tree).map((row) => row.id)).toEqual(["a", "b", "c"]);
  });

  it("shows an expanded node's children right after it, one level deeper", () => {
    const rows = run(tree, ["a"]);
    expect(rows.map((row) => row.id)).toEqual(["a", "a1", "a2", "a3", "b", "c"]);
    expect(rows[0]?.expanded).toBe(true);
    expect(shape(rows.slice(1, 4))).toEqual([
      {
        id: "a1",
        label: "A1",
        level: 2,
        setSize: 3,
        posInSet: 1,
        parentId: "a",
        hasChildren: false,
        expanded: false,
        disabled: false,
        index: 1,
      },
      {
        id: "a2",
        label: "A2",
        level: 2,
        setSize: 3,
        posInSet: 2,
        parentId: "a",
        hasChildren: true,
        expanded: false,
        disabled: false,
        index: 2,
      },
      {
        id: "a3",
        label: "A3",
        level: 2,
        setSize: 3,
        posInSet: 3,
        parentId: "a",
        hasChildren: false,
        expanded: false,
        disabled: false,
        index: 3,
      },
    ]);
  });

  it("numbers a later root's sibling position independently of an earlier root's open children", () => {
    const rows = run(tree, ["a"]);
    expect(rows.find((row) => row.id === "b")).toMatchObject({ level: 1, setSize: 3, posInSet: 2, index: 4 });
  });

  it("shows nested children only while every ancestor is expanded", () => {
    expect(run(tree, ["a2"]).map((row) => row.id)).toEqual(["a", "b", "c"]);
    const rows = run(tree, ["a", "a2"]);
    expect(rows.map((row) => row.id)).toEqual(["a", "a1", "a2", "a2x", "a3", "b", "c"]);
    expect(rows[3]).toMatchObject({ id: "a2x", level: 3, setSize: 1, posInSet: 1, parentId: "a2", index: 3 });
  });

  it("assigns each row its index in the returned list", () => {
    const rows = run(tree, ["a", "a2"]);
    expect(rows.map((row) => row.index)).toEqual(rows.map((_, i) => i));
  });

  it("never marks a node with no children expanded, whether its children are undefined or empty", () => {
    const rows = run(tree, ["a1", "b", "c"]);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(rows[1]).toMatchObject({ id: "b", hasChildren: false, expanded: false });
    expect(rows[2]).toMatchObject({ id: "c", hasChildren: false, expanded: false });
  });

  it("ignores expanded ids no node carries", () => {
    expect(run(tree, ["nope", "a"]).map((row) => row.id)).toEqual(["a", "a1", "a2", "a3", "b", "c"]);
  });

  it("marks no row disabled without a disabled accessor", () => {
    expect(run([{ id: "x", disabled: true }])[0]?.disabled).toBe(false);
  });

  it("marks a row disabled when the accessor says so", () => {
    const rows = run([{ id: "x", disabled: true }, { id: "y" }], [], { getDisabled: (node) => node.disabled === true });
    expect(rows.map((row) => row.disabled)).toEqual([true, false]);
  });

  it("shows a disabled node's children when it is expanded", () => {
    const items: Node[] = [{ id: "p", disabled: true, children: [{ id: "q" }] }];
    const rows = run(items, ["p"], { getDisabled: (node) => node.disabled === true });
    expect(rows.map((row) => [row.id, row.disabled])).toEqual([
      ["p", true],
      ["q", false],
    ]);
  });

  describe("duplicate ids", () => {
    it("keeps the first sibling carrying an id and drops the later one", () => {
      const first = { id: "d", label: "first" };
      const rows = run([first, { id: "e" }, { id: "d", label: "second" }]);
      expect(rows.map((row) => row.id)).toEqual(["d", "e"]);
      expect(rows[0]?.node).toBe(first);
    });

    it("leaves a dropped duplicate out of its siblings' set size and positions", () => {
      const rows = run([{ id: "d" }, { id: "d" }, { id: "e" }]);
      expect(rows.map((row) => [row.id, row.posInSet, row.setSize])).toEqual([
        ["d", 1, 2],
        ["e", 2, 2],
      ]);
    });

    it("drops a later duplicate together with its subtree", () => {
      const items: Node[] = [{ id: "d" }, { id: "d", children: [{ id: "child" }] }];
      expect(run(items, ["d"]).map((row) => row.id)).toEqual(["d"]);
    });

    it("keeps the first occurrence in display order across different parents", () => {
      const items: Node[] = [
        { id: "p", children: [{ id: "x" }] },
        { id: "x", label: "root x" },
      ];
      expect(run(items, ["p"]).map((row) => [row.id, row.parentId])).toEqual([
        ["p", undefined],
        ["x", "p"],
      ]);
      expect(run(items).map((row) => [row.id, row.label])).toEqual([
        ["p", "P"],
        ["x", "root x"],
      ]);
    });

    it("terminates on a node that is its own descendant", () => {
      const loop: Node = { id: "loop" };
      loop.children = [loop, { id: "leaf" }];
      const rows = run([loop], ["loop"]);
      expect(rows.map((row) => [row.id, row.level, row.posInSet, row.setSize])).toEqual([
        ["loop", 1, 1, 1],
        ["leaf", 2, 1, 1],
      ]);
    });
  });

  it("flattens a deeply nested chain without exhausting the stack", () => {
    const depth = 20_000;
    let node: Node = { id: `n${depth}` };
    const ids = [node.id];
    for (let level = depth - 1; level >= 1; level--) {
      node = { id: `n${level}`, children: [node] };
      ids.push(node.id);
    }
    const rows = run([node], ids);
    expect(rows).toHaveLength(depth);
    expect(rows.at(-1)).toMatchObject({ id: `n${depth}`, level: depth, parentId: `n${depth - 1}`, setSize: 1 });
  });
});
