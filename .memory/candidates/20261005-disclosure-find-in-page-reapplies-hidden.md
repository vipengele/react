---
about: Disclosure's closed panel is hidden="until-found", which the browser strips itself on a find-in-page match; the owner may decline, so the component re-applies it
saw:
  - source/react-ui/packages/ui/src/Disclosure/Disclosure.tsx
  - source/react-ui/packages/ui/src/Disclosure/Disclosure.test.tsx
  - source/react-ui/packages/ui/README.md
  - docs/adr/0030-disclosure-is-the-primitive-accordion-composes-it.md
---

Checked 2026-10-05.

- When find-in-page matches text inside a `hidden="until-found"` element the browser fires
  `beforematch` and then removes `hidden` itself, whatever the page does in the handler. React's
  prop diff cannot restore it: an owner that declines to open leaves `isOpen` unchanged, so no
  re-render writes the attribute. `Disclosure.tsx` therefore bumps a `revealAttempts` state on every
  `beforematch` and lists it in the dependencies of the `useLayoutEffect` that writes `hidden`.
  Remove the bump and a declined (controlled) or disabled match leaves the panel visibly open while
  `aria-expanded` is `false`.
- `hidden` is written imperatively, never as a JSX prop: `@types/react` 19.2.18 types `hidden` as
  boolean and does not accept `"until-found"`. A consequence is that server-rendered HTML carries no
  `hidden` at all, so closed panels show until hydration; the README `Disclosure` section says so.
- A `disabled` disclosure skips `requestOpenChange` in the `beforematch` handler (no `onOpenChange`,
  no `group.toggle`) but still bumps `revealAttempts`. Inside a single-mode `Accordion`, requesting
  open on a disabled item would close the sibling that was open.
- jsdom never fires `beforematch` or strips `hidden`; `Disclosure.test.tsx` simulates both with a
  `findInPage` helper that dispatches the event and then removes the attribute.
