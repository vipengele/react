import { autoUpdate, type ElementProps, flip, shift, useDismiss, useFloating, useInteractions, useRole } from "@floating-ui/react";
import { type ReactElement, type ReactNode, useLayoutEffect, useRef, useState } from "react";
import {
  assertMenuRows,
  MenuCheckboxItem,
  type MenuCheckboxItemProps,
  MenuGroup,
  type MenuGroupProps,
  MenuItem,
  type MenuItemProps,
  MenuPanel,
  MenuRadioItem,
  type MenuRadioItemProps,
  MenuSeparator,
  useMenuPanel,
} from "../internal/menuPanel.js";
import { menuStylesheet } from "../internal/menuStylesheet.js";
import { OverlayTreeShell, useOverlayTreeNode } from "../internal/overlayTree.js";
import { useOverlayRoot } from "../internal/useOverlayRoot.js";
import { DEFAULT_LONG_PRESS_DELAY, elementAnchor, useContextMenuTriggers } from "./useContextMenuTriggers.js";

export interface ContextMenuProps {
  /** The region the menu belongs to. It is wrapped in a `<div style="display: contents">` that
   * carries the gesture handlers — never cloned, so it can be any node — and the wrapper adds no
   * box of its own, so the region lays out as if unwrapped. */
  target: ReactNode;
  /** The rows of the menu, rendered inside the `role="menu"` panel: only `ContextMenu.Item`,
   * `ContextMenu.CheckboxItem`, `ContextMenu.RadioItem`, `ContextMenu.Separator` and
   * `ContextMenu.Group`, optionally inside fragments. Any other child throws at render, naming the
   * offender. */
  children: ReactNode;
  /** Controls the menu. Supplying it hands the state to the caller: the menu then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every open/close request — each invocation on the target, an open menu's
   * included, an outside press, `Escape` — in both the controlled and the uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
  /** Composed onto the panel, not onto the target wrapper. */
  className?: string;
  /** Turns the target back into an ordinary region: no gesture opens the menu, and the browser's
   * own context menu shows instead. A long press under way when it turns on is cancelled. */
  disabled?: boolean;
  /** How long a touch has to rest on the target before it opens the menu, in milliseconds. */
  longPressDelay?: number;
}

/** Minimum gap kept between the panel and the viewport edge when it has to shift, in pixels. */
const VIEWPORT_PADDING = 12;

/** The wrapper adds no box, so the target lays out as if unwrapped. Suppressing the touch callout
 * keeps iOS from raising its own link and image sheet over the menu a long press opens; the
 * property inherits, so the wrapper reaches every element of the target through it. */
const WRAPPER_STYLE = { display: "contents", WebkitTouchCallout: "none" } as const;

/** With `disabled`, the target is left to the browser, iOS callout included. */
const DISABLED_WRAPPER_STYLE = { display: "contents" } as const;

/** The panel's own `contextmenu` never reaches the browser: a native menu would open over the
 * custom one. */
const panelProps: ElementProps = {
  floating: {
    onContextMenu(event) {
      event.preventDefault();
    },
  },
};

function ContextMenuRoot(props: ContextMenuProps) {
  assertMenuRows(props.children, "ContextMenu", true);
  return (
    <OverlayTreeShell>
      <ContextMenuInner {...props} />
    </OverlayTreeShell>
  );
}

