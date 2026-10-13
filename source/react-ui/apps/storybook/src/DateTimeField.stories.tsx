import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateTimeField, FormField } from "@vipengele/react-ui";
import { Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { useState } from "react";

const at = (year: number, month: number, day: number, hour: number, minute: number, second = 0) =>
  LocalDateTime.of(LocalDate.of(year, month, day), LocalTime.of(hour, minute, second));

const meta = {
  title: "Components/DateTimeField",
  component: DateTimeField,
  args: { "aria-label": "Starts at", locale: new Locale("en-US") },
  argTypes: {
    onChange: { action: "changed" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A date field and a time field side by side, editing one local date-time. `onChange` fires once both halves are committed, and with `undefined` once either half of a complete value is emptied. One half filled reports nothing.",
      },
    },
  },
} satisfies Meta<typeof DateTimeField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: at(2030, 6, 20, 14, 30) },
};

export const Empty: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Fill only one half and tab out of the field: the halves are flagged `aria-invalid` and nothing is reported until the other half is filled.",
      },
    },
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<LocalDateTime | undefined>(at(2030, 6, 20, 9, 5));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
        <DateTimeField
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange?.(next);
          }}
        />
        <code>{`value: ${value?.toString() ?? "undefined"}`}</code>
      </div>
    );
  },
};

export const MinMax: Story = {
  render: (args) => {
    const [value, setValue] = useState<LocalDateTime | undefined>(at(2030, 6, 11, 12, 0));
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
        <DateTimeField
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange?.(next);
          }}
        />
        <code>{`value: ${value?.toString() ?? "undefined"}`}</code>
      </div>
    );
  },
  args: { min: at(2030, 6, 10, 9, 0), max: at(2030, 6, 12, 17, 30) },
  parameters: {
    docs: {
      description: {
        story:
          "The window runs from 10 June 09:00 to 12 June 17:30. The date half takes the two dates; the time half takes 09:00 only on 10 June and 17:30 only on 12 June, so any time is fine on 11 June. A date-time outside the window is not reported and both halves are flagged invalid.",
      },
    },
  },
};

export const WithSeconds: Story = {
  args: { seconds: true, defaultValue: at(2030, 6, 20, 14, 30, 15) },
};

export const GermanLocaleProp: Story = {
  args: { locale: new Locale("de-DE"), defaultValue: at(2030, 6, 20, 14, 30), dateLabel: "Datum", timeLabel: "Uhrzeit" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: at(2030, 6, 20, 14, 30) },
};

export const InFormField: Story = {
  render: (args) => (
    <FormField label="Starts at" hint="Local time.">
      <DateTimeField {...args} aria-label={undefined} />
    </FormField>
  ),
};

export const InForm: Story = {
  render: (args) => {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(String(new FormData(event.currentTarget).get("starts")));
        }}
      >
        <DateTimeField {...args} name="starts" />
        <button type="submit">Submit</button>
        {submitted !== null && <p>Submitted: {submitted}</p>}
      </form>
    );
  },
  args: { defaultValue: at(2030, 6, 20, 14, 30) },
  parameters: {
    docs: {
      description: {
        story: "The form submits the committed date-time as ISO 8601 under `name`, whatever the locale the halves are written in.",
      },
    },
  },
};
