import { FloatingTree, useDismiss, useFloating, useFloatingParentNodeId, useFloatingTree, useInteractions } from "@floating-ui/react";
import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactNode, useState } from "react";
import { describe, expect, it } from "vitest";
import { OverlayTreeShell, useOverlayTreeNode } from "./overlayTree.js";

type Tree = ReturnType<typeof useFloatingTree>;

/** Records the tree and the parent node id visible at the point it renders. */
function Probe({ onRead }: { onRead: (read: { tree: Tree; parentNodeId: string | null }) => void }) {
  onRead({ tree: useFloatingTree(), parentNodeId: useFloatingParentNodeId() });
  return null;
}

/** An overlay built the way every overlay in the package is: an outer shell around an inner
 * component that registers a node, passes its id to `useFloating` and wraps its floating element
 * in that node. Starts open. */
function TestOverlay({ label, children }: { label: string; children?: ReactNode }) {
  return (
    <OverlayTreeShell>
      <TestOverlayInner label={label}>{children}</TestOverlayInner>
    </OverlayTreeShell>
  );
}

function TestOverlayInner({ label, children }: { label: string; children?: ReactNode }) {
  const [open, setOpen] = useState(true);
  const { nodeId, node } = useOverlayTreeNode();
  const { refs, context } = useFloating({ open, onOpenChange: setOpen, nodeId });
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context)]);
  return (
    <>
      <button type="button" ref={refs.setReference} {...getReferenceProps()}>
        {label}
      </button>
      {open
        ? node(
            <div ref={refs.setFloating} data-testid={label} {...getFloatingProps()}>
              {children}
            </div>,
          )
        : null}
    </>
  );
}

describe("OverlayTreeShell", () => {
  it("renders a FloatingTree around its children when no overlay encloses it", () => {
    let read: { tree: Tree; parentNodeId: string | null } | undefined;
    render(
      <OverlayTreeShell>
        <Probe onRead={(value) => (read = value)} />
      </OverlayTreeShell>,
    );
    expect(read?.tree).not.toBeNull();
    expect(read?.parentNodeId).toBeNull();
  });

  it("joins the enclosing overlay's tree rather than rendering a second one", () => {
    let outer: { tree: Tree; parentNodeId: string | null } | undefined;
    let inner: { tree: Tree; parentNodeId: string | null } | undefined;
    function Parent({ children }: { children: ReactNode }) {
      const { node } = useOverlayTreeNode();
      return node(
        <>
          <Probe onRead={(value) => (outer = value)} />
          {children}
        </>,
      );
    }
    render(
      <FloatingTree>
        <Parent>
          <OverlayTreeShell>
            <Probe onRead={(value) => (inner = value)} />
          </OverlayTreeShell>
        </Parent>
      </FloatingTree>,
    );
    expect(inner?.tree).not.toBeNull();
    expect(inner?.tree).toBe(outer?.tree);
    expect(inner?.parentNodeId).not.toBeNull();
    expect(inner?.parentNodeId).toBe(outer?.parentNodeId);
  });
});

describe("useOverlayTreeNode", () => {
  it("registers a node parented to the enclosing node, and makes itself the parent of its floating subtree", () => {
    let tree: Tree = null;
    let outerId: string | undefined;
    let innerId: string | undefined;
    let readInside: string | null = null;
    function Outer({ children }: { children: ReactNode }) {
      const { nodeId, node } = useOverlayTreeNode();
      outerId = nodeId;
      tree = useFloatingTree();
      return node(children);
    }
    function Inner() {
      const { nodeId, node } = useOverlayTreeNode();
      innerId = nodeId;
      return node(<Probe onRead={(value) => (readInside = value.parentNodeId)} />);
    }
    render(
      <OverlayTreeShell>
        <Outer>
          <OverlayTreeShell>
            <Inner />
          </OverlayTreeShell>
        </Outer>
      </OverlayTreeShell>,
    );
    const nodes = (tree as Tree)?.nodesRef.current;
    expect(nodes).toContainEqual(expect.objectContaining({ id: outerId, parentId: null }));
    expect(nodes).toContainEqual(expect.objectContaining({ id: innerId, parentId: outerId }));
    expect(readInside).toBe(innerId);
  });
});

describe("dismissal through the tree", () => {
  function renderNested() {
    render(
      <TestOverlay label="outer">
        <TestOverlay label="inner" />
      </TestOverlay>,
    );
  }

  it("closes only the innermost open overlay on Escape", () => {
    renderNested();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("inner")).toBeNull();
    expect(screen.getByTestId("outer")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByTestId("outer")).toBeNull();
  });

  it("closes the whole chain on a press outside every overlay", () => {
    renderNested();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByTestId("inner")).toBeNull();
    expect(screen.queryByTestId("outer")).toBeNull();
  });

  it("keeps the chain open on a press inside the innermost overlay", () => {
    renderNested();
    fireEvent.pointerDown(screen.getByTestId("inner"));
    expect(screen.getByTestId("inner")).toBeInTheDocument();
    expect(screen.getByTestId("outer")).toBeInTheDocument();
  });
});
