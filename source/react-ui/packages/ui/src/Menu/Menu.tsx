import {
  autoUpdate,
  FloatingFocusManager,
  FloatingList,
  flip,
  offset,
  shift,
  type UseInteractionsReturn,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useListItem,
  useListNavigation,
  useRole,
  useTypeahead,
} from "@floating-ui/react";
import {
  type AriaAttributes,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type SyntheticEvent,
  useContext,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { OverlayTreeShell, useOverlayTreeNode } from "../internal/overlayTree.js";
import { useOverlayRoot } from "../internal/useOverlayRoot.js";
import { menuStylesheet } from "./Menu.stylesheet.js";

export interface MenuProps {
  /** The control that opens the menu. It is wrapped in a `<span>` that carries the ref and the
   * click handler — not cloned for those, so it can be any node, including a component that
   * doesn't forward a ref or spread unknown props. When it is a single element, it is
   * additionally cloned with `aria-haspopup`/`aria-expanded`/`aria-controls` merged on, so
   * assistive tech operating the actual control gets its menu semantics. */
  trigger: ReactNode;
  /** The rows of the menu — `Menu.Item`, `Menu.Separator` and `Menu.Group` — rendered inside the
   * `role="menu"` panel. */
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

interface MenuContextValue {
  /** The index of the row holding the roving tab stop, or `null` while none does. */
  activeIndex: number | null;
  getItemProps: UseInteractionsReturn["getItemProps"];
  /** Closes the menu, returning focus to the trigger. */
  close: (event: SyntheticEvent) => void;
  /** Whether a typeahead string is being typed, during which `Space` extends the string rather
   * than activating the focused row. */
  isTyping: () => boolean;
}

/** `Menu.Item` registers into the panel's focus index and activates through the panel's open
 * state, neither of which exists outside a `Menu`. */
const MenuContext = createContext<MenuContextValue | null>(null);

function useMenuContext(component: string): MenuContextValue {
  const context = useContext(MenuContext);
  if (context === null) {
    throw new Error(`${component} must be rendered inside <Menu>.`);
  }
  return context;
}

function MenuRoot(props: MenuProps) {
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
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isTypingRef = useRef(false);
  // Each `Menu.Item` writes its element and its text into its own slot, at its index in document
  // order. Separators and group labels never register, so they are not stops in either list.
  const elementsRef = useRef<Array<HTMLElement | null>>([]);
  const labelsRef = useRef<Array<string | null>>([]);

  const handleOpenChange = (next: boolean) => {
    // The internal state is kept only while `open` is absent. Writing it in the controlled form
    // too would leave a stale value behind for the moment `open` is later withdrawn.
    if (open === undefined) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  const { refs, floatingStyles, context, elements } = useFloating({
    nodeId,
    open: isOpen,
    onOpenChange: handleOpenChange,
    placement: "bottom-start",
    middleware: [offset(MENU_OFFSET), flip(), shift({ padding: VIEWPORT_PADDING })],
    whileElementsMounted: autoUpdate,
  });

  // `useRole` with `role: "menu"` is what pairs `role`/`id` on the panel with
  // `aria-expanded`/`aria-haspopup`/`aria-controls` on the trigger, off a `useId`-generated id it
  // owns; setting either half by hand would leave the other pointing at a different id.
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const menuRole = useRole(context, { role: "menu" });
  // Real focus moves onto each row (no `virtual`), and the row holding it is the one tab stop.
  // `focusItemOnOpen` puts focus on a row however the menu opens — a pointer click included —
  // rather than leaving it on the panel. `disabledIndices` is empty because a disabled row stays
  // a stop: without it, floating-ui treats every `aria-disabled` row as one to skip.
  const listNavigation = useListNavigation(context, {
    listRef: elementsRef,
    activeIndex,
    onNavigate: setActiveIndex,
    loop: true,
    focusItemOnOpen: true,
    disabledIndices: [],
  });
  // A row clears its label when it unmounts, so typing on the trigger of a shut menu matches
  // nothing and never seeds the row it next opens on.
  const typeahead = useTypeahead(context, {
    listRef: labelsRef,
    activeIndex,
    onMatch: setActiveIndex,
    onTypingChange(typing) {
      isTypingRef.current = typing;
    },
  });
  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions([click, dismiss, menuRole, listNavigation, typeahead]);

  const menuContext = useMemo<MenuContextValue>(
    () => ({
      activeIndex,
      getItemProps,
      close(event) {
        context.onOpenChange(false, event.nativeEvent, "click");
      },
      isTyping: () => isTypingRef.current,
    }),
    [activeIndex, getItemProps, context],
  );

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
  } = getReferenceProps() as Record<string, unknown> & {
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
  // the trigger belongs to whatever node the menu itself sits in. The focus manager is non-modal:
  // a menu is a transient list of actions, not a surface that holds the page inert behind it, and
  // focus leaving the panel closes it. Its initial focus is the panel itself: list navigation
  // moves focus on to the opening row once the rows have registered, and a menu holding no row
  // keeps focus on the panel.
  const panel = isOpen
    ? node(
        <FloatingFocusManager context={context} modal={false} initialFocus={refs.floating}>
          <div
            ref={refs.setFloating}
            className={["vpg-menu", className].filter(Boolean).join(" ")}
            style={floatingStyles}
            {...getFloatingProps()}
          >
            <MenuContext.Provider value={menuContext}>
              <FloatingList elementsRef={elementsRef} labelsRef={labelsRef}>
                {children}
              </FloatingList>
            </MenuContext.Provider>
          </div>
        </FloatingFocusManager>,
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

export interface MenuItemProps {
  /** The row's label. Typeahead matches typed characters against the start of the row's text,
   * which this label leads. */
  children: ReactNode;
  /** Fired when the row is activated — clicked, or `Enter`/`Space` while it holds focus. The menu
   * closes right after, returning focus to the trigger. Never fired while `disabled`. */
  onSelect?: () => void;
  /** Leaves the row focusable — arrow keys and typeahead still stop on it, so a keyboard user can
   * learn it exists — but inert: activating it neither fires `onSelect` nor closes the menu. */
  disabled?: boolean;
  /** An icon in front of the label. Decorative: hidden from assistive tech, which reads the label. */
  leadingIcon?: ReactNode;
  /** A keyboard shortcut displayed at the row's trailing edge. Display only — the menu binds no
   * key to it. */
  shortcut?: ReactNode;
}

function MenuItem({ children, onSelect, disabled = false, leadingIcon, shortcut }: MenuItemProps) {
  const { activeIndex, getItemProps, close, isTyping } = useMenuContext("Menu.Item");
  const { ref, index } = useListItem();

  const activate = (event: SyntheticEvent) => {
    if (disabled) {
      return;
    }
    onSelect?.();
    close(event);
  };

  return (
    <div
      ref={ref}
      role="menuitem"
      className="vpg-menu-item"
      tabIndex={index === activeIndex ? 0 : -1}
      aria-disabled={disabled ? true : undefined}
      {...getItemProps({
        onClick: (event: MouseEvent<HTMLElement>) => activate(event),
        onKeyDown(event: KeyboardEvent<HTMLElement>) {
          // `Space` while a typeahead string is being typed belongs to the string, so a label
          // with a space in it can still be typed out in full.
          if (event.key === "Enter" || (event.key === " " && !isTyping())) {
            event.preventDefault();
            activate(event);
          }
        },
      })}
    >
      {leadingIcon === undefined ? null : (
        <span className="vpg-menu-item-icon" aria-hidden="true">
          {leadingIcon}
        </span>
      )}
      <span className="vpg-menu-item-label">{children}</span>
      {shortcut === undefined ? null : <span className="vpg-menu-item-shortcut">{shortcut}</span>}
    </div>
  );
}

/** A rule between rows, exposed as `role="separator"` through `<hr>`'s own semantics. Not a stop
 * for arrow keys or typeahead. */
function MenuSeparator() {
  return <hr className="vpg-menu-separator" />;
}

export interface MenuGroupProps {
  /** The group's visible heading, which also names the `role="group"` for assistive tech. Not a
   * stop for arrow keys or typeahead. */
  label: ReactNode;
  /** The group's rows. */
  children: ReactNode;
}

function MenuGroup({ label, children }: MenuGroupProps) {
  const labelId = useId();
  return (
    // biome-ignore lint/a11y/useSemanticElements: a <fieldset> implies form-control semantics and carries its own chrome; what a menu owns between itself and its rows is a plain role="group"
    <div role="group" aria-labelledby={labelId} className="vpg-menu-group">
      <div id={labelId} className="vpg-menu-group-label">
        {label}
      </div>
      {children}
    </div>
  );
}

type MenuComponent = typeof MenuRoot & {
  Item: typeof MenuItem;
  Separator: typeof MenuSeparator;
  Group: typeof MenuGroup;
};

/**
 * A list of actions opened from a trigger whose own content never changes — see
 * `docs/adr/0026-menu-and-dropdown-are-separate-components.md` for where a `Menu` ends and a
 * `Dropdown` begins. Its rows are `Menu.Item`s, optionally divided by `Menu.Separator`s and
 * gathered under `Menu.Group` headings.
 *
 * The menu opens on a trigger click and is dismissed by an outside press, by `Escape`, by
 * clicking the trigger again, or by activating a row. Focus moves for real onto the rows, one of
 * which holds the only tab stop: it opens on the first row, or on the last when `ArrowUp` opens
 * it; `ArrowUp`/`ArrowDown` move between rows and wrap at either end, `Home`/`End` jump to the
 * ends, and typing a row's leading characters jumps to it. Focus returns to the trigger when the
 * menu closes.
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
  Separator: MenuSeparator,
  Group: MenuGroup,
}) as MenuComponent;
