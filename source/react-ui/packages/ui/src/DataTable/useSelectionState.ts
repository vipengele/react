import { functionalUpdate } from "@tanstack/react-table";
import { type ChangeEvent, type KeyboardEvent, useMemo, useRef } from "react";
import { useControllableState } from "../internal/useControllableState.js";

/** The selection as the engine holds it: a record of the selected ids. */
export type RowSelection = Record<string, true>;

/** A next selection, or how to compute it from the current one. */
type RowSelectionUpdater = RowSelection | ((current: RowSelection) => RowSelection);

/** The selection as the engine holds it. Repeated ids collapse. */
function engineSelectionOf(selection: readonly string[]): RowSelection {
  const record: RowSelection = {};
  for (const id of selection) record[id] = true;
  return record;
}

/**
 * The selection after the engine applies `updater` to it, as ids: the ids still selected in their
 * order in `selection`, then the newly selected ones in the order of `drawnIds`, then any newly
 * selected id naming no drawn row. Each id appears once. The record's own key order is never
 * relied on for the drawn ids, since a record lists integer-like keys in ascending numeric order
 * whatever order they were added in.
 */
function nextSelection(selection: readonly string[], drawnIds: readonly string[], updater: RowSelectionUpdater): string[] {
  const next = functionalUpdate(updater, engineSelectionOf(selection));
  const kept = [...new Set(selection)].filter((id) => next[id] === true);
  const keptIds = new Set(kept);
  const candidates = new Set([...drawnIds, ...Object.keys(next)]);
  const added = [...candidates].filter((id) => next[id] === true && !keptIds.has(id));
  return [...kept, ...added];
}

/** `selection` with each of `ids` selected, or each deselected, and every other id as it was. */
function withRowsSelected(selection: RowSelection, ids: readonly string[], selected: boolean): RowSelection {
  const next: RowSelection = { ...selection };
  for (const id of ids) {
    if (selected) next[id] = true;
    else delete next[id];
  }
  return next;
}

/** Whether `ids` name exactly the rows `selection` selects. Both hold each id once. */
function selectsExactly(selection: RowSelection, ids: readonly string[]): boolean {
  return ids.length === Object.keys(selection).length && ids.every((id) => selection[id] === true);
}

interface SelectionStateOptions {
  selectedRowIds: readonly string[] | undefined;
  defaultSelectedRowIds: readonly string[] | undefined;
  onSelectionChange: ((selectedRowIds: string[]) => void) | undefined;
}

/**
 * The table's selection, controlled or not, as the engine holds it, and the handler every change
 * the engine computes comes back through, given the ids of the rows drawn. The selection leaves
 * only through `onSelectionChange`, and a change that leaves the same rows selected is not
 * reported.
 */
export function useSelectionState({ selectedRowIds, defaultSelectedRowIds, onSelectionChange }: SelectionStateOptions) {
  const [selection, setSelection] = useControllableState<readonly string[], string[]>(
    selectedRowIds,
    () => defaultSelectedRowIds ?? [],
    onSelectionChange,
  );
  const engineSelection = useMemo(() => engineSelectionOf(selection), [selection]);

  function handleSelectionChange(updater: RowSelectionUpdater, drawnIds: readonly string[]) {
    const next = nextSelection(selection, drawnIds, updater);
    if (!selectsExactly(engineSelection, next)) setSelection(next);
  }

  return { engineSelection, handleSelectionChange };
}

/** The row whose selection control was last toggled, and the state that toggle gave it. */
interface SelectionAnchor {
  id: string;
  selected: boolean;
}

/**
 * The select-all checkbox's state over the drawn rows and the handlers of the `"multiple"` mode
 * controls, which change the selection through `setRowSelection`. Select-all selects every drawn
 * row, or deselects them all once all are selected. A ranged toggle (Shift on the click, or on the
 * Space keydown behind it) gives every row from the last row toggled to the toggled one, in
 * `drawnIds` order, the state the last toggle gave; with no last row toggled among the drawn rows,
 * or on that row itself, it toggles the one row.
 */
export function useSelectionControls(
  drawnIds: readonly string[],
  engineSelection: RowSelection,
  setRowSelection: (updater: (current: RowSelection) => RowSelection) => void,
) {
  // Whether Shift was held on the Space keydown that toggles a row's checkbox, for a click that
  // does not carry the key's modifiers, as with the sort buttons.
  const selectKeyShiftRef = useRef(false);
  const anchorRef = useRef<SelectionAnchor | null>(null);
  const selectedCount = drawnIds.filter((id) => engineSelection[id] === true).length;
  const allSelected = drawnIds.length > 0 && selectedCount === drawnIds.length;

  function handleSelectKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === " ") selectKeyShiftRef.current = event.shiftKey;
  }

  function handleSelectAll() {
    anchorRef.current = null;
    setRowSelection((current) => withRowsSelected(current, drawnIds, !allSelected));
  }

  function handleRowToggle(rowId: string, displayIndex: number, event: ChangeEvent<HTMLInputElement>) {
    // A checkbox reports its change from the click that toggled it.
    const click = event.nativeEvent as globalThis.MouseEvent;
    const ranged = click.shiftKey || (click.detail === 0 && selectKeyShiftRef.current);
    selectKeyShiftRef.current = false;
    const anchor = anchorRef.current;
    const anchorIndex = anchor === null || anchor.id === rowId ? -1 : drawnIds.indexOf(anchor.id);
    if (ranged && anchor !== null && anchorIndex !== -1) {
      const ids = drawnIds.slice(Math.min(anchorIndex, displayIndex), Math.max(anchorIndex, displayIndex) + 1);
      anchorRef.current = { id: rowId, selected: anchor.selected };
      setRowSelection((current) => withRowsSelected(current, ids, anchor.selected));
      return;
    }
    const selected = event.currentTarget.checked;
    anchorRef.current = { id: rowId, selected };
    setRowSelection((current) => withRowsSelected(current, [rowId], selected));
  }

  return { selectedCount, allSelected, handleSelectKeyDown, handleSelectAll, handleRowToggle };
}
