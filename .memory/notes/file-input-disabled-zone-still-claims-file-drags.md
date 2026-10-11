---
name: file-input-disabled-zone-still-claims-file-drags
kind: gotcha
description: A disabled FileInput still calls preventDefault on file dragover and drop, because refusing by not cancelling makes the browser navigate to the dropped file.
anchors:
  - path: source/react-ui/packages/ui/src/FileInput/useFileDrop.ts
    blob: ea53f4597fe4
confidence: verified
---

`useFileDrop.ts:38-43`: `onDragOver` cancels the event for any file drag and sets
`dropEffect = disabled ? "none" : "copy"`; `onDrop` (`:54-60`) always `preventDefault`s ("Without this, the
browser opens the dropped file in place of the page") and calls `onFiles` only when not disabled.
Skipping `preventDefault` to refuse a drop would navigate away, losing the page and in-flight uploads.
`onDragEnter` ignores a disabled zone (`:34`), and `isFileDrag` limits all of this to drags carrying files.
