import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { FileInput, type FileInputProps } from "./FileInput.js";
import type { FileUploadContext } from "./useFileUploads.js";

function file(name: string, type = "text/plain", contents = "x"): File {
  return new File([contents], name, { type });
}

function renderFileInput(props: Partial<FileInputProps> = {}) {
  const upload = props.upload ?? vi.fn(() => new Promise<unknown>(() => {}));
  const result = render(<FileInput aria-label="Attachments" upload={upload} {...props} />);
  const input = result.container.querySelector("input") as HTMLInputElement;
  return { ...result, upload, input };
}

interface PendingUpload {
  file: File;
  context: FileUploadContext;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/** An `upload` whose calls stay pending until the test settles them. It ignores the abort signal,
 * the way a careless transport would. */
function controlledUpload() {
  const calls: PendingUpload[] = [];
  const upload = vi.fn(
    (picked: File, context: FileUploadContext) =>
      new Promise<unknown>((resolve, reject) => {
        calls.push({ file: picked, context, resolve, reject });
      }),
  );
  const call = (index: number): PendingUpload => {
    const pending = calls[index];
    if (pending === undefined) throw new Error(`no upload call at index ${index}`);
    return pending;
  };
  return { upload, call };
}

/** Lets pending promise reactions run inside `act`, so the state they set is flushed. */
async function flush() {
  await act(async () => {});
}

describe("FileInput", () => {
  describe("native input", () => {
    it("renders a multiple file input as a direct child of the root", () => {
      const { container, input } = renderFileInput();
      const root = container.firstElementChild as HTMLElement;
      expect(root).toHaveClass("vpg-file-input");
      expect(input.parentElement).toBe(root);
      expect(input).toHaveAttribute("type", "file");
      expect(input).toHaveAttribute("multiple");
    });

    it("drops the multiple attribute when multiple is off", () => {
      const { input } = renderFileInput({ multiple: false });
      expect(input).not.toHaveAttribute("multiple");
    });

    it("sets accept on the native input", () => {
      const { input } = renderFileInput({ accept: "image/*,.pdf" });
      expect(input).toHaveAttribute("accept", "image/*,.pdf");
    });

    it("rejects name, form, required and type at the type level and never renders them", () => {
      const upload = vi.fn(() => new Promise<unknown>(() => {}));
      const { container } = render(
        <>
          {/* @ts-expect-error the input never submits with a form, so it takes no name */}
          <FileInput upload={upload} name="files" />
          {/* @ts-expect-error the input never submits with a form, so it joins none */}
          <FileInput upload={upload} form="upload-form" />
          {/* @ts-expect-error the input never submits with a form, so no form can require it */}
          <FileInput upload={upload} required />
          {/* @ts-expect-error the input is always a file input */}
          <FileInput upload={upload} type="text" />
        </>,
      );
      for (const input of container.querySelectorAll("input")) {
        expect(input).toHaveAttribute("type", "file");
        expect(input).not.toHaveAttribute("name");
        expect(input).not.toHaveAttribute("form");
        expect(input).not.toHaveAttribute("required");
      }
      expect(container.querySelectorAll("input")).toHaveLength(4);
    });

    it("merges a caller className onto the root, not the input", () => {
      const { container, input } = renderFileInput({ className: "mine" });
      expect(container.firstElementChild).toHaveClass("vpg-file-input", "mine");
      expect(input).not.toHaveClass("mine");
    });

    it("spreads the remaining props onto the native input", () => {
      const { input } = renderFileInput({ "data-testid": "picker", disabled: true } as Partial<FileInputProps>);
      expect(input).toHaveAttribute("data-testid", "picker");
      expect(input).toHaveAttribute("aria-label", "Attachments");
      expect(input).toBeDisabled();
    });

    it("hands an object ref the native input, keeps it there across progress ticks and clears it on unmount", () => {
      const { upload, call } = controlledUpload();
      const ref = createRef<HTMLInputElement>();
      const { input, unmount } = renderFileInput({ ref, upload });
      expect(ref.current).toBe(input);

      fireEvent.change(input, { target: { files: [file("a.txt")] } });
      act(() => call(0).context.onProgress(0.5));
      expect(ref.current).toBe(input);

      unmount();
      expect(ref.current).toBeNull();
    });

    it("calls a callback ref once with the native input across progress ticks, and once with null on unmount", () => {
      const { upload, call } = controlledUpload();
      const ref = vi.fn();
      const { input, unmount } = renderFileInput({ ref, upload });

      fireEvent.change(input, { target: { files: [file("a.txt")] } });
      act(() => call(0).context.onProgress(0.25));
      act(() => call(0).context.onProgress(0.5));
      act(() => call(0).context.onProgress(0.75));
      expect(ref.mock.calls).toEqual([[input]]);

      unmount();
      expect(ref.mock.calls).toEqual([[input], [null]]);
    });

    it("clears a swapped-out ref and attaches the new one, calling neither per progress tick", () => {
      const { upload, call } = controlledUpload();
      const first = vi.fn();
      const second = createRef<HTMLInputElement>();
      const { input, rerender, unmount } = renderFileInput({ ref: first, upload });

      fireEvent.change(input, { target: { files: [file("a.txt")] } });
      rerender(<FileInput aria-label="Attachments" upload={upload} ref={second} />);
      expect(first.mock.calls).toEqual([[input], [null]]);
      expect(second.current).toBe(input);

      const third = vi.fn();
      rerender(<FileInput aria-label="Attachments" upload={upload} ref={third} />);
      expect(second.current).toBeNull();
      act(() => call(0).context.onProgress(0.5));
      act(() => call(0).context.onProgress(0.9));
      expect(third.mock.calls).toEqual([[input]]);
      expect(first).toHaveBeenCalledTimes(2);

      unmount();
      expect(third.mock.calls).toEqual([[input], [null]]);
    });

    it("leaves a ref attached to the native input under StrictMode", () => {
      const ref = vi.fn();
      const object = createRef<HTMLInputElement>();
      const upload = vi.fn(() => new Promise<unknown>(() => {}));
      const { container } = render(
        <StrictMode>
          <FileInput aria-label="Callback" upload={upload} ref={ref} />
          <FileInput aria-label="Object" upload={upload} ref={object} />
        </StrictMode>,
      );
      const [callbackInput, objectInput] = container.querySelectorAll("input");
      expect(ref).toHaveBeenLastCalledWith(callbackInput);
      expect(object.current).toBe(objectInput);
    });
  });

  describe("prompt", () => {
    it("asks for files by default", () => {
      renderFileInput();
      expect(screen.getByText("Drop files here, or click to choose")).toHaveClass("vpg-file-input-prompt");
    });

    it("asks for one file when multiple is off", () => {
      renderFileInput({ multiple: false });
      expect(screen.getByText("Drop a file here, or click to choose")).toBeInTheDocument();
    });

    it("renders a caller's prompt in place of the default", () => {
      renderFileInput({ prompt: "Ajoutez des fichiers" });
      expect(screen.getByText("Ajoutez des fichiers")).toBeInTheDocument();
    });
  });

  describe("zone", () => {
    it("is not a label", () => {
      const { container } = renderFileInput();
      expect(container.querySelector("label")).toBeNull();
    });

    it("opens the picker when the zone is clicked", () => {
      const { container, input } = renderFileInput();
      const click = vi.spyOn(input, "click");
      fireEvent.click(screen.getByText("Drop files here, or click to choose"));
      expect(click).toHaveBeenCalledTimes(1);
      fireEvent.click(container.firstElementChild as HTMLElement);
      expect(click).toHaveBeenCalledTimes(2);
    });

    it("does not re-open the picker for a click on the input itself", () => {
      const { input } = renderFileInput();
      const click = vi.spyOn(input, "click");
      fireEvent.click(input);
      expect(click).not.toHaveBeenCalled();
    });
  });

  describe("picking files", () => {
    it("uploads each picked file and resets the input's value", () => {
      const { input, upload } = renderFileInput();
      const first = file("a.txt");
      const second = file("b.txt");
      const setValue = vi.spyOn(input, "value", "set");

      fireEvent.change(input, { target: { files: [first, second] } });

      expect(upload).toHaveBeenCalledTimes(2);
      expect(upload).toHaveBeenNthCalledWith(1, first, expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(upload).toHaveBeenNthCalledWith(2, second, expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(setValue).toHaveBeenLastCalledWith("");
      expect(input.value).toBe("");
    });

    it("reports the added rows through onChange", () => {
      const onChange = vi.fn();
      const { input } = renderFileInput({ onChange });
      const picked = file("a.txt");

      fireEvent.change(input, { target: { files: [picked] } });

      expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ file: picked, status: "uploading" })]);
    });

    it("applies accept, maxSize and maxFiles to a pick and reports the rejections", () => {
      const onReject = vi.fn();
      const { input, upload } = renderFileInput({ accept: ".txt", maxSize: 3, maxFiles: 1, onReject });
      const fits = file("a.txt");
      const wrongType = file("b.png", "image/png");
      const tooBig = file("c.txt", "text/plain", "xxxx");
      const overCount = file("d.txt");

      fireEvent.change(input, { target: { files: [fits, wrongType, tooBig, overCount] } });

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(fits, expect.anything());
      expect(onReject).toHaveBeenCalledWith([
        expect.objectContaining({ file: wrongType, reason: "type" }),
        expect.objectContaining({ file: tooBig, reason: "size" }),
        expect.objectContaining({ file: overCount, reason: "count" }),
      ]);
    });

    it("takes only the first file of a pick when multiple is off", () => {
      const onReject = vi.fn();
      const { input, upload } = renderFileInput({ multiple: false, onReject });
      const first = file("a.txt");
      const second = file("b.txt");

      fireEvent.change(input, { target: { files: [first, second] } });

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(first, expect.anything());
      expect(onReject).toHaveBeenCalledWith([expect.objectContaining({ file: second, reason: "count" })]);
    });
  });

