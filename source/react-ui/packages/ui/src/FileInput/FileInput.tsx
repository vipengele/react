import { X } from "@vipengele/react-icons";
import { type DragEvent, type InputHTMLAttributes, type Ref, useLayoutEffect, useRef, useState } from "react";
import { Progress } from "../Progress/Progress.js";
import type { FileRejectionReason } from "./acceptFile.js";
import { fileInputStylesheet } from "./FileInput.stylesheet.js";
import { type FileUploader, type FileUploadEntry, type RejectedFileEntry, useFileUploads } from "./useFileUploads.js";

/**
 * The native input's attributes, less the ones the component owns. `name`, `form`, `required` and
 * `type` are absent because the input never submits with a form: the files go through `upload`,
 * and the form value is whatever the caller stores from the results. `value`, `defaultValue` and
 * `onChange` are absent because the list is uncontrolled and reported through the component's own
 * `onChange`.
 */
type NativeFileInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "name" | "form" | "required" | "type" | "value" | "defaultValue" | "onChange" | "multiple" | "accept" | "children"
>;

export interface FileInputProps extends NativeFileInputProps {
  /** A ref to the native `<input type="file">`, the element a caller focuses.
   * `InputHTMLAttributes` carries no `ref`, so the prop is declared here. */
  ref?: Ref<HTMLInputElement>;
  /** Sends one file. Called once per accepted file, as soon as it is picked. */
  upload: FileUploader;
  /** The native `accept` grammar: extensions (`.png`), MIME types (`image/png`) and wildcards
   * (`image/*`). It filters the picker and every added file alike; a file that fails it becomes a
   * rejected row and never uploads. */
  accept?: string;
  /** Whether more than one file may be picked at once. Off, an add of several files takes the
   * first and rejects the rest. Defaults to `true`. */
  multiple?: boolean;
  /** The largest size a file may have, in bytes. */
  maxSize?: number;
  /** The most rows that may be uploading or done at once. */
  maxFiles?: number;
  /** Called with every row after an add, a status change or a removal — never per progress
   * tick. */
  onChange?: (entries: readonly FileUploadEntry[]) => void;
  /** Called once per add that rejects any file, with the rejected rows. */
  onReject?: (rejected: readonly RejectedFileEntry[]) => void;
  /** The text inside the zone. Defaults to `Drop files here, or click to choose`, or
   * `Drop a file here, or click to choose` when `multiple` is off. */
  prompt?: string;
  /** The accessible name of a row's remove button. Defaults to `Remove ${fileName}`. */
  removeLabel?: (fileName: string) => string;
  /** The status text of a row whose upload is in flight. Defaults to `Uploading`. */
  uploadingMessage?: string;
  /** The status text of a row whose upload resolved. Defaults to `Uploaded`. */
  doneMessage?: string;
  /** The status text of a row whose upload rejected, given the rejection's message. Defaults to
   * `Upload failed: ${error}`. */
  failedMessage?: (error: string) => string;
  /** The status text of a rejected row, per reason. A reason left out keeps its default:
   * `type` — `File type not accepted`, `size` — `File is too large`, `count` — `Too many files`,
   * `directory` — `Folders cannot be uploaded`. */
  rejectionMessages?: Partial<Record<FileRejectionReason, string>>;
  /** Announced once when a row's upload resolves. Defaults to `${fileName} uploaded`. */
  doneAnnouncement?: (fileName: string) => string;
  /** Announced once when a row's upload rejects. Defaults to
   * `${fileName} failed to upload: ${error}`. */
  failedAnnouncement?: (fileName: string, error: string) => string;
}

const defaultRejectionMessages: Record<FileRejectionReason, string> = {
  type: "File type not accepted",
  size: "File is too large",
  count: "Too many files",
  directory: "Folders cannot be uploaded",
};

