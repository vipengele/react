---
name: toolbar-focus-bubbles-out-of-portals
kind: gotcha
description: React's onFocus bubbles from a portalled popover control to the Toolbar, so handleFocus must check the DOM contains the target before recording a tab stop.
anchors:
  - path: source/react-ui/packages/ui/src/Toolbar/Toolbar.tsx
    blob: 7885894a671a
confidence: verified
---

`Toolbar.tsx:90-99` (`handleFocus`): synthetic focus events bubble along the component tree, so a control in a
popover opened from a toolbar `MenuButton` reaches the toolbar's handler without being one of its items. The
`event.currentTarget.contains(target)` guard (`Toolbar.tsx:96`) stops that control becoming the roving tab stop.
Any container that tracks "last focused child" from `onFocus` needs the same DOM-containment check.
