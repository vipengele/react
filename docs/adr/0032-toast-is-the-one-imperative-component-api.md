# `Toast` is the one imperative component API, reached through a toaster store

Every component in `@vipengele/react-ui` is declarative: what is on screen is a function of props
and children at the caller's position in the tree. `Toast` cannot be. The code that raises a
message is a form handler, a mutation callback or a service module, and it has no place in the
tree to put a `<Toast>` and no state to hold its `open` flag. `toast.success("Saved")` is the
natural call. This ADR records whether that call is a pattern or an exception, how it reaches the
toast region, and what it does when no region is mounted. Where the region renders and how it
stacks is settled in `0024-overlay-layering-and-portal-ownership.md` and is not reopened here.

## Decisions

- **Toast is the stated exception.** An imperative API is admitted only for a surface that has no
  natural position in the caller's tree, is raised by code with no render of its own, and returns
  nothing the caller waits on beyond an id to dismiss it. `Dialog`, `Drawer`, `ConfirmDialog`,
  `Popover`, `Menu` and `Tooltip` stay controlled (`open` + `onOpenChange`): they are anchored to
  a trigger or own a result the caller reads, and an imperative `confirm()` would hide that state
  from React. A new imperative API needs its own ADR that meets all three conditions.
- **A toaster is a store; the region subscribes to it.** `createToaster()` returns a store (the
  queue and its timers) and a `toast` handle bound to it. `<ToastRegion toaster={…}>` reads the
  store with `useSyncExternalStore` and renders the toasts in the `popover="manual"` element
  ADR-0024 specifies. The package exports a default toaster, its `toast` and its region wiring, so
  the common case is `import { toast, ToastRegion } from "@vipengele/react-ui"`, one region
  mounted once and `toast.*` called from anywhere. `toast` is a module-level value: it is valid
  before, outside and after any React render, and holds no reference to a component instance.
- **The region, not the call, carries the theme.** `toast.*` takes no theme and reads no context.
  The region is a component mounted under a `ThemeProvider` and resolves its target through
  `useOverlayRoot` from its own position, so a toast is themed by where its region sits
  (ADR-0001), and while a modal surface is open, by the topmost one, which the region moves into
  (ADR-0024). An application
  with two independently themed roots mounts two toasters and calls the matching `toast`; a
  module-level singleton cannot choose a theme per call, and that is why the store is not
  hard-wired to one.
- **No region mounted: the call is a recorded no-op.** It returns a handle whose `dismiss()` does
  nothing, throws nothing and queues nothing. In development it logs one `console.warn` per
  toaster naming the missing `ToastRegion`. Production code stays silent. This also covers
  rendering on the server, where no region can exist and a throw would fail the request.
- **A toast raised before its region mounts is dropped, not replayed.** A message shown seconds
  after the action it reports reads as a different event, and a buffer is state that outlives the
  tree. A region that must not miss early toasts is mounted at the application root, above
  whatever raises them.
- **Two regions on one toaster render the same toasts twice.** The region warns in development
  when a second one subscribes to a toaster that already has one. Showing a toast in more than one
  place is a second toaster.
- **The call is the whole API for raising.** `toast(message, options)` and the status shorthands
  return an id; `toast.dismiss(id)` and `toast.dismiss()` close one or all. A toast takes no
  JSX-returning callback, so the store holds plain data and the region renders it. Timers pause
  while the pointer is over the region or focus is inside it, and live in the store so a toast
  keeps its place across a re-render of the region.
- **Three toasts are visible; the rest wait first-in, first-out, and never behind persistent ones
  alone.** A queued toast's timer starts when it is shown. While a toast is queued and every
  visible toast is persistent (a `danger` toast by default, or a duration too long to time), the
  oldest visible toast is dismissed silently and the oldest queued one is shown. The oldest goes
  because the newest is the one the reader has not seen, and the persistent toast they have had
  longest is the one they have most likely read.

## Considered options

- **Imperative APIs as a general pattern** (`dialog.open()`, `confirm()`, `menu.show()`) —
  rejected: each would hold open state outside React and decouple an overlay from the trigger it
  anchors to, which ADR-0024's `FloatingTree` and focus return depend on. Toast is the one
  surface that has neither.
- **A context hook only** (`const toast = useToast()`) — rejected: it cannot be called from a
  mutation callback in a module or from a non-React service, which is the case that motivates the
  API. The stable-handle idea of `useScope` is kept: a toaster's `toast` never changes identity.
- **A hook and a module-level `toast`** — rejected: two ways to raise the same message, with no
  case the module-level value does not cover.
- **A global store with a single implicit region** — rejected: it cannot serve two themed roots,
  and tests share state across files.
- **Throwing when no region is mounted** — rejected: the call reports an action that already
  succeeded, and an exception in a mutation handler turns that success into an error; it would
  also fail server rendering.
- **Buffering until a region mounts** — rejected as above; it shows stale messages and leaks
  state past the tree.
- **Persistent toasts holding the queue until dismissed** — rejected: three of them block every
  later toast forever, a later error included.
- **Making room by dismissing or hiding the newest toast** — rejected: the toast just raised is the
  one the reader has not seen, and hiding it defeats raising it.
- **A configurable visible limit** — rejected: a larger limit only moves the point at which
  persistent toasts block the queue, and is one more option for no case three does not serve.
- **A dedicated toaster package** (`react-toast`) — rejected: the store and the region are one
  component's concerns, and ADR-0022 reserves `react-telemetry` for non-visual primitives that
  render nothing; the region renders.

## Consequences

- `Toast` ships a `createToaster`, a default `toast`, `ToastRegion`, and its stories in the same PR
  (`ship-storybook-stories-with-every-component`): a default region, a second themed root, and the
  no-region case.
- The package's `"sideEffects": false` holds: the default toaster is created lazily on first use,
  not at module load, so importing `toast` without calling it keeps the bundle tree-shakable.
- The store is exercised in jsdom. The top-layer behaviour of the region, including re-showing
  above a modal surface, can only be proved in Chromium, because jsdom's `showModal` and popover
  stubs give no top layer or inertness.
- A call made after a native `await` is unaffected by scope loss in the browser: `toast` reads no
  `Scope`, so it needs no `Scope.propagate`.
- The ADR leaves each new overlay one question to answer before it is imperative: does it meet all
  three conditions above. The answer for the surfaces that ship today is no.
