import { type Ref, type RefObject, useLayoutEffect } from "react";

/**
 * Forwards the node in `ownRef` to a caller's `ref`, a function, an object, or absent, so a
 * component keeps a ref of its own to the same element. It is keyed on `ref`, because an inline
 * ref callback has a new identity every render, and React detaches and reattaches such a callback
 * on every commit. Keyed, the caller's ref is attached once and cleared on unmount, and a swapped
 * ref clears the old one before the new one receives the node. The element must never remount:
 * the node is read once per `ref`.
 */
export function useForwardedRef<T>(ref: Ref<T> | undefined, ownRef: RefObject<T | null>): void {
  useLayoutEffect(() => {
    if (typeof ref === "function") {
      ref(ownRef.current);
      return () => {
        ref(null);
      };
    }
    if (ref) {
      ref.current = ownRef.current;
      return () => {
        ref.current = null;
      };
    }
  }, [ref, ownRef]);
}
