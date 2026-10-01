import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChevronDown, ChevronRight, Icon } from "@vipengele/react-icons";
import { Badge, Tree, type TreeItemState, Typography } from "@vipengele/react-ui";
import { type CSSProperties, type DragEvent, useState } from "react";

interface TreeNode {
  id: string;
  label: string;
  /** Shown by the hatua-style row as the node's type. */
  kind?: string;
  /** Shown by the hatua-style row as a "used" badge. */
  used?: boolean;
  disabled?: boolean;
  children?: TreeNode[];
}

const meta = {
  title: "Components/Tree",
  component: Tree,
} satisfies Meta<typeof Tree>;

export default meta;

type Story = StoryObj;

// Accessors are module-level so the tree's row model is not recomputed on every render.
const getId = (node: TreeNode) => node.id;
const getLabel = (node: TreeNode) => node.label;
const getChildren = (node: TreeNode) => node.children;
const getDisabled = (node: TreeNode) => node.disabled === true;

const files: TreeNode[] = [
  {
    id: "src",
    label: "src",
    children: [
      {
        id: "components",
        label: "components",
        children: [
          { id: "button", label: "Button.tsx" },
          { id: "tabs", label: "Tabs.tsx" },
          { id: "tree", label: "Tree.tsx" },
        ],
      },
      { id: "index", label: "index.ts" },
    ],
  },
  {
    id: "docs",
    label: "docs",
    children: [
      { id: "readme", label: "README.md" },
      { id: "changelog", label: "CHANGELOG.md" },
    ],
  },
  { id: "package", label: "package.json" },
];

const treeBorder: CSSProperties = {
  border: "1px solid var(--vpg-border)",
  borderRadius: "var(--vpg-radius-sm)",
  padding: "var(--vpg-space-2)",
};

/** The expand affordance: a chevron for a node with children, a same-width gap for a leaf. */
function Chevron({ state }: { state: TreeItemState }) {
  const style: CSSProperties = { display: "inline-flex", width: 16, justifyContent: "center", color: "var(--vpg-ink-muted)" };
  if (!state.hasChildren) return <span aria-hidden style={style} />;
  return (
    <span
      aria-hidden
      style={{ ...style, cursor: "pointer" }}
      onClick={(event) => {
        event.stopPropagation();
        state.toggle();
      }}
    >
      <Icon icon={state.expanded ? ChevronDown : ChevronRight} size={14} />
    </span>
  );
}

function renderBasicItem(node: TreeNode, state: TreeItemState) {
  return (
    <div {...state.getItemProps()}>
      <Chevron state={state} />
      {node.label}
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <div style={{ ...treeBorder, maxWidth: 320 }}>
      <Tree
        aria-label="Project files"
        items={files}
        getId={getId}
        getLabel={getLabel}
        getChildren={getChildren}
        renderItem={renderBasicItem}
      />
    </div>
  ),
};

export const Expanded: Story = {
  render: () => (
    <div style={{ ...treeBorder, maxWidth: 320 }}>
      <Tree
        aria-label="Project files"
        items={files}
        getId={getId}
        getLabel={getLabel}
        getChildren={getChildren}
        renderItem={renderBasicItem}
        defaultExpanded={["src", "components", "docs"]}
      />
    </div>
  ),
};

export const SingleSelection: Story = {
  name: "Single selection",
  render: function SingleSelection() {
    const [activated, setActivated] = useState<string>();
    return (
      <div style={{ maxWidth: 320 }}>
        <div style={treeBorder}>
          <Tree
            aria-label="Project files"
            items={files}
            getId={getId}
            getLabel={getLabel}
            getChildren={getChildren}
            renderItem={renderBasicItem}
            selectionMode="single"
            defaultSelectedId="tabs"
            defaultExpanded={["src", "components"]}
            onAction={setActivated}
          />
        </div>
        <Typography variant="body-md">Last activated: {activated ?? "none"}</Typography>
      </div>
    );
  },
};