/** Whether a drag carries files. Text and links dragged from elsewhere on the page carry none. */
function isFileDrag(event: DragEvent<HTMLElement>): boolean {
  return event.dataTransfer.types.includes("Files");
}

/**
 * A native `<input type="file">` the component drives: every picked file becomes a row and starts
 * uploading through `upload` immediately.
 *
 * The input stays real and focusable, so the keyboard and assistive technology reach the picker
 * the native way, and `FormField`'s cloned `id` and `aria-*` props land on it rather than on a
 * wrapper a screen reader never focuses. It is visually hidden inside the zone, a plain `<div>`
 * rather than a wrapping `<label>`, which opens the picker on a pointer click and draws the
 * input's focus ring.
 *
 * The zone is also a drop target for file drags, and only for those: a drag of text or a link
 * neither lights it up nor is claimed. Disabled, it still claims a file drag, with a `none` drop
 * effect, so the browser shows the drop as refused instead of opening the file in the tab.
 *
 * The rows sit inside the zone as a list, each with its status in text as well as colour, a
 * `Progress` named after the file while it uploads or once it is done, and a remove button. A
 * click inside the list belongs to the row it lands on and never opens the picker. A hidden
 * status region announces each row that finishes or fails: it holds one message per settled row,
 * derived from the rows on every render, so a message is added exactly once, when its row
 * settles, and a progress tick, a removal or StrictMode's double render adds none.
 */
