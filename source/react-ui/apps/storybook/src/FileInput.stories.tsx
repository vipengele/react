import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileInput, type FileInputProps, FormField } from "@vipengele/react-ui";
import { useState } from "react";

type Upload = FileInputProps["upload"];

/**
 * Settles after `duration` milliseconds, reporting `steps` evenly spaced progress ticks on the way.
 * Aborting clears the timer and rejects, as a real transport's cancelled request does.
 */
function simulateUpload(duration: number, { steps = 0, fail = false } = {}): Upload {
  return (file, { onProgress, signal }) =>
    new Promise((resolve, reject) => {
      let tick = 0;
      const timer = setInterval(
        () => {
          tick += 1;
          if (tick <= steps) {
            onProgress(tick / (steps + 1));
            return;
          }
          clearInterval(timer);
          if (fail) reject(new Error("The server closed the connection."));
          else resolve({ name: file.name });
        },
        duration / (steps + 1),
      );
      signal.addEventListener("abort", () => {
        clearInterval(timer);
        reject(signal.reason);
      });
    });
}

const meta = {
  title: "Components/FileInput",
  component: FileInput,
  args: {
    upload: simulateUpload(2000),
  },
} satisfies Meta<typeof FileInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = {
  args: {
    maxFiles: 3,
    upload: simulateUpload(1500, { steps: 3 }),
  },
};

export const SingleFile: Story = {
  name: "Single file",
  args: {
    multiple: false,
    upload: simulateUpload(1500, { steps: 3 }),
  },
};

export const Progress: Story = {
  args: {
    upload: simulateUpload(4000, { steps: 39 }),
  },
};

export const Failure: Story = {
  args: {
    upload: simulateUpload(1500, { fail: true }),
  },
};

function RejectionDemo(props: FileInputProps) {
  const [rejectedNames, setRejectedNames] = useState<string[]>([]);
  return (
    <>
      <FileInput
        {...props}
        onReject={(rejected) => {
          setRejectedNames(rejected.map((entry) => entry.file.name));
        }}
      />
      <p>Last rejected: {rejectedNames.length > 0 ? rejectedNames.join(", ") : "none"}</p>
    </>
  );
}

export const Rejection: Story = {
  args: {
    accept: "image/*",
    maxSize: 100 * 1024,
    maxFiles: 2,
    upload: simulateUpload(1500, { steps: 3 }),
  },
  render: (args) => <RejectionDemo {...args} />,
};

export const InsideFormField: Story = {
  name: "Inside FormField",
  render: (args) => (
    <FormField label="Attachments" hint="Images only, up to 5 MB each.">
      <FileInput {...args} accept="image/*" maxSize={5 * 1024 * 1024} />
    </FormField>
  ),
};

export const InsideFormFieldWithError: Story = {
  name: "Inside FormField with error",
  render: (args) => (
    <FormField label="Attachments" error="Attach at least one file.">
      <FileInput {...args} />
    </FormField>
  ),
};
