import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { FormField } from "../FormField/FormField.js";
import { FileInput, type FileInputProps } from "./FileInput.js";

function file(name: string, type = "text/plain", contents = "x"): File {
  return new File([contents], name, { type });
}

function renderFileInput(props: Partial<FileInputProps> = {}) {
  const upload = props.upload ?? vi.fn(() => new Promise<unknown>(() => {}));
  const result = render(<FileInput aria-label="Attachments" upload={upload} {...props} />);
  const input = result.container.querySelector("input") as HTMLInputElement;
  return { ...result, upload, input };
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

    it("hands an object ref the native input", () => {
      const ref = createRef<HTMLInputElement>();
      const { input } = renderFileInput({ ref });
      expect(ref.current).toBe(input);
    });

    it("hands a callback ref the native input", () => {
      const ref = vi.fn();
      const { input } = renderFileInput({ ref });
      expect(ref).toHaveBeenCalledWith(input);
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