export function FileInput({
  className,
  upload,
  accept,
  multiple = true,
  maxSize,
  maxFiles,
  onChange,
  onReject,
  prompt,
  removeLabel = (fileName) => `Remove ${fileName}`,
  uploadingMessage = "Uploading",
  doneMessage = "Uploaded",
  failedMessage = (error) => `Upload failed: ${error}`,
  rejectionMessages,
  doneAnnouncement = (fileName) => `${fileName} uploaded`,
  failedAnnouncement = (fileName, error) => `${fileName} failed to upload: ${error}`,
  ref,
  ...rest
}: FileInputProps) {
  // The props type omits these, so only a caller that casts past it can pass them. Dropping them
  // here keeps that caller's input out of native form submission too.
  const {
    name: _name,
    form: _form,
    required: _required,
    disabled,
    ...inputProps
  } = rest as NativeFileInputProps & Pick<InputHTMLAttributes<HTMLInputElement>, "name" | "form" | "required">;
  const inputRef = useRef<HTMLInputElement>(null);
  // `dragenter` and `dragleave` fire for every child the pointer crosses, so the zone counts
  // them and stays lit until the pointer has left the zone itself.
  const dragDepthRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);
  const { entries, addFiles, removeFile } = useFileUploads({ upload, accept, multiple, maxSize, maxFiles, onChange, onReject });

  // A caller's ref is a function, an object, or absent; forwarding it by hand is what lets this
  // component keep a ref of its own to the same element. It is forwarded here, keyed on `ref`,
  // because an inline ref callback has a new identity every render, and React detaches and
  // reattaches such a callback on every commit — once per upload progress tick. Keyed, the
  // caller's ref is attached once and cleared on unmount, and a swapped ref clears the old one
  // before the new one receives the node. The input is never remounted, so `inputRef` holds the
  // same node for the component's whole lifetime.
  useLayoutEffect(() => {
    if (typeof ref === "function") {
      ref(inputRef.current);
      return () => {
        ref(null);
      };
    }
    if (ref) {
      ref.current = inputRef.current;
      return () => {
        ref.current = null;
      };
    }
  }, [ref]);

  const classes = ["vpg-file-input", className].filter(Boolean).join(" ");
  const promptText = prompt ?? (multiple ? "Drop files here, or click to choose" : "Drop a file here, or click to choose");

  return (
    <>
      {/*
        React 19 hoists and de-duplicates this by `href`, so N file inputs on a page inject one
        stylesheet.
      */}
      <style href="vpg-file-input" precedence="vpg-file-input">
        {fileInputStylesheet}
      </style>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the native input inside is the keyboard path to the picker; the zone's click is a pointer convenience only */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: as above, the zone is not itself a control */}
      <div
        className={classes}
        data-dragging={dragging ? "" : undefined}
        onDragEnter={(event) => {
          if (disabled || !isFileDrag(event)) return;
          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          if (!isFileDrag(event)) return;
          // Cancelling `dragover` is what makes the zone a drop target at all.
          event.preventDefault();
          event.dataTransfer.dropEffect = disabled ? "none" : "copy";
        }}
        onDragLeave={() => {
          // Zero means this drag never lit the zone: it carries no files, or the zone is disabled.
          if (dragDepthRef.current === 0) return;
          dragDepthRef.current -= 1;
          if (dragDepthRef.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          if (!isFileDrag(event)) return;
          // Without this, the browser opens the dropped file in place of the page.
          event.preventDefault();
          dragDepthRef.current = 0;
          setDragging(false);
          if (!disabled) addFiles(event.dataTransfer.files);
        }}
        onClick={(event) => {
          // The input is mounted whenever the zone is, so the ref is set by the time a click lands.
          // A click on the input itself already opens the picker; re-dispatching it would open a
          // second one. A click in the row list is a row's own, a remove button's included.
          const input = inputRef.current as HTMLInputElement;
          if (event.target === input || listRef.current?.contains(event.target as Node)) return;
          input.click();
        }}
      >
        <input
          {...inputProps}
          type="file"
          disabled={disabled}
          accept={accept}
          multiple={multiple}
          ref={inputRef}
          onChange={(event) => {
            const input = event.currentTarget;
            // `files` is `null` only on an input whose type is not `file`.
            addFiles(input.files as FileList);
            // Without the reset, picking the same file again fires no change event.
            input.value = "";
          }}
        />
        <span className="vpg-file-input-prompt">{promptText}</span>
        {entries.length > 0 && (
          <ul ref={listRef} className="vpg-file-input-list">
            {entries.map((entry) => {
              const name = entry.file.name;
              let status: string;
              if (entry.status === "uploading") status = uploadingMessage;
              else if (entry.status === "done") status = doneMessage;
              else if (entry.status === "failed") status = failedMessage(entry.error);
              else status = rejectionMessages?.[entry.reason] ?? defaultRejectionMessages[entry.reason];
              return (
                <li key={entry.id} className="vpg-file-input-row" data-status={entry.status}>
                  <span className="vpg-file-input-name">{name}</span>
                  <span className="vpg-file-input-status">{status}</span>
                  {(entry.status === "uploading" || entry.status === "done") && (
                    <Progress
                      className="vpg-file-input-progress"
                      size="sm"
                      aria-label={name}
                      value={entry.progress === null ? undefined : entry.progress * 100}
                    />
                  )}
                  <button
                    type="button"
                    className="vpg-file-input-remove"
                    aria-label={removeLabel(name)}
                    disabled={disabled}
                    onClick={() => {
                      removeFile(entry.id);
                      // The button unmounts with its row; the input keeps focus inside the
                      // component instead of dropping it to the document.
                      (inputRef.current as HTMLInputElement).focus();
                    }}
                  >
                    <X className="vpg-file-input-remove-icon" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {/*
          `role="status"` implies `aria-atomic="true"`, which would re-read every message on each
          addition; off, a screen reader reads only the message just added.
        */}
        <div className="vpg-file-input-announcer" role="status" aria-atomic="false">
          {entries.map((entry) =>
            entry.status === "done" ? (
              <span key={entry.id}>{doneAnnouncement(entry.file.name)}</span>
            ) : entry.status === "failed" ? (
              <span key={entry.id}>{failedAnnouncement(entry.file.name, entry.error)}</span>
            ) : null,
          )}
        </div>
      </div>
    </>
  );
}
