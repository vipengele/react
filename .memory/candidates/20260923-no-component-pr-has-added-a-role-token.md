---
about: a component PR may add a --vpg-* role token it needs in the same PR as the component, rather than in a separate prior PR
saw:
  - source/react-ui/packages/tokens/src/theme.ts
  - source/react-ui/packages/tokens/src/theme.test.ts
  - source/react-ui/packages/tokens/AGENTS.md
  - source/react-ui/packages/tokens/.agents/rules/state-ramp-shift-direction.md
  - source/react-ui/packages/ui/src/Link/Link.tsx
  - source/react-ui/packages/ui/src/Link/Link.stylesheet.ts
---

Before this branch, no committed component PR (Checkbox #85, Textarea #86, StatePanel #87,
ErrorBoundary #90) had ever needed to extend `packages/tokens/src/theme.ts` — each shipped
reading only tokens `theme.ts` already defined, so there was no precedent either way for whether
a new token belongs in the same PR as the component that needs it, or a separate prior one.

`Link` (feat(react-ui): add Link) is the first case: it needed `--vpg-accent-visited` and
`--vpg-danger-visited`, which didn't exist yet, and both landed in the same branch, as an earlier
commit (`feat(react-tokens): add visited step to accent and danger ramps`) ahead of the component
commit that consumes them. `packages/tokens/AGENTS.md` already said a token the package doesn't
define yet belongs in `theme.ts` "not as an inlined guess in the component" — this establishes
that "belongs in theme.ts" can mean the same PR, not necessarily a prior one.

Landing the token first surfaced a real bug review alone caught: the derivation's sign was wrong
in one colour mode (see `state-ramp-shift-direction.md`), which a same-PR token addition lets a
manual `:visited` check against the actual consuming component catch before merge — a token added
in isolation, with no consumer yet, would have no such check to catch it against.
