import type { ChangeEvent, KeyboardEvent } from "react";
import { Checkbox } from "../Checkbox/Checkbox.js";
import { RadioButton } from "../RadioButton/RadioButton.js";

export interface DataTableSelectionControlProps {
  selectionMode: "single" | "multiple";
  label: string;
  checked: boolean;
  /** The name every radio button of a `"single"` mode table shares. */
  radioName: string;
  /** Handles a `"multiple"` mode checkbox's keydown. */
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

/** A row's selection control: a checkbox in `"multiple"` mode, a radio button in `"single"` mode. */
export function DataTableSelectionControl({
  selectionMode,
  label,
  checked,
  radioName,
  onKeyDown,
  onChange,
}: DataTableSelectionControlProps) {
  if (selectionMode === "multiple") {
    return <Checkbox aria-label={label} checked={checked} onKeyDown={onKeyDown} onChange={onChange} />;
  }
  return <RadioButton name={radioName} aria-label={label} checked={checked} onChange={onChange} />;
}
