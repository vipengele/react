import { autoUpdate, flip, offset, shift, useClick, useDismiss, useFloating, useInteractions, useRole } from "@floating-ui/react";
import { type AriaAttributes, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode, useState } from "react";
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

export type { MenuCheckboxItemProps, MenuGroupProps, MenuItemProps, MenuRadioItemProps } from "../internal/menuPanel.js";

export interface MenuProps {
  /** The control that opens the menu. It is wrapped in a `<span>` that carries the ref and the
   * click handler — not cloned for those, so it can be any node, including a component that
   * doesn't forward a ref or spread unknown props. When it is a single element, it is
   * additionally cloned with `aria-haspopup`/`aria-expanded`/`aria-controls` merged on, so
   * assistive tech operating the actual control gets its menu semantics. */
  trigger: ReactNode;
  /** The rows of the menu, rendered inside the `role="menu"` panel: only `Menu.Item`,
   * `Menu.CheckboxItem`, `Menu.RadioItem`, `Menu.Separator` and `Menu.Group`, optionally inside
   * fragments. Any other child throws at render, naming the offender. */
  children: ReactNode;
  /** Controls the menu. Supplying it hands the state to the caller: the menu then opens and
   * closes only when this prop changes, and reports every request through `onOpenChange`. */
  open?: boolean;
  /** Seeds the uncontrolled state. Ignored once `open` is supplied. */
  defaultOpen?: boolean;
  /** Fired for every open/close request — a trigger click, an outside press, `Escape` — in both
   * the controlled and the uncontrolled form. */
  onOpenChange?: (open: boolean) => void;
  /** Composed onto the panel, not onto the trigger wrapper. */
  className?: string;
}

/** Gap between the trigger and the panel, in pixels. */
const MENU_OFFSET = 4;

/** Minimum gap kept between the panel and the viewport edge when it has to shift, in pixels. */
const VIEWPORT_PADDING = 12;

function MenuRoot(props: MenuProps) {
  assertMenuRows(props.children, "Menu", true);
  return (
    <OverlayTreeShell>
      <MenuInner {...props} />
    </OverlayTreeShell>
  );
}

