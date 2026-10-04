import { type InputHTMLAttributes, type Ref, useRef } from "react";
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
  ref,
  ...rest
}: FileInputProps) {
  // The props type omits these, so only a caller that casts past it can pass them. Dropping them
  // here keeps that caller's input out of native form submission too.
  const {
    name: _name,
    form: _form,
    required: _required,
    ...inputProps
  } = rest as NativeFileInputProps & Pick<InputHTMLAttributes<HTMLInputElement>, "name" | "form" | "required">;
  const inputRef = useRef<HTMLInputElement>(null);
  const { addFiles } = useFileUploads({ upload, accept, multiple, maxSize, maxFiles, onChange, onReject });

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
        onClick={(event) => {
          // The input is mounted whenever the zone is, so the ref is set by the time a click lands.
          // A click on the input itself already opens the picker; re-dispatching it would open a
          // second one.
          const input = inputRef.current as HTMLInputElement;
          if (event.target !== input) input.click();
        }}
      >
        <input
          {...inputProps}
          type="file"
          accept={accept}
          multiple={multiple}
          ref={(node) => {
            inputRef.current = node;
            // A caller's ref is a function, an object, or absent; forwarding it by hand is what
            // lets this component keep a ref of its own to the same element.
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          onChange={(event) => {
            const input = event.currentTarget;
            // `files` is `null` only on an input whose type is not `file`.
            addFiles(input.files as FileList);
            // Without the reset, picking the same file again fires no change event.
            input.value = "";
          }}
        />
        <span className="vpg-file-input-prompt">{promptText}</span>
      </div>
    </>
  );
}
