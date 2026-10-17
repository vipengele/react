---
name: menu-clones-single-element-trigger
kind: gotcha
description: Menu wraps its trigger in a .vpg-menu-trigger span for ref and handlers but still clones a single-element trigger to merge aria-haspopup/expanded/controls, despite the wrap-never-clone rule.
anchors:
  - path: source/react-ui/packages/ui/src/Menu/Menu.tsx
    blob: d2a440c99893
  - path: source/react-ui/packages/ui/.agents/rules/wrap-trigger-never-clone.md
    blob: 2a754aff6bcd
confidence: verified
---

`wrap-trigger-never-clone.md` says triggers are wrapped and never cloned, and `Menu` honours that for the ref and interaction
handlers (they sit on the `.vpg-menu-trigger` span). `Menu.tsx:136` nevertheless `cloneElement`s a single non-Fragment element
trigger to add `aria-haspopup`, `aria-expanded` and `aria-controls`. So a trigger passed to `Menu` must accept those props on
its root element (a plain `<button>` does), and docs saying Menu "never clones" its trigger are wrong for the ARIA attributes.
`Popover.tsx:196` does the same for a modal single-element trigger.
