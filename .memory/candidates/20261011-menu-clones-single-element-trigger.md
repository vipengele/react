---
about: Menu wraps its trigger in a .vpg-menu-trigger span for ref and handlers but still clones a single-element trigger to merge aria-haspopup/expanded/controls
saw:
  - source/react-ui/packages/ui/src/Menu/Menu.tsx
  - source/react-ui/packages/ui/.agents/rules/wrap-trigger-never-clone.md
---
The rule `wrap-trigger-never-clone.md` says triggers are wrapped and never cloned, and `Menu` honours it for the ref and
interaction handlers (they sit on the `.vpg-menu-trigger` span). `Menu.tsx` (`hasSingleElementTrigger` / `cloneElement`,
~lines 130-141) nevertheless clones a single non-Fragment element trigger to add `aria-haspopup`, `aria-expanded` and
`aria-controls`. So a trigger passed to `Menu` must accept those props on its root element; a plain `<button>` does. Docs
that say Menu "never clones" its trigger are wrong for the ARIA attributes.
