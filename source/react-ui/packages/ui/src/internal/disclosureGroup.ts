import { createContext, useContext } from "react";

/** The heading levels an accordion's item headers render as; `h1` belongs to the page. */
export type AccordionHeadingLevel = 2 | 3 | 4 | 5 | 6;

/**
 * What an accordion hands the disclosures it contains. The group owns which values are open and
 * what a toggle does to them, so a single-open accordion and a multi-open one differ only in
 * their `toggle`.
 */
export type DisclosureGroup = {
  /** Whether the disclosure with this `value` is open. */
  isOpen(value: string): boolean;
  /**
   * Asks the group to flip the disclosure with this `value`. A disclosure calls its own
   * `onOpenChange(next)` first, then this.
   */
  toggle(value: string): void;
  /** The heading level each disclosure's header renders as. */
  headingLevel: AccordionHeadingLevel;
};

/** `null` outside an accordion, where a disclosure runs on its own props. */
export const DisclosureGroupContext = createContext<DisclosureGroup | null>(null);

/** The enclosing accordion's group, or `null` when the disclosure stands alone. Never throws. */
export function useDisclosureGroup(): DisclosureGroup | null {
  return useContext(DisclosureGroupContext);
}
