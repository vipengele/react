about: source/react-ui/packages/ui/src/FileInput/FileInput.tsx
saw: deciding what a disabled FileInput zone does with a dragged file
---

A disabled `FileInput` still calls `preventDefault` on a file `dragover` and on `drop`, with
`dataTransfer.dropEffect = "none"` while disabled
(`source/react-ui/packages/ui/src/FileInput/FileInput.tsx`, the zone's `onDragOver` and `onDrop`).
Not calling `preventDefault` looks like the way to refuse a drop, but the browser then treats the
drop as navigation and opens the dropped file in place of the page, losing the page and every
in-flight upload. Claiming the event with a `none` effect shows the refused cursor and stops the
navigation; `addFiles` is simply not called.

The zone only claims drags whose `dataTransfer.types` includes `"Files"`, so text and link drags
from elsewhere on the page are untouched.