function MenuInner({ trigger, children, open, defaultOpen = false, onOpenChange, className }: MenuProps) {
  const { nodeId, node } = useOverlayTreeNode();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;

  const handleOpenChange = (next: boolean) => {
    // The internal state is kept only while `open` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `open` is later withdrawn.
    if (open === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const floating = useFloating({
    nodeId,
    open: isOpen,
    onOpenChange: handleOpenChange,
    placement: "bottom-start",
    middleware: [offset(MENU_OFFSET), flip(), shift({ padding: VIEWPORT_PADDING })],
    whileElementsMounted: autoUpdate,
  });
  const { refs, context, elements } = floating;

  // `useRole` with `role: "menu"` is what pairs `role`/`id` on the panel with
  // `aria-expanded`/`aria-haspopup`/`aria-controls` on the trigger, off a `useId`-generated id it
  // owns; setting either half by hand would leave the other pointing at a different id.
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const menuRole = useRole(context, { role: "menu" });
  const navigation = useMenuPanel(context);
  const interactions = useInteractions([click, dismiss, menuRole, ...navigation.interactions]);

  // `aria-haspopup`/`aria-expanded`/`aria-controls` describe the operable trigger control to
  // assistive tech, not an inert wrapper — the wrapper `<span>` never receives focus, so
  // attributes on it are invisible to a screen reader operating the actual control. When
  // `trigger` is a single element (and not a `Fragment`, which names no single DOM node), it is
  // cloned with just these plain props merged on — not the ref or the click/dismiss handlers,
  // which a component that doesn't forward refs (`Button` included) can't accept; see
  // `wrap-trigger-never-clone.md`. The click handler stays on the wrapper regardless: a click
  // anywhere inside it, nested child included, bubbles up to it either way.
  const {
    "aria-haspopup": ariaHaspopup,
    "aria-expanded": ariaExpanded,
    "aria-controls": ariaControls,
    ...referenceProps
  } = interactions.getReferenceProps() as Record<string, unknown> & {
    "aria-haspopup"?: AriaAttributes["aria-haspopup"];
    "aria-expanded"?: AriaAttributes["aria-expanded"];
    "aria-controls"?: AriaAttributes["aria-controls"];
  };
  const hasSingleElementTrigger =
    isValidElement<{
      "aria-haspopup"?: AriaAttributes["aria-haspopup"];
      "aria-expanded"?: AriaAttributes["aria-expanded"];
      "aria-controls"?: AriaAttributes["aria-controls"];
    }>(trigger) && trigger.type !== Fragment;
  const triggerElement = hasSingleElementTrigger
    ? cloneElement(trigger, {
        "aria-haspopup": ariaHaspopup,
        "aria-expanded": ariaExpanded,
        "aria-controls": ariaControls,
      })
    : trigger;

  // Only the panel sits inside the node: an overlay opened from a row is this menu's child, while
  // the trigger belongs to whatever node the menu itself sits in.
  const panel = isOpen
    ? node(
        <MenuPanel floating={floating} interactions={interactions} navigation={navigation} className={className}>
          {children}
        </MenuPanel>,
      )
    : null;

  const { portal } = useOverlayRoot(elements.domReference);

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N menus on a page inject one
        stylesheet.
      */}
      <style href="vpg-menu" precedence="vpg-menu">
        {menuStylesheet}
      </style>
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-expanded here only reaches a bare span in the fallback case (a trigger that isn't a single element), the least-wrong place left per wrap-trigger-never-clone.md */}
      <span
        ref={refs.setReference}
        className="vpg-menu-trigger"
        aria-haspopup={hasSingleElementTrigger ? undefined : ariaHaspopup}
        aria-expanded={hasSingleElementTrigger ? undefined : ariaExpanded}
        aria-controls={hasSingleElementTrigger ? undefined : ariaControls}
        {...referenceProps}
      >
        {triggerElement}
      </span>
      {panel === null ? null : portal(panel)}
    </>
  );
}

// Spelled out rather than `typeof MenuItem` and so on: the row functions live in
// `src/internal/`, which the package does not export, so a consumer whose declarations infer
// `typeof Menu` could not name them.
type MenuComponent = typeof MenuRoot & {
  Item: (props: MenuItemProps) => ReactElement;
  CheckboxItem: (props: MenuCheckboxItemProps) => ReactElement;
  RadioItem: (props: MenuRadioItemProps) => ReactElement;
  Separator: () => ReactElement;
  Group: (props: MenuGroupProps) => ReactElement;
};

/**
 * A list of actions opened from a trigger whose own content never changes — see
 * `docs/adr/0026-menu-and-dropdown-are-separate-components.md` for where a `Menu` ends and a
 * `Dropdown` begins. Its rows are `Menu.Item`s, `Menu.CheckboxItem`s and `Menu.RadioItem`s,
 * optionally divided by `Menu.Separator`s and gathered under `Menu.Group` headings; a radio row
 * needs a group, which holds its set's checked value. Checked state belongs to the caller and is
 * never shown on the trigger.
 *
 * The menu opens on a trigger click and is dismissed by an outside press, by `Escape`, by
 * clicking the trigger again, or by activating a `Menu.Item` or a `Menu.RadioItem`; activating a
 * `Menu.CheckboxItem` leaves it open. Focus moves for real onto the rows, one of
 * which holds the only tab stop: it opens on the first row, or on the last when `ArrowUp` opens
 * it; `ArrowUp`/`ArrowDown` move between rows and wrap at either end, `Home`/`End` jump to the
 * ends, and typing a row's leading characters jumps to it. Focus returns to the trigger when the
 * menu closes. The panel, its rows and their focus handling live in `src/internal/menuPanel.tsx`;
 * see `docs/adr/0030-menu-moves-real-focus-and-roving-tabindex.md`.
 *
 * The panel portals through `useOverlayRoot`: into the trigger's nearest ancestor carrying
 * `data-vpg-overlay-root` (a modal surface), else its nearest `.vpg-root`, else nowhere — it
 * renders inline as the trigger's sibling, never into `document.body`, which sits outside the
 * subtree `ThemeProvider` assigns its `--vpg-*` properties on. See
 * `docs/adr/0024-overlay-layering-and-portal-ownership.md`.
 *
 * The menu is a node of the enclosing `FloatingTree`. `Escape` closes only the innermost open
 * overlay, so a menu opened from inside a popover's panel closes without taking the popover with
 * it; a press outside every overlay in the chain closes them all.
 */
// The `@__PURE__` annotation tells Rollup/esbuild this call has no side effect it can't see, so
// an unused `Menu` export is tree-shaken out entirely instead of keeping the whole module "just in
// case" `Object.assign` does something observable.
export const Menu = /* @__PURE__ */ Object.assign(MenuRoot, {
  Item: MenuItem,
  CheckboxItem: MenuCheckboxItem,
  RadioItem: MenuRadioItem,
  Separator: MenuSeparator,
  Group: MenuGroup,
}) as MenuComponent;
