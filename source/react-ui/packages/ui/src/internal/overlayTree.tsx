import { FloatingNode, FloatingTree, useFloatingNodeId, useFloatingParentNodeId } from "@floating-ui/react";
import { type ReactNode, useCallback } from "react";

export interface OverlayTreeShellProps {
  /** The overlay's inner component, which calls `useOverlayTreeNode` and so has to render below
   * the tree this shell guarantees. */
  children: ReactNode;
}

/**
 * Guarantees a `FloatingTree` above its children, so every overlay registers in one tree and
 * `useDismiss` can tell the innermost open overlay from the chain around it: Escape closes only
 * the innermost, and an outside press closes the whole chain.
 *
 * An outermost overlay — no `FloatingNode` above it — renders the tree itself. An overlay opened
 * from inside another overlay's floating element renders its children directly and joins the
 * tree that overlay belongs to; a second tree there would make it a root of its own, invisible to
 * the parent's dismissal checks, and Escape would close both. The tree follows the React
 * component tree, so a portal between parent and child does not break the chain.
 *
 * A wrapper component rather than a hook: a hook cannot render a provider above the component
 * that calls it, and `useOverlayTreeNode` has to read the tree from context.
 */
export function OverlayTreeShell({ children }: OverlayTreeShellProps) {
  const parentNodeId = useFloatingParentNodeId();
  return parentNodeId === null ? <FloatingTree>{children}</FloatingTree> : children;
}

export interface UseOverlayTreeNodeReturn {
  /** This overlay's id in the tree. Passed to `useFloating({ nodeId })`, which attaches the
   * floating context to the node so `useDismiss` on a parent can see whether this overlay is
   * open. Typed as floating-ui types it, where `undefined` stands for a React without `useId`;
   * under the React 19 floor it is always a string. */
  nodeId: ReturnType<typeof useFloatingNodeId>;
  /** Wraps the overlay's floating element in a `FloatingNode`, which makes every overlay opened
   * from inside it register as this overlay's child. The trigger stays outside: it belongs to
   * whatever node the overlay itself sits in. */
  node: (floating: ReactNode) => ReactNode;
}

/**
 * Registers the calling overlay as a node of the enclosing `FloatingTree`, parented to the
 * nearest `FloatingNode` above it. Called by an overlay's inner component, below its
 * `OverlayTreeShell`.
 */
export function useOverlayTreeNode(): UseOverlayTreeNodeReturn {
  const nodeId = useFloatingNodeId();
  const node = useCallback((floating: ReactNode) => <FloatingNode id={nodeId}>{floating}</FloatingNode>, [nodeId]);
  return { nodeId, node };
}