const withDisabled: TreeNode[] = [
  {
    id: "public",
    label: "public",
    children: [
      { id: "logo", label: "logo.svg" },
      { id: "favicon", label: "favicon.ico", disabled: true },
    ],
  },
  { id: "secrets", label: "secrets", disabled: true, children: [{ id: "key", label: "key.pem" }] },
  { id: "license", label: "LICENSE" },
];

export const DisabledNodes: Story = {
  name: "Disabled nodes",
  render: () => (
    <div style={{ ...treeBorder, maxWidth: 320 }}>
      <Tree
        aria-label="Files, some disabled"
        items={withDisabled}
        getId={getId}
        getLabel={getLabel}
        getChildren={getChildren}
        getDisabled={getDisabled}
        renderItem={renderBasicItem}
        selectionMode="single"
        defaultExpanded={["public", "secrets"]}
      />
    </div>
  ),
};

const ROW_HEIGHT = 30;

const labelStyle: CSSProperties = { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const kindStyle: CSSProperties = { color: "var(--vpg-ink-subtle)", fontSize: "var(--vpg-font-size-xs)" };

function renderTypedItem(node: TreeNode, state: TreeItemState) {
  return (
    <div {...state.getItemProps({ style: { height: ROW_HEIGHT, minHeight: ROW_HEIGHT } })}>
      <Chevron state={state} />
      <span style={labelStyle}>{node.label}</span>
      {node.kind !== undefined && <span style={kindStyle}>{node.kind}</span>}
      {node.used === true && (
        <Badge size="sm" variant="accent">
          used
        </Badge>
      )}
    </div>
  );
}

const typedItems: TreeNode[] = [
  {
    id: "datasets",
    label: "Datasets",
    kind: "group",
    children: [
      { id: "orders", label: "orders", kind: "table", used: true },
      { id: "customers", label: "customers", kind: "table" },
      { id: "revenue", label: "revenue", kind: "metric", used: true },
    ],
  },
  {
    id: "filters",
    label: "Filters",
    kind: "group",
    children: [
      { id: "region", label: "region", kind: "dimension" },
      { id: "quarter", label: "quarter", kind: "dimension", used: true },
    ],
  },
];

export const CustomRenderItem: Story = {
  name: "Custom renderItem",
  render: () => (
    <div style={{ ...treeBorder, maxWidth: 360 }}>
      <Tree
        aria-label="Fields"
        items={typedItems}
        getId={getId}
        getLabel={getLabel}
        getChildren={getChildren}
        renderItem={renderTypedItem}
        selectionMode="single"
        defaultExpanded={["datasets", "filters"]}
      />
    </div>
  ),
};

const GROUPS = 100;
const CHILDREN_PER_GROUP = 99;

const bigItems: TreeNode[] = Array.from({ length: GROUPS }, (_, group) => ({
  id: `group-${group}`,
  label: `Group ${group}`,
  kind: "group",
  children: Array.from({ length: CHILDREN_PER_GROUP }, (_, child) => ({
    id: `group-${group}-item-${child}`,
    label: `Item ${group}.${child}`,
    kind: "field",
    used: child % 7 === 0,
  })),
}));

const bigExpanded: ReadonlySet<string> = new Set(bigItems.map((group) => group.id));

export const Virtualized10k: Story = {
  name: "Virtualized, 10,000 rows",
  render: () => (
    <Tree
      aria-label="Ten thousand rows"
      items={bigItems}
      getId={getId}
      getLabel={getLabel}
      getChildren={getChildren}
      renderItem={renderTypedItem}
      selectionMode="single"
      defaultExpanded={bigExpanded}
      virtualized
      rowHeight={ROW_HEIGHT}
      style={{ ...treeBorder, height: 400, maxWidth: 360 }}
    />
  ),
};

function findNode(nodes: readonly TreeNode[], id: string): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = node.children && findNode(node.children, id);
    if (found !== undefined) return found;
  }
  return undefined;
}

function subtreeHas(node: TreeNode, id: string): boolean {
  return node.id === id || (node.children?.some((child) => subtreeHas(child, id)) ?? false);
}

function withoutNode(nodes: readonly TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => (node.children ? { ...node, children: withoutNode(node.children, id) } : node));
}

