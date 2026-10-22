import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateTimeField, FormField } from "@vipengele/react-ui";
import { Locale, LocalDate, LocalDateTime, LocalTime } from "@vipengele/ts";
import { useState } from "react";

const at = (year: number, month: number, day: number, hour: number, minute: number) =>
  LocalDateTime.of(LocalDate.of(year, month, day), LocalTime.of(hour, minute));

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
          "One text input that writes a date and a time in the locale's own layout, with a calendar button that opens a calendar, a time panel and a Done button. `onChange` fires on commit: blur, Enter, a pick naming a whole date-time, or clear. A day picked with no time to go with it commits nothing. Typing matches DateField and TimeField: separators are appended, completed time segments are zero-padded and the day period is completed. ArrowUp and ArrowDown step the segment under the caret, the date half like DateField and the time half like TimeField, and commit at once; a step outside `min` and `max` is refused.",
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
          "Open the calendar and pick a day: the box shows it, nothing is reported and the time panel waits for a time. Tab out of the field with only the day picked and it is flagged `aria-invalid`.",
      },
    },
  },
};

export const TwelveHour: Story = {
  args: { defaultValue: at(2030, 6, 20, 21, 5) },
  parameters: {
    docs: {
      description: {
        story:
          "`en-US` writes a 12-hour clock with a day period, so the time panel has an AM/PM strip. Typing `a` or `p` after the time completes the day period.",
      },
    },
  },
};

export const TwentyFourHour: Story = {
  args: { locale: new Locale("en-GB"), defaultValue: at(2030, 6, 20, 21, 5) },
  parameters: {
    docs: {
      description: {
        story: "`en-GB` writes day first on a 24-hour clock, so the text is `20/06/2030 21:05` and the panel has no AM/PM strip.",
      },
    },
  },
};

export const German: Story = {
  args: { locale: new Locale("de-DE"), defaultValue: at(2030, 6, 20, 14, 30) },
  parameters: {
    docs: {
      description: {
        story: "`de-DE` writes `20.06.2030 14:30`; the placeholder and the `aria-description` follow the same order.",
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

export const Bounds: Story = {
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
          "The window runs from 10 June 09:00 to 12 June 17:30. The calendar takes the two dates; the time panel disables times before 09:00 only on 10 June and after 17:30 only on 12 June. Typed text outside the window is not reported and is flagged invalid.",
      },
    },
  },
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
        story: "The form submits the committed date-time as ISO 8601 under `name`, whatever the locale the text is written in.",
      },
    },
  },
};
