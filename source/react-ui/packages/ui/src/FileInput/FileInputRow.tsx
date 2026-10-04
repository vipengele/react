import { X } from "@vipengele/react-icons";
import { Progress } from "../Progress/Progress.js";
import type { FileRejectionReason } from "./acceptFile.js";
import type { FileInputProps } from "./FileInput.js";
import type { FileUploadEntry } from "./useFileUploads.js";

const defaultRejectionMessages: Record<FileRejectionReason, string> = {
  type: "File type not accepted",
  size: "File is too large",
  count: "Too many files",
  directory: "Folders cannot be uploaded",
};

interface FileInputRowProps
  extends Pick<FileInputProps, "disabled" | "removeLabel" | "uploadingMessage" | "doneMessage" | "failedMessage" | "rejectionMessages"> {
  entry: FileUploadEntry;
  /** Called with the row's id when its remove button is clicked. */
  onRemove: (id: string) => void;
}

/**
 * One row of a `FileInput`'s list: the file's name, its status in text, a `Progress` named after
 * the file while it uploads or once it is done, and a remove button.
 */
export function FileInputRow({
  entry,
  onRemove,
  disabled,
  removeLabel = (fileName) => `Remove ${fileName}`,
  uploadingMessage = "Uploading",
  doneMessage = "Uploaded",
  failedMessage = (error) => `Upload failed: ${error}`,
  rejectionMessages,
}: FileInputRowProps) {
  const name = entry.file.name;
  let status: string;
  if (entry.status === "uploading") status = uploadingMessage;
  else if (entry.status === "done") status = doneMessage;
  else if (entry.status === "failed") status = failedMessage(entry.error);
  else status = rejectionMessages?.[entry.reason] ?? defaultRejectionMessages[entry.reason];
  return (
    <li className="vpg-file-input-row" data-status={entry.status}>
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
        onClick={() => onRemove(entry.id)}
      >
        <X className="vpg-file-input-remove-icon" aria-hidden="true" />
      </button>
    </li>
  );
}