function withChild(nodes: readonly TreeNode[], parentId: string, child: TreeNode): TreeNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) return { ...node, children: [...(node.children ?? []), child] };
    return node.children ? { ...node, children: withChild(node.children, parentId, child) } : node;
  });
}

/** Whether `dragId` may move into `folderId`: not onto itself, and not into its own subtree. */
function canMoveInto(items: readonly TreeNode[], dragId: string, folderId: string): boolean {
  const dragged = findNode(items, dragId);
  return dragged !== undefined && !subtreeHas(dragged, folderId);
}

function moveInto(items: readonly TreeNode[], dragId: string, folderId: string): TreeNode[] {
  const dragged = findNode(items, dragId);
  if (dragged === undefined || !canMoveInto(items, dragId, folderId)) return [...items];
  return withChild(withoutNode(items, dragId), folderId, dragged);
}

const dropHighlight: CSSProperties = {
  backgroundColor: "var(--vpg-accent-wash)",
  outline: "2px dashed var(--vpg-accent)",
  outlineOffset: -2,
};

// The tree ships no drag-and-drop behaviour. Rows are native HTML5 drag sources through
// `getItemProps({ draggable: true, ... })`; folders and a separate panel are the drop targets,
// and the tree's controlled `expanded` opens a folder a node is dropped into.
function DragAndDropDemo() {
  const [items, setItems] = useState<TreeNode[]>(files);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set(["src"]));
  const [dragId, setDragId] = useState<string>();
  const [overId, setOverId] = useState<string>();
  const [panelOver, setPanelOver] = useState(false);
  const [dropped, setDropped] = useState<string[]>([]);

  const endDrag = () => {
    setDragId(undefined);
    setOverId(undefined);
    setPanelOver(false);
  };

  const droppedLabels = dropped.map((id) => findNode(items, id)?.label ?? id);

  function renderItem(node: TreeNode, state: TreeItemState) {
    const isTarget = state.hasChildren && dragId !== undefined && canMoveInto(items, dragId, node.id);
    return (
      <div
        {...state.getItemProps({
          draggable: true,
          style: overId === node.id ? dropHighlight : undefined,
          onDragStart: (event: DragEvent<HTMLElement>) => {
            event.dataTransfer.setData("text/plain", node.id);
            event.dataTransfer.effectAllowed = "copyMove";
            setDragId(node.id);
          },
          onDragEnd: endDrag,
          onDragOver: (event: DragEvent<HTMLElement>) => {
            if (!isTarget) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setOverId(node.id);
          },
          onDragLeave: (event: DragEvent<HTMLElement>) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverId(undefined);
          },
          onDrop: (event: DragEvent<HTMLElement>) => {
            if (!isTarget) return;
            event.preventDefault();
            setItems(moveInto(items, event.dataTransfer.getData("text/plain"), node.id));
            setExpanded(new Set([...expanded, node.id]));
            endDrag();
          },
        })}
      >
        <Chevron state={state} />
        {node.label}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "var(--vpg-space-4)", alignItems: "flex-start" }}>
      <div style={{ ...treeBorder, width: 280 }}>
        <Tree
          aria-label="Draggable files"
          items={items}
          getId={getId}
          getLabel={getLabel}
          getChildren={getChildren}
          renderItem={renderItem}
          expanded={expanded}
          onExpandedChange={setExpanded}
        />
      </div>
      <fieldset
        aria-label="Drop zone"
        style={{ ...treeBorder, width: 240, minHeight: 120, margin: 0, minInlineSize: 0, ...(panelOver ? dropHighlight : undefined) }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setPanelOver(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPanelOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          const id = event.dataTransfer.getData("text/plain");
          if (id !== "") setDropped((current) => (current.includes(id) ? current : [...current, id]));
          endDrag();
        }}
      >
        <Typography variant="body-md">Drop a row here, or onto a folder to move it.</Typography>
        <ul>
          {droppedLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </fieldset>
    </div>
  );
}

export const DragAndDrop: Story = {
  name: "Drag and drop",
  render: () => <DragAndDropDemo />,
};
