import {
  Children,
  createContext,
  type HTMLAttributes,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useState,
} from "react";
import { tabsStylesheet } from "./Tabs.stylesheet.js";

export type TabsOrientation = "horizontal" | "vertical";

interface TabsContextValue {
  activeValue: string | undefined;
  /** The value whose `Tabs.Tab` gets `tabIndex={0}` — `activeValue`, unless that tab is disabled. */
  tabStopValue: string | undefined;
  activate: (value: string) => void;
  orientation: TabsOrientation;
  baseId: string;
}

/** The one piece of React context in this package: `Tabs.List`/`Tabs.Tab`/`Tabs.Panel` are
 * arranged by the consumer, so the active value, the orientation and the id pairing can't reach
 * them as props. */
const TabsContext = createContext<TabsContextValue | null>(null);

/** The traversal set: tabs a keyboard user can reach, in DOM order. */
// biome-ignore lint/security/noSecrets: a CSS selector, read as a high-entropy string
const ENABLED_TAB_SELECTOR = '[role="tab"]:not([disabled])';

function useTabsContext(component: string): TabsContextValue {
  const context = useContext(TabsContext);
  if (context === null) {
    throw new Error(`${component} must be rendered inside <Tabs>.`);
  }
  return context;
}

function tabId(baseId: string, value: string): string {
  return `${baseId}-tab-${value}`;
}

function panelId(baseId: string, value: string): string {
  return `${baseId}-panel-${value}`;
}

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

function TabsList({ className, children, onKeyDown, ...rest }: TabsListProps) {
  const { orientation, activate } = useTabsContext("Tabs.List");

  const classes = ["tandiko-tabs-list", `tandiko-tabs-list-${orientation}`, className]
    .filter(Boolean)
    .join(" ");

  /**
   * Arrow keys move focus and activate in one step (automatic activation), wrapping at both ends.
   * Only the pair matching `orientation` is handled — the off-axis pair is left alone so it keeps
   * whatever meaning the surrounding page gives it. Disabled tabs are excluded from the traversal
   * set outright, so every move lands on a tab that can take focus.
   */
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);

    const [previousKey, nextKey] =
      orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : ["ArrowLeft", "ArrowRight"];

    const tabs = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(ENABLED_TAB_SELECTOR),
    );
    const current = tabs.indexOf(event.target as HTMLButtonElement);

    let next: number;
    if (event.key === nextKey) {
      next = (current + 1) % tabs.length;
    } else if (event.key === previousKey) {
      next = (current - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    // Every index above is taken modulo `tabs.length`, so it names an element of `tabs`, and
    // `Tabs.Tab` always renders `data-value`.
    const target = tabs[next] as HTMLButtonElement;
    target.focus();
    activate(target.dataset.value as string);
  }

  return (
    <div {...rest} role="tablist" aria-orientation={orientation} className={classes} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
}

export interface TabsTabProps extends Omit<HTMLAttributes<HTMLButtonElement>, "children"> {
  /** Pairs this tab with the `Tabs.Panel` carrying the same `value`. */
  value: string;
  /** Skipped entirely by arrow-key and `Home`/`End` traversal, and not clickable. */
  disabled?: boolean;
  children?: ReactNode;
}

function TabsTab({ value, disabled = false, className, children, onClick, ...rest }: TabsTabProps) {
  const { activeValue, tabStopValue, activate, baseId } = useTabsContext("Tabs.Tab");
  const selected = activeValue === value;

  const classes = ["tandiko-tabs-tab", selected ? "tandiko-tabs-tab-selected" : "", className]
    .filter(Boolean)
    .join(" ");

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    activate(value);
  }

  return (
    <button
      {...rest}
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      // Inactive panels unmount, so only the selected tab has a panel to point at: an
      // `aria-controls` naming an id that is not in the document resolves to nothing.
      aria-controls={selected ? panelId(baseId, value) : undefined}
      aria-selected={selected}
      // Roving tabindex: `tabStopValue` is the list's single tab stop (normally the selected
      // tab, falling back to the first enabled one if that tab is disabled), and every other
      // tab is reachable only by the arrow keys.
      tabIndex={tabStopValue === value ? 0 : -1}
      disabled={disabled}
      data-value={value}
      className={classes}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Pairs this panel with the `Tabs.Tab` carrying the same `value`. */
  value: string;
  children?: ReactNode;
}

function TabsPanel({ value, className, children, ...rest }: TabsPanelProps) {
  const { activeValue, baseId } = useTabsContext("Tabs.Panel");
  if (activeValue !== value) {
    return null;
  }

  const classes = ["tandiko-tabs-panel", className].filter(Boolean).join(" ");

  return (
    <div
      {...rest}
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the tabs pattern makes the panel the keyboard's next stop after the tablist, so a panel holding nothing focusable is still reachable
      tabIndex={0}
      className={classes}
    >
      {children}
    </div>
  );
}

export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Makes the selection controlled; pair it with `onChange`. */
  value?: string;
  /** The initially selected value when the selection is uncontrolled. Left out, the first
   * `Tabs.Tab` in `children` is selected. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** `horizontal` (the default) traverses with Left/Right, `vertical` with Up/Down. */
  orientation?: TabsOrientation;
  children?: ReactNode;
}

