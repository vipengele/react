import { type HTMLAttributes, type ReactNode, type Ref, useMemo, useState } from "react";
import { type AccordionHeadingLevel, type DisclosureGroup, DisclosureGroupContext } from "../internal/disclosureGroup.js";
import { accordionStylesheet } from "./Accordion.stylesheet.js";

export type { AccordionHeadingLevel } from "../internal/disclosureGroup.js";

interface AccordionBaseProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange" | "children"> {
  /** The heading level each item's header renders as. Defaults to `3`. */
  headingLevel?: AccordionHeadingLevel;
  /** A ref to the root element. */
  ref?: Ref<HTMLDivElement>;
  /** The `Disclosure`s this accordion groups, each identified by its `value`. */
  children?: ReactNode;
}

export interface AccordionSingleProps extends AccordionBaseProps {
  multiple?: false;
  /** Makes the open item controlled; pair it with `onChange`. `null` opens nothing. */
  value?: string | null;
  /** The initially open item when uncontrolled. Left out, every item starts closed. */
  defaultValue?: string | null;
  /** Called with the requested open item on every toggle, or `null` when the open one closes. */
  onChange?: (value: string | null) => void;
}

export interface AccordionMultipleProps extends AccordionBaseProps {
  multiple: true;
  /** Makes the open items controlled; pair it with `onChange`. Never mutated. */
  value?: ReadonlySet<string>;
  /** The initially open items when uncontrolled. Left out, every item starts closed. */
  defaultValue?: ReadonlySet<string>;
  /** Called on every toggle with a fresh set of the requested open items. */
  onChange?: (value: ReadonlySet<string>) => void;
}

export type AccordionProps = AccordionSingleProps | AccordionMultipleProps;

const NONE: ReadonlySet<string> = new Set();

/** Either mode's value as the set of open items: a single value is a set of at most one. */
function toOpenSet(value: string | null | ReadonlySet<string> | undefined): ReadonlySet<string> {
  if (typeof value === "string") {
    return new Set([value]);
  }
  return value ?? NONE;
}

/**
 * A group of `Disclosure`s, each identified by its `value`, that decides which of them are open.
 * By default at most one is open: opening an item closes the one that was, and toggling the open
 * item closes it, leaving none. With `multiple`, items open and close independently.
 *
 * The open state is controlled through `value`/`onChange` or left to the accordion itself, seeded
 * by `defaultValue`. Inside an accordion a `Disclosure`'s own `open`/`defaultOpen` are ignored,
 * its `onOpenChange` still fires, and its trigger sits in a heading at `headingLevel`. Each
 * trigger is its own tab stop; the accordion adds no arrow-key navigation.
 */
export function Accordion(props: AccordionProps) {
  const { multiple, value, defaultValue, onChange, headingLevel = 3, className, children, ref, ...rest } = props;
  const isMultiple = multiple === true;
  const controlled = value !== undefined;
  // The state is a copy: seeding it with the caller's own `defaultValue` set would let their later
  // mutations change the open items with no render and no `onChange`.
  const [uncontrolledOpen, setUncontrolledOpen] = useState<ReadonlySet<string>>(() => new Set(toOpenSet(defaultValue)));
  const open = useMemo(() => (controlled ? toOpenSet(value) : uncontrolledOpen), [controlled, value, uncontrolledOpen]);

  const group = useMemo<DisclosureGroup>(
    () => ({
      isOpen: (item) => open.has(item),
      toggle(item) {
        let nextOpen: ReadonlySet<string>;
        let reported: string | null | ReadonlySet<string>;
        if (isMultiple) {
          const next = new Set(open);
          if (next.has(item)) {
            next.delete(item);
          } else {
            next.add(item);
          }
          nextOpen = next;
          reported = new Set(next);
        } else {
          reported = open.has(item) ? null : item;
          nextOpen = toOpenSet(reported);
        }
        if (!controlled) {
          setUncontrolledOpen(nextOpen);
        }
        (onChange as ((next: string | null | ReadonlySet<string>) => void) | undefined)?.(reported);
      },
      headingLevel,
    }),
    [open, isMultiple, controlled, onChange, headingLevel],
  );

  const classes = ["vpg-accordion", className].filter(Boolean).join(" ");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N accordions on a page inject one
        stylesheet.
      */}
      <style href="vpg-accordion" precedence="vpg-accordion">
        {accordionStylesheet}
      </style>
      <DisclosureGroupContext.Provider value={group}>
        <div {...rest} ref={ref} className={classes}>
          {children}
        </div>
      </DisclosureGroupContext.Provider>
    </>
  );
}
