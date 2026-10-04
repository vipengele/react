import { type DragEvent, useRef, useState } from "react";

/** Whether a drag carries files. Text and links dragged from elsewhere on the page carry none. */
function isFileDrag(event: DragEvent<HTMLElement>): boolean {
  return event.dataTransfer.types.includes("Files");
}

export interface FileDropHandlers {
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
}

export interface FileDrop {
  /** Whether a file drag is over the zone and the zone is enabled. */
  dragging: boolean;
  /** Spread onto the drop zone. */
  handlers: FileDropHandlers;
}

/**
 * The drag-and-drop half of a file drop zone: which drags it claims, the drop effect it shows,
 * and whether it is lit. Only file drags are claimed. Disabled, the zone still claims one, with a
 * `none` drop effect, and never lights up or calls `onFiles`.
 */
export function useFileDrop(disabled: boolean | undefined, onFiles: (files: FileList) => void): FileDrop {
  // `dragenter` and `dragleave` fire for every child the pointer crosses, so the zone counts
  // them and stays lit until the pointer has left the zone itself.
  const dragDepthRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handlers: FileDropHandlers = {
    onDragEnter: (event) => {
      if (disabled || !isFileDrag(event)) return;
      dragDepthRef.current += 1;
      setDragging(true);
    },
    onDragOver: (event) => {
      if (!isFileDrag(event)) return;
      // Cancelling `dragover` is what makes the zone a drop target at all.
      event.preventDefault();
      event.dataTransfer.dropEffect = disabled ? "none" : "copy";
    },
    onDragLeave: () => {
      // Zero means this drag never lit the zone: it carries no files, or the zone is disabled.
      if (dragDepthRef.current === 0) return;
      dragDepthRef.current -= 1;
      if (dragDepthRef.current === 0) setDragging(false);
    },
    onDrop: (event) => {
      if (!isFileDrag(event)) return;
      // Without this, the browser opens the dropped file in place of the page.
      event.preventDefault();
      dragDepthRef.current = 0;
      setDragging(false);
      if (!disabled) onFiles(event.dataTransfer.files);
    },
  };

  return { dragging, handlers };
}
