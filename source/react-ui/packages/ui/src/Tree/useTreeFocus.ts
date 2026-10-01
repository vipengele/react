import { type FocusEvent, type RefObject, useLayoutEffect, useRef, useState } from "react";
import type { FlatRow } from "./flatten.js";
import { anchorOf, type FocusAnchor, tabbableRow } from "./navigation.js";

interface TreeFocusOptions<T> {
  rows: readonly FlatRow<T>[];
  byId: ReadonlyMap<string, FlatRow<T>>;
  selectedId: string | null;
  onFocusChange: ((id: string) => void) | undefined;
  onFocus: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
  onBlur: ((event: FocusEvent<HTMLDivElement>) => void) | undefined;
}

export interface TreeFocus<T> {
  /** The row with `tabIndex={0}`; `undefined` only when no row is enabled. */
  tabbable: FlatRow<T> | undefined;
  /** Whether DOM focus is inside the tree element. */
  focusWithin: boolean;
  /** Each mounted row's element, by id, which DOM focus moves through. */
  elementsRef: RefObject<Map<string, HTMLElement>>;
  /** Filled with the virtualizer's scroll-to-row while a virtualized tree is mounted. */
  scrollToIndexRef: RefObject<((index: number) => void) | undefined>;
  /** Moves the focus position to a row without moving DOM focus, reporting the move. */
  moveFocusPosition: (id: string) => void;
  /** Moves the focus position and DOM focus to a row; a no-op for `undefined`. */
  focusOn: (row: FlatRow<T> | undefined) => void;
  /** The tree element's focus handlers, which track `focusWithin`. */
  handleFocus: (event: FocusEvent<HTMLDivElement>) => void;
  handleBlur: (event: FocusEvent<HTMLDivElement>) => void;
}

/**
 * The tree's roving focus position: which row is tabbable, moving DOM focus to a row (scrolling
 * a windowed row into view first), and recovering the position when its row leaves the model
 * or becomes disabled.
 */
export function useTreeFocus<T>({ rows, byId, selectedId, onFocusChange, onFocus, onBlur }: TreeFocusOptions<T>): TreeFocus<T> {
  /** The row the user last moved the focus position to; `undefined` until they do. */
  const [focusId, setFocusId] = useState<string | undefined>(undefined);
  const [focusWithin, setFocusWithin] = useState(false);
  const anchorRef = useRef<FocusAnchor | undefined>(undefined);
  /** The tabbable row's id as of the last commit, which `onFocusChange` reports changes from. */
  const tabbableRef = useRef<string | undefined>(undefined);
  const elementsRef = useRef(new Map<string, HTMLElement>());
  const scrollToIndexRef = useRef<((index: number) => void) | undefined>(undefined);
  /** A row DOM focus is headed for that was not mounted when the move was asked for. */
  const pendingFocusRef = useRef<string | undefined>(undefined);

  const tabbable = tabbableRow(rows, byId, focusId, selectedId, anchorRef.current);
  const tabbableId = tabbable?.id;

  // A row `focusElement` could not reach is the tabbable row by this commit, which the
  // virtualizer's range always mounts, so this is the commit that can focus it. It is attempted
  // once: a row whose `renderItem` never took the ref is never focused.
  useLayoutEffect(() => {
    const id = pendingFocusRef.current;
    if (id === undefined) return;
    pendingFocusRef.current = undefined;
    elementsRef.current.get(id)?.focus();
  });

  function moveFocusPosition(id: string) {
    setFocusId(id);
    if (id !== tabbableRef.current) {
      tabbableRef.current = id;
      onFocusChange?.(id);
    }
  }

  useLayoutEffect(() => {
    if (tabbable !== undefined) anchorRef.current = anchorOf(tabbable, byId);
    if (focusId === undefined || focusId === tabbableId) {
      tabbableRef.current = tabbableId;
      return;
    }
    // The focus position's row left the model or became disabled. DOM focus follows it to its
    // replacement only if it was inside the tree, so a background data update never takes
    // focus from elsewhere on the page.
    if (tabbableId === undefined) {
      setFocusId(undefined);
      setFocusWithin(false);
      tabbableRef.current = undefined;
      return;
    }
    moveFocusPosition(tabbableId);
    if (focusWithin) focusElement(tabbable as FlatRow<T>);
  });

  /**
   * Moves DOM focus to a row, scrolling it into the window first when the tree is virtualized.
   * A windowed row may not be mounted yet; the pending-focus layout effect focuses it on the
   * next commit instead.
   */
  function focusElement(row: FlatRow<T>) {
    scrollToIndexRef.current?.(row.index);
    const element = elementsRef.current.get(row.id);
    if (element !== undefined) element.focus();
    else pendingFocusRef.current = row.id;
  }

  function focusOn(row: FlatRow<T> | undefined) {
    if (row === undefined) return;
    moveFocusPosition(row.id);
    focusElement(row);
  }

  function handleFocus(event: FocusEvent<HTMLDivElement>) {
    onFocus?.(event);
    setFocusWithin(true);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    onBlur?.(event);
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
  }

  return { tabbable, focusWithin, elementsRef, scrollToIndexRef, moveFocusPosition, focusOn, handleFocus, handleBlur };
}