function ContextMenuInner({
  target,
  children,
  open,
  defaultOpen = false,
  onOpenChange,
  className,
  disabled = false,
  longPressDelay = DEFAULT_LONG_PRESS_DELAY,
}: ContextMenuProps) {
  const { nodeId, node } = useOverlayTreeNode();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  const [targetElement, setTargetElement] = useState<HTMLDivElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const handleOpenChange = (next: boolean) => {
    // The internal state is kept only while `open` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `open` is later withdrawn.
    if (open === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  // The panel is positioned against a virtual reference — the invoking point, or the focused
  // element — set through `setPositionReference`, so floating-ui holds no DOM reference: every
  // press outside the panel, on the target included, is an outside press.
  const floating = useFloating({
    nodeId,
    open: isOpen,
    onOpenChange: handleOpenChange,
    placement: "bottom-start",
    middleware: [flip(), shift({ padding: VIEWPORT_PADDING })],
    whileElementsMounted: autoUpdate,
  });
  const { refs, context } = floating;

  const dismiss = useDismiss(context);
  const menuRole = useRole(context, { role: "menu" });
  const navigation = useMenuPanel(context);
  const interactions = useInteractions([dismiss, menuRole, panelProps, ...navigation.interactions]);

  // A menu opened by `open` or `defaultOpen` rather than by a gesture has no invoking point; it
  // anchors to the target's first element until a gesture names one.
  useLayoutEffect(() => {
    if (targetElement !== null) {
      refs.setPositionReference(elementAnchor(targetElement.firstElementChild ?? targetElement));
    }
  }, [targetElement, refs]);

  // Focus returns, on close, to the element holding it when the menu opened. Read before the
  // panel's focus manager moves focus onto a row, which it does after layout effects run. The
  // document itself is never the return target: the focus manager would move on to its first
  // tabbable element.
  useLayoutEffect(() => {
    if (isOpen) {
      const active = document.activeElement;
      returnFocusRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    }
  }, [isOpen]);

  const triggerProps = useContextMenuTriggers({
    disabled,
    longPressDelay,
    onInvoke(anchor, event) {
      refs.setPositionReference(anchor);
      context.onOpenChange(true, event);
    },
  });

  // Only the panel sits inside the node: an overlay opened from a row is this menu's child, while
  // the target belongs to whatever node the menu itself sits in.
  const panel = isOpen
    ? node(
        <MenuPanel
          floating={floating}
          interactions={interactions}
          navigation={navigation}
          className={className}
          returnFocus={returnFocusRef}
        >
          {children}
        </MenuPanel>,
      )
    : null;

  // The overlay root resolves from the target wrapper, the menu's only DOM element outside the
  // panel: with no DOM reference to resolve from, the panel would render inline and escape a
  // modal surface's overlay root.
  const { portal } = useOverlayRoot(targetElement);

  return (
    <>
      {/*
        The same `href` as `Menu`'s, so React 19 hoists and de-duplicates one stylesheet for
        every menu and context menu on a page.
      */}
      <style href="vpg-menu" precedence="vpg-menu">
        {menuStylesheet}
      </style>
      <div ref={setTargetElement} style={disabled ? DISABLED_WRAPPER_STYLE : WRAPPER_STYLE} {...triggerProps}>
        {target}
      </div>
      {panel === null ? null : portal(panel)}
    </>
  );
}

// Spelled out rather than `typeof MenuItem` and so on: the row functions live in
// `src/internal/`, which the package does not export, so a consumer whose declarations infer
// `typeof ContextMenu` could not name them.
type ContextMenuComponent = typeof ContextMenuRoot & {
  Item: (props: MenuItemProps) => ReactElement;
  CheckboxItem: (props: MenuCheckboxItemProps) => ReactElement;
  RadioItem: (props: MenuRadioItemProps) => ReactElement;
  Separator: () => ReactElement;
  Group: (props: MenuGroupProps) => ReactElement;
};

/**
 * A menu of actions on a region, opened from the region itself rather than from a trigger
 * control: a secondary click, a touch held still for `longPressDelay`, or `Shift+F10` or the
 * `ContextMenu` key while focus is inside it. Its rows are the same as `Menu`'s, under the same
 * rules — `ContextMenu.Item`, `ContextMenu.CheckboxItem` and `ContextMenu.RadioItem`, divided by
 * `ContextMenu.Separator`s and gathered under `ContextMenu.Group` headings — and so are its
 * focus handling, keyboard model and dismissal; see `Menu` and
 * `docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md`.
 *
 * A pointer opens the panel with its corner at the pointer; a key opens it below the focused
 * element. Invoking the target again while the menu is open moves the menu to the new point,
 * and a secondary click anywhere else closes it — on another context menu's target, that one
 * opens instead. Focus returns, on close, to the element that held it when the menu opened.
 *
 * The target is wrapped in a `display: contents` `<div>`, so wrapping a lone `<tr>` or `<li>`,
 * which only a table or list may hold, is not supported: wrap the table or list instead. The
 * wrapper adds no `tabIndex`, so a target with no focusable content cannot be reached, nor its
 * menu opened, from the keyboard.
 *
 * The innermost target wins: in a context menu nested inside another's target, a gesture on the
 * inner target opens only the inner menu. Nothing exempts editable fields — a target holding an
 * input replaces the browser's own text menu there — so leave such a field outside the target, or
 * set `disabled`.
 *
 * The panel portals through `useOverlayRoot`, resolved from the target: into its nearest ancestor
 * carrying `data-vpg-overlay-root` (a modal surface), else its nearest `.vpg-root`, else nowhere —
 * it renders inline beside the target. See
 * `docs/adr/0024-overlay-layering-and-portal-ownership.md`. It is a node of the enclosing
 * `FloatingTree`, as `Menu`'s is.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `ContextMenu` export is tree-shaken out entirely instead of keeping the whole module
// "just in case" `Object.assign` does something observable.
export const ContextMenu = /* @__PURE__ */ Object.assign(ContextMenuRoot, {
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioItem: MenuRadioItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
}) as ContextMenuComponent;
