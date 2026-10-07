import { ChevronDown } from "@vipengele/react-icons";
import { type HTMLAttributes, type ReactNode, type Ref, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DisclosureGroupContext, useDisclosureGroup } from "../internal/disclosureGroup.js";
import { disclosureStylesheet } from "./Disclosure.stylesheet.js";

export interface DisclosureProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The trigger button's content, and through `aria-labelledby` the panel's accessible name. */
  label: ReactNode;
  /** Identifies this disclosure to an enclosing `Accordion`. Defaults to a generated id. */
  value?: string;
  /** Disables the trigger button, so the panel stays as it is. */
  disabled?: boolean;
  /** Whether the panel is open. Setting it makes the disclosure controlled; ignored inside an `Accordion`. */
  open?: boolean;
  /** The initial open state when uncontrolled. Ignored inside an `Accordion`. */
  defaultOpen?: boolean;
  /** Called with the requested open state on every toggle, in every mode. */
  onOpenChange?: (open: boolean) => void;
  /** A ref to the root element. */
  ref?: Ref<HTMLDivElement>;
  children?: ReactNode;
}

/**
 * A trigger button that shows and hides one panel. Standalone it owns `open` / `defaultOpen` /
 * `onOpenChange`; inside an `Accordion` it takes its open state from the group, keyed by `value`,
 * and wraps its trigger in a heading at the group's level. Its own `onOpenChange` fires in both.
 *
 * A closed panel carries `hidden="until-found"`, so find-in-page can reach its content: the
 * browser fires `beforematch` on it, which requests opening exactly as a click would. Engines
 * without `until-found` treat it as plain `hidden`.
 */
export function Disclosure({
  label,
  value,
  disabled = false,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  children,
  ref,
  ...rest
}: DisclosureProps) {
  const group = useDisclosureGroup();
  const baseId = useId();
  const resolvedValue = value ?? baseId;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = group ? group.isOpen(resolvedValue) : (open ?? uncontrolledOpen);
  // Bumped by every `beforematch`. The browser removes `hidden` itself after the event, so an
  // owner that declines to open re-renders with an unchanged `isOpen`, which alone would never
  // re-run the effect below to put `hidden` back.
  const [revealAttempts, setRevealAttempts] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const triggerId = `${baseId}-trigger`;
  const panelId = `${baseId}-panel`;

  const requestOpenChange = (next: boolean) => {
    onOpenChange?.(next);
    if (group) {
      group.toggle(resolvedValue);
    } else if (open === undefined) {
      setUncontrolledOpen(next);
    }
  };

  // `hidden="until-found"` is written by hand: React's typings accept only a boolean `hidden`.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `revealAttempts` is a dependency only so that a `beforematch` the owner declines re-applies `hidden`
  useLayoutEffect(() => {
    // The panel is always rendered, so the ref is set by the time any effect runs.
    const panel = panelRef.current as HTMLDivElement;
    if (isOpen) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "until-found");
    }
  }, [isOpen, revealAttempts]);

  // A disabled disclosure keeps its panel as it is, so a match requests nothing; it still counts
  // as an attempt so `hidden` is re-applied after the browser strips it.
  const handleBeforeMatch = () => {
    if (!disabled) {
      requestOpenChange(true);
    }
    setRevealAttempts((count) => count + 1);
  };
  // The listener below is attached once and calls through this ref. A layout effect refreshes it
  // in the commit itself, before the browser can fire `beforematch`, so a match always requests
  // through the current props and group.
  const beforeMatchRef = useRef(handleBeforeMatch);
  useLayoutEffect(() => {
    beforeMatchRef.current = handleBeforeMatch;
  });

  // React has no `onBeforeMatch` prop, so the listener is attached by hand.
  useEffect(() => {
    const panel = panelRef.current as HTMLDivElement;
    const listener = () => beforeMatchRef.current();
    panel.addEventListener("beforematch", listener);
    return () => panel.removeEventListener("beforematch", listener);
  }, []);

  const classes = ["vpg-disclosure", isOpen ? "vpg-disclosure-open" : "", className].filter(Boolean).join(" ");

  const trigger = (
    <button
      type="button"
      id={triggerId}
      className="vpg-disclosure-trigger"
      aria-expanded={isOpen}
      aria-controls={panelId}
      disabled={disabled}
      onClick={() => requestOpenChange(!isOpen)}
    >
      {label}
      <ChevronDown className="vpg-disclosure-chevron" aria-hidden="true" />
    </button>
  );

  const Heading = group ? (`h${group.headingLevel}` as const) : null;

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N disclosures on a page inject one
        stylesheet.
      */}
      <style href="vpg-disclosure" precedence="vpg-disclosure">
        {disclosureStylesheet}
      </style>
      <div {...rest} ref={ref} className={classes}>
        {Heading ? <Heading className="vpg-disclosure-heading">{trigger}</Heading> : trigger}
        {/* biome-ignore lint/a11y/useSemanticElements: a <section> maps to the region role only when an engine resolves its accessible name; the explicit role keeps the panel a region regardless */}
        <div ref={panelRef} id={panelId} className="vpg-disclosure-panel" role="region" aria-labelledby={triggerId}>
          <div className="vpg-disclosure-content">
            {/* An accordion's group reaches only its own items: a disclosure in this panel stands alone. */}
            <DisclosureGroupContext.Provider value={null}>{children}</DisclosureGroupContext.Provider>
          </div>
        </div>
      </div>
    </>
  );
}
