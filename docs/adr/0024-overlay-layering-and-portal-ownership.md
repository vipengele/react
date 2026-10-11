# Overlay layering and portal ownership

`Tooltip`, `Popover`, `Dialog`, `Drawer`, `Menu`, `Toast` and the `Dropdown` listbox stack, and
several can be open at once: a menu inside a dialog, a tooltip over a drawer. Decided: the native
top layer follows **modality**, not component name. A **modal surface** is a top-layer element;
every other overlay stays on the page, portaled into a themed root and ordered by a token scale.
Five rules follow from that split, and they only make sense together.

## Decision

**Top layer.** `Dialog` and a `Drawer` with `modal` (the default) render a `<dialog>` opened with
`showModal()`. The browser makes everything outside it inert and paints it above every `z-index`,
so modal surfaces take no step on the stacking scale. `Tooltip`, `Popover`, `Menu`, the listbox
and a non-modal `Drawer` do not use the top layer and never carry the `popover` attribute.

**Portal ownership.** One internal hook, `useOverlayRoot(reference)`, is the only place an
overlay resolves its portal target and, the toast region aside (below), calls `createPortal`.
The target is the nearest ancestor of the trigger that carries `data-vpg-overlay-root` (set only on a modal surface), else the nearest
`.vpg-root`, else no portal: the overlay renders inline beside its trigger, never into
`document.body` (ADR-0002). An overlay opened from inside a modal surface has to portal into it,
because a modal surface makes everything outside itself inert and paints it above everything
else; a portal into `.vpg-root` would be unreachable and hidden. Theming is unaffected, since a
top-layer element still inherits custom properties through the DOM tree.

**Stacking scale.** The `--vpg-layer-*` scale orders the page-layer overlays by containment:
`drawer` < `popover` < `listbox` = `menu` < `tooltip`. A non-modal drawer is a panel that contains
popovers and controls; a popover can contain a control; the listbox or menu a control opens must
sit above the popover that holds the control; a tooltip can be triggered from inside any of them.
Overlays of the same kind that nest, such as a popover in a popover, share a step and the child
wins because it mounts after its parent. Each step is 100 apart, which leaves room for a
consumer's own content between two Vipengele surfaces. The scale holds no value computed from
nesting depth: every `z-index` is a token.

**Dismissal.** Every overlay is a node in one `FloatingTree` and dismisses through floating-ui's
`useDismiss`, so Escape and an outside press close the innermost open overlay only, and a press
inside a parent overlay does not close it. The tree follows the React component tree, which
survives portals. A modal surface cancels the native `cancel` event Escape raises on a
`<dialog>` and closes through the tree instead, so modal and non-modal overlays share one rule.

**Scroll lock.** Only an open modal surface locks the page, and the lock is derived from state
rather than counted: the base stylesheet carries one rule keyed on the marker,
`html:has([data-vpg-overlay-root][open]) { overflow: hidden; scrollbar-gutter: stable }`. Two
modal surfaces open at once compose by definition, and no counter exists to leak. The lock covers
the document scroller only; an application that scrolls inside its own container locks that
container itself.

**Toast.** The toast region is a `popover="manual"` element, which puts it in the top layer
without making it modal. Top-layer elements stack in the order they were shown, so a modal surface
opened after the region paints over it. Painting above is not enough: a modal surface makes
everything outside its own subtree inert, a top-layer popover included, so a toast outside the
open surface is drawn but cannot be focused or clicked and is absent from the accessibility tree,
its live region with it. The region and its announcer therefore render into a host element the
region creates and React never renders. While no modal surface is open the host sits in the
target `useOverlayRoot` resolves from the region's own position. While one is, the host is
appended to the topmost open modal surface, the one opened last, and moves back down as surfaces
close or unmount; after every move the popover is hidden and shown again, so it paints above the
surface it is in. Moving the host is a DOM move, not a new portal target, so nothing remounts: the
toasts keep their nodes, state and running animations, and their timers live in the toaster store
(ADR-0032). The region is the one overlay that calls `createPortal` outside `useOverlayRoot`, into
that host.

**Drawer.** `Drawer` takes `modal` (default `true`). A modal drawer is a modal surface in every
respect above. A non-modal drawer is a page-layer overlay: no marker, no inert background, no
focus trap and no scroll lock, a `--vpg-layer-drawer` step, and membership in the `FloatingTree`.
Opened from inside a modal surface it portals into it like any other overlay.

## Considered options

- **Native top layer for every overlay** (`popover="manual"` on all of them) — rejected: it
  removes `z-index` entirely but rewrites the three shipped overlays and puts floating-ui's
  positioning on top-layer elements, and every overlay would have to re-promote itself to stay
  above a modal surface opened after it.
- **No native top layer**, with modal surfaces as `role="dialog"` elements on the scale —
  rejected: modality, the focus trap and the inert background would be rebuilt by hand in JS for
  the one surface where the platform already gets them right.
- **Portal every overlay into `document.body`** — rejected in ADR-0002: it renders outside the
  subtree `ThemeProvider` themes.
- **Stack order from a kind-based scale alone, with the listbox below the popover** — rejected:
  a `Dropdown` inside a `Popover` portals its listbox into the same stacking context at a lower
  step, so the part of the listbox overlapping the panel paints beneath it.
- **Overlay stacking by a computed per-depth `z-index`** — rejected: it puts a JS-computed value
  where every other `z-index` is a token (ADR-0009).
- **An internal module-level overlay stack for Escape** — rejected: it is global state that
  ignores which React tree an overlay belongs to, and duplicates what floating-ui already tracks.
- **A reference-counted scroll lock in JS** (a hook, or `FloatingOverlay`'s `lockScroll`) —
  rejected: a missed cleanup leaves the page locked for good, where a state-derived rule cannot.
- **Toast on the page layer** — rejected: any open modal surface paints over it and makes it
  inert, so the message that follows an action taken inside a dialog is unseen.
- **Toast that only hides and shows itself again above a modal surface**, staying in the target
  resolved from its own position — rejected: it paints above the surface but sits outside its
  subtree, so it is inert. Its action cannot be focused or clicked, and neither the toast nor its
  live region is in the accessibility tree, so a toast raised from inside a dialog is seen and
  never read.
- **Toast portaled through React into the open modal surface**, re-rendering the portal with the
  surface as its target — rejected: a new portal target remounts the region's subtree, replaying
  every toast's entry and dropping hover and focus. Moving a host element React does not render
  keeps the same nodes, and the timers already live in the store, so a move rebuilds nothing.
- **Drawer always modal** — rejected: a non-modal side panel that leaves the page interactive is
  a supported use of the same component.

## Consequences

- The `listbox` and `popover` steps change values so the listbox sits above the popover, and
  `menu` and `drawer` join the scale. A consumer's own content placed between two adjacent
  Vipengele steps may need to move.
- Tooltip, Popover and the listbox move from their own `closest(".vpg-root")` lookups to
  `useOverlayRoot`, and each registers as a `FloatingTree` node.
- The bundle check's two entries import `Button` and `Tree`, and neither reaches an overlay, so
  its floating-ui absence markers stay valid: the tree and the overlay root live in
  `src/internal/` and are reachable only through the overlay components.
- A `Dropdown` inside a `Popover` needs a browser test that the listbox paints above the panel.
- Scroll lock reaches only the document scroller, and `:has()` support is a hard requirement of
  the stylesheet rule.
