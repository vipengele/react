# Card's compound components validate their children at runtime

Every component in `@tandiko/ui` so far (Button, Avatar, ButtonGroup, Skeleton, Spinner,
Typography) takes flat props and, where it accepts `children` at all, renders them unmodified —
no `cloneElement`, no context, no validation. Card breaks that pattern: it ships as `Card` plus
`Card.Header`, `Card.Content`, and `Card.Footer` (PascalCase — they're components, not intrinsic
elements), and `Card` throws at render time if its children are anything other than at most one
of each, with `Card.Content` required.

Decided: consistent card layout across the app was judged important enough to enforce in code
rather than leave as a documented convention. A plain wrapper (`header`/`footer`/`children`
props, or an unvalidated compound API) would let a consumer skip `Card.Content`'s padding
contract or nest arbitrary markup directly, silently producing a Card that doesn't match its
siblings. The throw is deliberate, not a `console.warn` — this is the first component in the
package to enforce structure this way, and future overlay/compound components (Tabs, in this
same slice, considered but did not need this) should treat it as precedent for when structural
enforcement is worth the extra machinery, not a pattern to reach for by default.

`Card`'s own layout is CSS-driven (`order` in a flex/grid container), not JSX-order-dependent —
`Card.Header`, `.Content`, and `.Footer` can appear in any order in source and still render
header → content → footer.

The interactive variant (`onClick` passed to `Card`) renders as `<div role="button" tabIndex={0}>`
with manual `Enter`/`Space` keydown handling, not as a native `<button>` wrapping the compound
children. A `<button>` element's content model forbids interactive content, and `Card.Footer`'s
canonical content is a `<Button>` — wrapping the whole card in `<button>` breaks the moment a
footer action exists, which is the common case, not an edge case.

## Considered options

- Flat `header`/`footer` props + `children` as content, matching every other component in the package — rejected: no way to guarantee a consumer wraps content consistently, and the ask was specifically to enforce that.
- Compound components with no validation (render whatever's passed, like `ButtonGroup` does with plain `<Button>` children) — rejected: doesn't prevent the inconsistency the compound API was meant to solve in the first place.
