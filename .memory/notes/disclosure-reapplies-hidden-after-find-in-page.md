---
name: disclosure-reapplies-hidden-after-find-in-page
kind: gotcha
description: Disclosure bumps revealAttempts on every beforematch so its layout effect re-writes hidden=until-found, because the browser strips hidden itself and React's prop diff cannot restore it.
anchors:
  - path: source/react-ui/packages/ui/src/Disclosure/Disclosure.tsx
    blob: c42a426fe940
  - path: source/react-ui/packages/ui/src/Disclosure/Disclosure.test.tsx
    blob: fdc61c0e3df7
confidence: verified
---

A closed panel carries `hidden="until-found"`; on a find-in-page match the browser fires `beforematch`
and then removes `hidden` whatever the page does. An owner that declines to open leaves `isOpen`
unchanged, so no re-render rewrites the attribute. `Disclosure.tsx:50-53` keeps `revealAttempts`,
bumped by each `beforematch` listener (`:100-101`), and it is a dependency of the layout effect that writes
`hidden` (`:69-78`). Without it a declined (controlled) or disabled match leaves the panel visibly open
while `aria-expanded` is false. `hidden` is written by hand (`:68`) because React's typings accept only a
boolean, so server-rendered HTML carries no `hidden`. A disabled disclosure bumps the counter but skips the
open request. jsdom never fires `beforematch`; `Disclosure.test.tsx` simulates it.
