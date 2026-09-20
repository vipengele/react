# Floating-UI for Tooltip/Popover positioning

Tooltip and Popover both need to position a floating element against a trigger — flip when it
would overflow the viewport, shift to stay on-screen, track scroll/resize, and (for Popover)
manage focus and dismissal as a proper overlay. `@vipengele/react-ui` already takes `@vipengele/react-icons` as a
real (non-peer) `dependencies` entry rather than avoiding runtime dependencies on principle, so
the same tier is available here.

Decided: `@vipengele/react-ui` takes `@floating-ui/react` as a real dependency, rather than hand-rolling
`position: fixed` + `getBoundingClientRect`. Collision detection and viewport tracking are easy to
get subtly wrong and expensive to maintain by hand; a maintained library buys correctness that
would otherwise cost real engineering time to reach and keep.

Both components portal their floating element into the nearest ancestor `.vpg-root` (found
via `closest(".vpg-root")` on the trigger), not `document.body`. `ThemeProvider` (ADR 0001)
assigns every `--vpg-*` custom property on `.vpg-root`, not `:root` — a portal to
`document.body` would render outside that scope and lose every themed value, silently breaking
dark mode for exactly these two components the same way `--vpg-surface-dark` and Skeleton's
shimmer already broke it once each. Portaling to the nearest `.vpg-root` keeps the floating
element themed without re-implementing any part of `ThemeProvider`, and correctly picks up
whichever theme is active when multiple `ThemeProvider`s are nested with different seeds.

## Considered options

- Hand-rolled `position: fixed` + `getBoundingClientRect` — rejected: no new dependency, but flip/shift/scroll-tracking logic is exactly the kind of code that looks done and isn't, and every future overlay component would need to repeat or share it.
- Portal to `document.body` (floating-ui's default) — rejected: outside `.vpg-root`'s scope, so every `--vpg-*` value the floating element reads via `var()` resolves to nothing unless the theme is duplicated onto the portal root, which is the exact problem ADR 0001 avoided a context hook to prevent.
