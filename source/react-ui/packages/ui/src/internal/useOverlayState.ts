import { useDismiss, useFloating } from "@floating-ui/react";
import { type ReactNode, useState } from "react";
import { useOverlayTreeNode } from "./overlayTree.js";

export interface UseOverlayStateOptions {
  /** Controls the overlay. Supplying it hands the state to the caller: the overlay then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired with `false` for every close request, in both the controlled and the uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
}

export interface UseOverlayStateReturn {
  /** Whether the overlay is open: `open` when supplied, the internal state otherwise. */
  isOpen: boolean;
  /** Requests a close. The overlay closes only if the state then says so, so a controlled parent
   * that keeps `open` true vetoes it. */
  requestClose: () => void;
  /** Wraps the overlay's floating element in its overlay-tree node. */
  node: (floating: ReactNode) => ReactNode;
}

/**
 * The open state and dismissal every overlay shares: controlled or uncontrolled state, close
 * requests a controlled parent can veto, and registration as a node of the overlay tree, through
 * which `useDismiss` owns `Escape` so it closes only the innermost open overlay. Called below an
 * `OverlayTreeShell`.
 */
export function useOverlayState({ open, defaultOpen = false, onOpenChange }: UseOverlayStateOptions): UseOverlayStateReturn {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  const { nodeId, node } = useOverlayTreeNode();

  const requestClose = () => {
    // The internal state is kept only while `open` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `open` is later withdrawn.
    if (open === undefined) {
      setUncontrolledOpen(false);
    }
    onOpenChange?.(false);
  };

  // `useDismiss` owns `Escape` because it alone can tell whether an overlay opened from inside
  // this one is still open, and leaves this overlay be until that one has closed. It only ever
  // requests a close, so `requestClose` is its `onOpenChange`.
  const { context } = useFloating({ nodeId, open: isOpen, onOpenChange: requestClose });
  useDismiss(context, { outsidePress: false });

  return { isOpen, requestClose, node };
}