  describe("drag and drop", () => {
    // jsdom has no `DataTransfer`, so the events carry a plain object with the fields the zone
    // reads and writes.
    function transfer(files: File[], types: string[] = ["Files"]) {
      return { files, types, dropEffect: "none" };
    }

    function zoneOf(container: HTMLElement): HTMLElement {
      return container.firstElementChild as HTMLElement;
    }

    it("lights up for a drag that carries files and claims its dragover", () => {
      const { container } = renderFileInput();
      const zone = zoneOf(container);
      const dataTransfer = transfer([file("a.txt")]);

      fireEvent.dragEnter(zone, { dataTransfer });
      expect(zone).toHaveAttribute("data-dragging", "");

      expect(fireEvent.dragOver(zone, { dataTransfer })).toBe(false);
      expect(dataTransfer.dropEffect).toBe("copy");
    });

    it("neither lights up for nor claims a drag that carries no files", () => {
      const { container } = renderFileInput();
      const zone = zoneOf(container);
      const dataTransfer = transfer([], ["text/plain"]);

      fireEvent.dragEnter(zone, { dataTransfer });
      expect(zone).not.toHaveAttribute("data-dragging");
      expect(fireEvent.dragOver(zone, { dataTransfer })).toBe(true);
      expect(dataTransfer.dropEffect).toBe("none");
      fireEvent.dragLeave(zone, { dataTransfer });
      expect(zone).not.toHaveAttribute("data-dragging");
    });

    it("stays lit while the pointer crosses a child and clears once it leaves the zone", () => {
      const { container } = renderFileInput();
      const zone = zoneOf(container);
      const prompt = screen.getByText("Drop files here, or click to choose");
      const dataTransfer = transfer([file("a.txt")]);

      fireEvent.dragEnter(zone, { dataTransfer });
      fireEvent.dragEnter(prompt, { dataTransfer });
      fireEvent.dragLeave(prompt, { dataTransfer });
      expect(zone).toHaveAttribute("data-dragging", "");

      fireEvent.dragLeave(zone, { dataTransfer });
      expect(zone).not.toHaveAttribute("data-dragging");
    });

    it("uploads the dropped files, claims the drop and clears the drag state", () => {
      const onChange = vi.fn();
      const { container, upload } = renderFileInput({ onChange });
      const zone = zoneOf(container);
      const first = file("a.txt");
      const second = file("b.txt");
      const dataTransfer = transfer([first, second]);

      fireEvent.dragEnter(zone, { dataTransfer });
      fireEvent.dragEnter(screen.getByText("Drop files here, or click to choose"), { dataTransfer });
      expect(fireEvent.drop(zone, { dataTransfer })).toBe(false);

      expect(zone).not.toHaveAttribute("data-dragging");
      expect(upload).toHaveBeenCalledTimes(2);
      expect(upload).toHaveBeenNthCalledWith(1, first, expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(upload).toHaveBeenNthCalledWith(2, second, expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(onChange).toHaveBeenLastCalledWith([
        expect.objectContaining({ file: first, status: "uploading" }),
        expect.objectContaining({ file: second, status: "uploading" }),
      ]);

      // The drop reset the depth, so the next drag lights up and clears on a single leave.
      fireEvent.dragEnter(zone, { dataTransfer });
      expect(zone).toHaveAttribute("data-dragging", "");
      fireEvent.dragLeave(zone, { dataTransfer });
      expect(zone).not.toHaveAttribute("data-dragging");
    });

    it("appends a drop to the rows a pick added", () => {
      const onChange = vi.fn();
      const { container, input } = renderFileInput({ onChange });
      const picked = file("a.txt");
      const dropped = file("b.txt");

      fireEvent.change(input, { target: { files: [picked] } });
      fireEvent.drop(zoneOf(container), { dataTransfer: transfer([dropped]) });

      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ file: picked }), expect.objectContaining({ file: dropped })]);
    });

