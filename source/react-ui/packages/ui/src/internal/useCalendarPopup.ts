import { LocalDate } from "@vipengele/ts";
import { type RefObject, useLayoutEffect, useRef, useState } from "react";
import { useControllableState } from "./useControllableState.js";

/**
 * The month the calendar opens on: the committed date's, else today's. A today outside
 * `min`..`max` gives way to the bound it lies past, so a field whose every acceptable date lies in
 * the past or the future opens on the nearest month that holds one.
 */
export function openingMonth(
  committed: LocalDate | undefined,
  today: LocalDate,
  min: LocalDate | undefined,
  max: LocalDate | undefined,
): LocalDate {
  if (committed !== undefined) return committed;
  if (min !== undefined && LocalDate.compare(today, min) < 0) return min;
  if (max !== undefined && LocalDate.compare(today, max) > 0) return max;
  return today;
}

/**
 * The month the open calendar shows: `opening()` each time the pop-up opens, then wherever the
 * user navigates while it stays open. The reset happens on the render that first sees the pop-up
 * open, so the calendar mounts on that month rather than showing the last one for a frame.
 */
export function usePanelMonth(isOpen: boolean, opening: () => LocalDate): [LocalDate, (month: LocalDate) => void] {
  const [wasOpen, setWasOpen] = useState(false);
  const [month, setMonth] = useState(opening);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setMonth(opening());
  }
  return [month, setMonth];
}

export interface CalendarPopupOptions {
  open: boolean | undefined;
  defaultOpen: boolean | undefined;
  onOpenChange: ((open: boolean) => void) | undefined;
  /** Whether the field takes edits. A disabled or read-only field shows no pop-up and requests no
   * opening. */
  editable: boolean;
  /** The month a fresh opening shows. */
  opening: () => LocalDate;
}

export interface CalendarPopup {
  isOpen: boolean;
  month: LocalDate;
  setMonth: (month: LocalDate) => void;
  buttonRef: RefObject<HTMLButtonElement | null>;
  /** The field's whole box, which the `Popover` positions the calendar below. */
  fieldRef: RefObject<HTMLDivElement | null>;
  /** Where focus goes when the pop-up closes: the calendar button, unless `closeOnto` names
   * another element for this one closing. */
  returnFocus: RefObject<HTMLElement | null>;
  /** Asks for the pop-up open or closed, the way the `Popover` around the button does. */
  request: (open: boolean) => void;
  /** Closes the pop-up and returns focus to `target` rather than to the calendar button. */
  closeOnto: (target: HTMLElement | null) => void;
}

/**
 * The calendar pop-up's open state, controlled or not, the month it shows and where focus lands
 * when it closes. The return target is read by the `Popover` as the panel closes, so `closeOnto`
 * re-aims it just before asking for the close, and every opening aims it back at the button —
 * `Escape` and an outside press return there.
 */
export function useCalendarPopup({ open, defaultOpen, onOpenChange, editable, opening }: CalendarPopupOptions): CalendarPopup {
  const [requested, setRequested] = useControllableState(open, () => defaultOpen ?? false, onOpenChange);
  const isOpen = requested && editable;
  const [month, setMonth] = usePanelMonth(isOpen, opening);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (isOpen) returnFocus.current = buttonRef.current;
  }, [isOpen]);

  const request = (next: boolean) => {
    if (editable || !next) setRequested(next);
  };

  const closeOnto = (target: HTMLElement | null) => {
    returnFocus.current = target;
    request(false);
  };

  return { isOpen, month, setMonth, buttonRef, fieldRef, returnFocus, request, closeOnto };
}