/**
 * The value of the first `Tabs.Tab` anywhere under `children` — the first enabled one when
 * `skipDisabled` is set. This is what an uncontrolled `Tabs` selects when given no
 * `defaultValue`: skipping disabled tabs there means the initial selection is never one a
 * keyboard user can't have reached on their own. The search walks the element tree rather than
 * only `Tabs`' direct children because tabs live inside a `Tabs.List`; a tab produced by a
 * consumer's own component rather than written as JSX is out of scope, the same limit `Card`'s
 * child inspection carries.
 */
function firstTabValue(children: ReactNode, skipDisabled = false): string | undefined {
  let found: string | undefined;

  Children.forEach(children, (child) => {
    if (found !== undefined || !isValidElement(child)) {
      return;
    }
    if (child.type === TabsTab) {
      const props = child.props as TabsTabProps;
      if (skipDisabled && props.disabled) {
        return;
      }
      found = props.value;
      return;
    }
    found = firstTabValue((child.props as { children?: ReactNode }).children, skipDisabled);
  });

  return found;
}

/** Whether the `Tabs.Tab` carrying `value` is disabled — used to keep the roving tab stop off a
 * disabled tab even when it is the selected one (a controlled `Tabs` can be pointed at a
 * disabled value; an uncontrolled one no longer picks one by default, but nothing stops a caller
 * from passing `defaultValue` explicitly). Same element-tree walk as `firstTabValue`. */
function isTabDisabled(children: ReactNode, value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }

  let disabled = false;

  Children.forEach(children, (child) => {
    if (disabled || !isValidElement(child)) {
      return;
    }
    if (child.type === TabsTab) {
      const props = child.props as TabsTabProps;
      if (props.value === value) {
        disabled = props.disabled ?? false;
      }
      return;
    }
    disabled = isTabDisabled((child.props as { children?: ReactNode }).children, value);
  });

  return disabled;
}

function TabsImpl({
  value,
  defaultValue,
  onChange,
  orientation = "horizontal",
  className,
  children,
  ...rest
}: TabsProps) {
  const baseId = useId();
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const controlled = value !== undefined;
  // Falls back to the first tab regardless of `disabled` when every tab is disabled, rather than
  // selecting nothing — a tablist always has something selected, even one no keyboard user can
  // currently reach.
  const activeValue =
    controlled ? value : (uncontrolledValue ?? firstTabValue(children, true) ?? firstTabValue(children));

  // The roving tab stop follows `activeValue` unless that tab is disabled (a controlled `Tabs`,
  // or an explicit `defaultValue`, can point at one) — a disabled selected tab would otherwise
  // be the list's only `tabIndex={0}` element, and disabled buttons refuse focus, leaving the
  // whole tablist unreachable by the Tab key.
  const tabStopValue = isTabDisabled(children, activeValue)
    ? (firstTabValue(children, true) ?? activeValue)
    : activeValue;

  const classes = ["tandiko-tabs", `tandiko-tabs-${orientation}`, className].filter(Boolean).join(" ");

  const context = useMemo<TabsContextValue>(
    () => ({
      activeValue,
      tabStopValue,
      activate(next: string) {
        if (!controlled) {
          setUncontrolledValue(next);
        }
        onChange?.(next);
      },
      orientation,
      baseId,
    }),
    [activeValue, tabStopValue, controlled, onChange, orientation, baseId],
  );

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N tab sets on a page inject one
        stylesheet.
      */}
      <style href="tandiko-tabs" precedence="tandiko-tabs">
        {tabsStylesheet}
      </style>
      <TabsContext.Provider value={context}>
        <div {...rest} className={classes}>
          {children}
        </div>
      </TabsContext.Provider>
    </>
  );
}

type TabsComponent = typeof TabsImpl & {
  List: typeof TabsList;
  Tab: typeof TabsTab;
  Panel: typeof TabsPanel;
};

/**
 * A tabbed interface: `Tabs.List` holding `Tabs.Tab`s, paired by `value` with the `Tabs.Panel`s
 * beside it. Selection is controlled through `value`/`onChange` or left to `Tabs` itself, seeded
 * by `defaultValue` or by the first tab. Only the selected panel is mounted, so a panel's own
 * state does not survive a switch away from it.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `Tabs` export (importing only `Button`, say) is tree-shaken out entirely instead of
// keeping the whole module "just in case" `Object.assign` does something observable.
export const Tabs = /* @__PURE__ */ Object.assign(TabsImpl, {
  List: TabsList,
  Tab: TabsTab,
  Panel: TabsPanel,
}) as TabsComponent;