    it("leaves a drop that carries no files to the browser", () => {
      const onChange = vi.fn();
      const { container, upload } = renderFileInput({ onChange });

      expect(fireEvent.drop(zoneOf(container), { dataTransfer: transfer([], ["text/plain"]) })).toBe(true);

      expect(upload).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("is harmless when a file drop carries an empty list", () => {
      const onChange = vi.fn();
      const onReject = vi.fn();
      const { container, upload } = renderFileInput({ onChange, onReject });
      const zone = zoneOf(container);

      fireEvent.drop(zone, { dataTransfer: transfer([]) });

      expect(zone).not.toHaveAttribute("data-dragging");
      expect(upload).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
      expect(onReject).not.toHaveBeenCalled();
    });

    it("does not open the picker on a drop", () => {
      const { container, input } = renderFileInput();
      const click = vi.spyOn(input, "click");

      fireEvent.drop(zoneOf(container), { dataTransfer: transfer([file("a.txt")]) });

      expect(click).not.toHaveBeenCalled();
    });

    it("refuses file drags while disabled: no light, a none drop effect and no upload", () => {
      const onChange = vi.fn();
      const { container, upload } = renderFileInput({ disabled: true, onChange });
      const zone = zoneOf(container);
      const dataTransfer = transfer([file("a.txt")]);

      fireEvent.dragEnter(zone, { dataTransfer });
      expect(zone).not.toHaveAttribute("data-dragging");
      expect(fireEvent.dragOver(zone, { dataTransfer })).toBe(false);
      expect(dataTransfer.dropEffect).toBe("none");
      fireEvent.dragLeave(zone, { dataTransfer });
      expect(zone).not.toHaveAttribute("data-dragging");

      expect(fireEvent.drop(zone, { dataTransfer })).toBe(false);
      expect(upload).not.toHaveBeenCalled();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("takes only the first file of a drop when multiple is off", () => {
      const onReject = vi.fn();
      const { container, upload } = renderFileInput({ multiple: false, onReject });
      const first = file("a.txt");
      const second = file("b.txt");
      const third = file("c.txt");

      fireEvent.drop(zoneOf(container), { dataTransfer: transfer([first, second, third]) });

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(first, expect.anything());
      expect(onReject).toHaveBeenCalledWith([
        expect.objectContaining({ file: second, reason: "count" }),
        expect.objectContaining({ file: third, reason: "count" }),
      ]);
    });

    it("rejects a dropped directory", () => {
      const onReject = vi.fn();
      const { container, upload } = renderFileInput({ onReject });
      const folder = new File([], "photos");

      fireEvent.drop(zoneOf(container), { dataTransfer: transfer([folder]) });

      expect(upload).not.toHaveBeenCalled();
      expect(onReject).toHaveBeenCalledWith([expect.objectContaining({ file: folder, reason: "directory" })]);
    });

    it("applies accept to a drop", () => {
      const onReject = vi.fn();
      const { container, upload } = renderFileInput({ accept: "image/*", onReject });
      const image = file("a.png", "image/png");
      const text = file("b.txt");

      fireEvent.drop(zoneOf(container), { dataTransfer: transfer([image, text]) });

      expect(upload).toHaveBeenCalledTimes(1);
      expect(upload).toHaveBeenCalledWith(image, expect.anything());
      expect(onReject).toHaveBeenCalledWith([expect.objectContaining({ file: text, reason: "type" })]);
    });
  });

  describe("rows", () => {
    function pick(input: HTMLInputElement, files: File[]) {
      fireEvent.change(input, { target: { files } });
    }

    function rowOf(name: string): HTMLElement {
      return screen.getByText(name).closest("li") as HTMLElement;
    }

    function announcer(): HTMLElement {
      return screen.getByRole("status");
    }

    it("renders no list until a file is added", () => {
      renderFileInput();
      expect(screen.queryByRole("list")).toBeNull();
    });

    it("renders one list item per row, the same file twice included", () => {
      const { input } = renderFileInput();
      const same = file("a.txt");

      pick(input, [same]);
      pick(input, [same, file("b.txt")]);

      const list = screen.getByRole("list");
      expect(list).toHaveClass("vpg-file-input-list");
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(3);
      expect(items.map((item) => item.querySelector(".vpg-file-input-name")?.textContent)).toEqual(["a.txt", "a.txt", "b.txt"]);
      for (const item of items) expect(item).toHaveClass("vpg-file-input-row");
    });

    it("shows an uploading row with an indeterminate progress bar named after the file", () => {
      const { input } = renderFileInput();
      pick(input, [file("a.txt")]);

      const row = rowOf("a.txt");
      expect(row).toHaveAttribute("data-status", "uploading");
      expect(within(row).getByText("Uploading")).toHaveClass("vpg-file-input-status");
      const bar = within(row).getByRole("progressbar", { name: "a.txt" });
      expect(bar).not.toHaveAttribute("aria-valuenow");
    });

    it("turns the progress bar determinate once the upload reports progress", async () => {
      const { upload, call } = controlledUpload();
      const { input } = renderFileInput({ upload });
      pick(input, [file("a.txt")]);

      act(() => call(0).context.onProgress(0.4));
      await flush();

      const bar = screen.getByRole("progressbar", { name: "a.txt" });
      expect(bar).toHaveAttribute("aria-valuenow", "40");
      expect(bar).toHaveAttribute("aria-valuemax", "100");
    });

    it("shows a done row with full progress and its status in text", async () => {
      const { upload, call } = controlledUpload();
      const { input } = renderFileInput({ upload });
      pick(input, [file("a.txt")]);

      call(0).resolve("ok");
      await flush();

      const row = rowOf("a.txt");
      expect(row).toHaveAttribute("data-status", "done");
      expect(within(row).getByText("Uploaded")).toBeInTheDocument();
      expect(within(row).getByRole("progressbar", { name: "a.txt" })).toHaveAttribute("aria-valuenow", "100");
    });

    it("shows a failed row with the error message and no progress bar", async () => {
      const { upload, call } = controlledUpload();
      const { input } = renderFileInput({ upload });
      pick(input, [file("a.txt")]);

      call(0).reject(new Error("Network down"));
      await flush();

      const row = rowOf("a.txt");
      expect(row).toHaveAttribute("data-status", "failed");
      expect(within(row).getByText("Upload failed: Network down")).toBeInTheDocument();
      expect(within(row).queryByRole("progressbar")).toBeNull();
    });

    it("shows each rejection reason as text, with no progress bar", () => {
      const { input, container } = renderFileInput({ accept: ".txt", maxSize: 3, maxFiles: 1 });

      pick(input, [file("ok.txt"), file("b.png", "image/png"), file("c.txt", "text/plain", "xxxx"), file("d.txt")]);
      fireEvent.drop(container.firstElementChild as HTMLElement, {
        dataTransfer: { files: [new File([], "photos")], types: ["Files"] },
      });

      expect(within(rowOf("b.png")).getByText("File type not accepted")).toBeInTheDocument();
      expect(within(rowOf("c.txt")).getByText("File is too large")).toBeInTheDocument();
      expect(within(rowOf("d.txt")).getByText("Too many files")).toBeInTheDocument();
      expect(within(rowOf("photos")).getByText("Folders cannot be uploaded")).toBeInTheDocument();
      for (const name of ["b.png", "c.txt", "d.txt", "photos"]) {
        expect(rowOf(name)).toHaveAttribute("data-status", "rejected");
        expect(within(rowOf(name)).queryByRole("progressbar")).toBeNull();
      }
    });

    it("renders a caller's strings in place of the defaults", async () => {
      const { upload, call } = controlledUpload();
      const { input } = renderFileInput({
        upload,
        accept: ".txt",
        removeLabel: (name) => `Retirer ${name}`,
        uploadingMessage: "Envoi",
        doneMessage: "Envoyé",
        failedMessage: (error) => `Échec : ${error}`,
        rejectionMessages: { type: "Type refusé" },
        doneAnnouncement: (name) => `${name} envoyé`,
        failedAnnouncement: (name, error) => `${name} en échec : ${error}`,
      });

      pick(input, [file("a.txt"), file("b.txt"), file("c.txt"), file("d.png", "image/png")]);
      expect(within(rowOf("a.txt")).getByText("Envoi")).toBeInTheDocument();
      expect(within(rowOf("d.png")).getByText("Type refusé")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Retirer a.txt" })).toBeInTheDocument();

      call(0).resolve(undefined);
      call(1).reject("boom");
      await flush();

      expect(within(rowOf("a.txt")).getByText("Envoyé")).toBeInTheDocument();
      expect(within(rowOf("b.txt")).getByText("Échec : boom")).toBeInTheDocument();
      expect(announcer()).toHaveTextContent("a.txt envoyé");
      expect(announcer()).toHaveTextContent("b.txt en échec : boom");
    });

    it("keeps the default for a rejection reason a caller leaves out", () => {
      const { input } = renderFileInput({ maxSize: 1, rejectionMessages: { type: "Type refusé" } });
      pick(input, [file("big.txt", "text/plain", "xx")]);
      expect(within(rowOf("big.txt")).getByText("File is too large")).toBeInTheDocument();
    });
  });

  describe("remove button", () => {
    function pick(input: HTMLInputElement, files: File[]) {
      fireEvent.change(input, { target: { files } });
    }

    it("is a named button that removes its row and leaves focus on the input", () => {
      const onChange = vi.fn();
      const { input } = renderFileInput({ onChange });
      pick(input, [file("a.txt"), file("b.txt")]);

      const remove = screen.getByRole("button", { name: "Remove a.txt" });
      expect(remove).toHaveAttribute("type", "button");
      fireEvent.click(remove);

      expect(screen.queryByText("a.txt")).toBeNull();
      expect(screen.getByText("b.txt")).toBeInTheDocument();
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ status: "uploading" })]);
      expect(input).toHaveFocus();
    });

    it("removes the list once the last row is removed", () => {
      const { input } = renderFileInput();
      pick(input, [file("a.txt")]);
      fireEvent.click(screen.getByRole("button", { name: "Remove a.txt" }));
      expect(screen.queryByRole("list")).toBeNull();
    });

    it("aborts the signal of an in-flight upload", () => {
      const { upload, call } = controlledUpload();
      const { input } = renderFileInput({ upload });
      pick(input, [file("a.txt")]);
      const { signal } = call(0).context;

      fireEvent.click(screen.getByRole("button", { name: "Remove a.txt" }));

      expect(signal.aborted).toBe(true);
    });

    it("does not open the picker, nor does a click elsewhere in a row", () => {
      const { input } = renderFileInput();
      pick(input, [file("a.txt"), file("b.txt")]);
      const click = vi.spyOn(input, "click");

      fireEvent.click(screen.getByText("b.txt"));
      fireEvent.click(screen.getByRole("list"));
      fireEvent.click(screen.getByRole("button", { name: "Remove a.txt" }));

      expect(click).not.toHaveBeenCalled();
      // The zone outside the list still opens it.
      fireEvent.click(screen.getByText("Drop files here, or click to choose"));
      expect(click).toHaveBeenCalledTimes(1);
    });

    it("drops a late settlement for a removed row: no row comes back and nothing is announced", async () => {
      const { upload, call } = controlledUpload();
      const onChange = vi.fn();
      const { input } = renderFileInput({ upload, onChange });
      pick(input, [file("a.txt")]);
      fireEvent.click(screen.getByRole("button", { name: "Remove a.txt" }));
      onChange.mockClear();

      call(0).resolve("late");
      await flush();

      expect(screen.queryByText("a.txt")).toBeNull();
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
      expect(onChange).not.toHaveBeenCalled();
    });

    it("is disabled while the component is disabled", () => {
      const { upload, call } = controlledUpload();
      const { input, rerender } = renderFileInput({ upload });
      pick(input, [file("a.txt")]);
      rerender(<FileInput aria-label="Attachments" upload={upload} disabled />);

      const remove = screen.getByRole("button", { name: "Remove a.txt" });
      expect(remove).toBeDisabled();
      fireEvent.click(remove);
      expect(screen.getByText("a.txt")).toBeInTheDocument();
      expect(call(0).context.signal.aborted).toBe(false);
    });
  });

  describe("unmount", () => {
    it("aborts the signal of every in-flight upload, and not of a settled one", async () => {
      const { upload, call } = controlledUpload();
      const { input, unmount } = renderFileInput({ upload });
      fireEvent.change(input, { target: { files: [file("a.txt"), file("b.txt")] } });
      call(1).resolve("ok");
      await flush();

      unmount();

      expect(call(0).context.signal.aborted).toBe(true);
      expect(call(1).context.signal.aborted).toBe(false);
    });

    it("drops a late settlement and progress tick after unmount: no onChange and no React warning", async () => {
      const { upload, call } = controlledUpload();
      const onChange = vi.fn();
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
      try {
        const { input, unmount } = renderFileInput({ upload, onChange });
        fireEvent.change(input, { target: { files: [file("a.txt"), file("b.txt")] } });
        unmount();
        onChange.mockClear();

        call(0).context.onProgress(0.5);
        call(0).resolve("late");
        call(1).reject(new Error("late"));
        await flush();

        expect(onChange).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
      } finally {
        consoleError.mockRestore();
      }
    });
  });

  describe("drop on a row", () => {
    it("bubbles to the zone and adds the files", () => {
      const { input, upload } = renderFileInput();
      fireEvent.change(input, { target: { files: [file("a.txt")] } });
      const dropped = file("b.txt");

      fireEvent.drop(screen.getByText("a.txt"), { dataTransfer: { files: [dropped], types: ["Files"], dropEffect: "none" } });

      expect(upload).toHaveBeenLastCalledWith(dropped, expect.anything());
      expect(screen.getByText("b.txt")).toBeInTheDocument();
    });
  });

  describe("live region", () => {
    function pick(input: HTMLInputElement, files: File[]) {
      fireEvent.change(input, { target: { files } });
    }

    it("is a polite, non-atomic status region inside the root, not a direct-child input", () => {
      const { container } = renderFileInput();
      const region = screen.getByRole("status");
      expect(region).toHaveClass("vpg-file-input-announcer");
      expect(region).toHaveAttribute("aria-atomic", "false");
      expect(region.parentElement).toBe(container.firstElementChild);
      expect(region).toBeEmptyDOMElement();
    });

    it("announces a done and a failed upload once each, and nothing on add, progress, rejection or removal", async () => {
      const { upload, call } = controlledUpload();
      const { input } = renderFileInput({ upload, accept: ".txt" });
      const region = screen.getByRole("status");

      pick(input, [file("a.txt"), file("b.txt"), file("c.png", "image/png")]);
      act(() => call(0).context.onProgress(0.5));
      await flush();
      expect(region).toBeEmptyDOMElement();

      call(0).resolve("ok");
      await flush();
      expect(Array.from(region.children, (child) => child.textContent)).toEqual(["a.txt uploaded"]);

      call(1).reject(new Error("Server said no"));
      await flush();
      expect(Array.from(region.children, (child) => child.textContent)).toEqual([
        "a.txt uploaded",
        "b.txt failed to upload: Server said no",
      ]);

      fireEvent.click(screen.getByRole("button", { name: "Remove c.png" }));
      expect(region.children).toHaveLength(2);
    });

    it("adds each announcement once under StrictMode", async () => {
      const { upload, call } = controlledUpload();
      const { container } = render(
        <StrictMode>
          <FileInput aria-label="Attachments" upload={upload} />
        </StrictMode>,
      );
      pick(container.querySelector("input") as HTMLInputElement, [file("a.txt")]);

      call(0).resolve("ok");
      await flush();

      expect(Array.from(screen.getByRole("status").children, (child) => child.textContent)).toEqual(["a.txt uploaded"]);
    });
  });

  describe("inside FormField", () => {
    it("lands the cloned id and aria-labelledby on the native input, naming it", () => {
      const upload = vi.fn(() => new Promise<unknown>(() => {}));
      const { container } = render(
        <FormField label="Attachments">
          <FileInput upload={upload} />
        </FormField>,
      );
      const input = container.querySelector("input") as HTMLInputElement;
      const label = screen.getByText("Attachments");

      expect(input.id).toBeTruthy();
      expect(label).toHaveAttribute("for", input.id);
      expect(input).toHaveAttribute("aria-labelledby", label.id);
      expect(input).toHaveAccessibleName("Attachments");
      expect(input.parentElement).not.toHaveAttribute("id");
      expect(input.parentElement).not.toHaveAttribute("aria-labelledby");
    });

    it("lands the cloned aria-describedby and aria-invalid on the native input", () => {
      const upload = vi.fn(() => new Promise<unknown>(() => {}));
      const { container } = render(
        <FormField label="Attachments" hint="PDF only" error="Add at least one file">
          <FileInput upload={upload} />
        </FormField>,
      );
      const input = container.querySelector("input") as HTMLInputElement;

      expect(input).toHaveAttribute("aria-invalid", "true");
      expect(input).toHaveAccessibleDescription("PDF only Add at least one file");
      expect(input.parentElement).not.toHaveAttribute("aria-describedby");
      expect(input.parentElement).not.toHaveAttribute("aria-invalid");
    });
  });

  it("injects its stylesheet under the vpg-file-input href", () => {
    renderFileInput();
    // React hoists the style into `<head>` and rewrites `href`/`precedence` to
    // `data-href`/`data-precedence`, keyed on `href` for de-duplication.
    const style = document.head.querySelector('style[data-href="vpg-file-input"]');
    expect(style).toHaveAttribute("data-precedence", "vpg-file-input");
    expect(style?.textContent).toContain(".vpg-file-input {");
    expect(style?.textContent).toContain(".vpg-file-input:has(> input:focus-visible)");
  });
});
