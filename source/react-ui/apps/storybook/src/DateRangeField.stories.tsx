import type { Meta, StoryObj } from "@storybook/react-vite";
import { type DateRange, DateRangeField, FormField } from "@vipengele/react-ui";
import { Locale, LocalDate } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/DateRangeField",
  component: DateRangeField,
  args: { "aria-label": "Stay", today: LocalDate.of(2030, 6, 12) },
  argTypes: {
    onChange: { action: "changed" },
    onOpenChange: { action: "open changed" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A field for a range of dates: a start editor and an end editor inside one field, each typed like a DateField. `onChange` fires only when both ends are in and the start is not after the end, or with `undefined` once both are cleared. One empty end is incomplete, and an end before the start is rejected — both stay on screen, flagged invalid, and the ends are never swapped. A button opens a RangeCalendar: the first pick fills the start, the second completes the range and focuses the end editor. `startName` and `endName` submit each end as an ISO 8601 date.",
      },
    },
  },
} satisfies Meta<typeof DateRangeField>;

export default meta;

type Story = StoryObj<typeof meta>;

const june = (day: number) => LocalDate.of(2030, 6, day);

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: { start: june(14), end: june(21) } },
};

export const TypedEntry: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Type the start, Tab, type the end. Nothing commits until both ends are in. Leave the field with only one end and it is flagged incomplete; type an end before the start and both ends are flagged, with nothing committed. ArrowUp and ArrowDown step the segment under the caret.",
      },
    },
  },
};

export const MinMax: Story = {
  args: { min: june(5), max: LocalDate.of(2030, 7, 20), defaultValue: { start: june(14), end: june(21) } },
  parameters: {
    docs: {
      description: {
        story:
          "Either end outside `min` and `max` is not committed: the editor at fault is flagged, and the calendar refuses the day as an end.",
      },
    },
  },
};

export const DisabledDates: Story = {
  args: { isDateDisabled: (date) => date.dayOfWeek >= 6, defaultValue: { start: june(17), end: june(21) } },
  parameters: {
    docs: {
      description: {
        story: "Weekends cannot be an end of the range, typed or picked, but a range may run across them.",
      },
    },
  },
};

export const OpenCalendar: Story = {
  args: { defaultOpen: true, defaultValue: { start: june(14), end: june(21) } },
  parameters: {
    docs: {
      description: {
        story:
          "The first pick fills the start editor and keeps the calendar open; the second commits the range, closes the calendar and focuses the end editor. Escape and an outside press close it with focus back on the button.",
      },
    },
  },
};

export const CustomLabels: Story = {
  args: { "aria-label": "Booking", startLabel: "Check-in", endLabel: "Check-out", openCalendarLabel: "Choose stay" },
  parameters: {
    docs: {
      description: {
        story: 'The editors are named by the field\'s label and their own: here, "Booking Check-in" and "Booking Check-out".',
      },
    },
  },
};

export const InFormField: Story = {
  render: (args) => (
    <FormField label="Holiday" hint="Weekdays only, as the ends of the range.">
      <DateRangeField {...args} />
    </FormField>
  ),
  args: { "aria-label": undefined, isDateDisabled: (date) => date.dayOfWeek >= 6 },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: { start: june(14), end: june(21) } },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: { start: june(14), end: june(21) } },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: { start: june(14), end: june(21) } },
};

export const GermanLocale: Story = {
  args: {
    locale: new Locale("de-DE"),
    defaultValue: { start: june(14), end: june(21) },
    startLabel: "Beginn",
    endLabel: "Ende",
    clearLabel: "Löschen",
    openCalendarLabel: "Zeitraum wählen",
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<DateRange | undefined>({ start: june(14), end: june(21) });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
        <DateRangeField
          {...args}
          value={value}
          onChange={(next) => {
            setValue(next);
            args.onChange?.(next);
          }}
        />
        <code>{`value: ${value === undefined ? "undefined" : `${value.start.toString()} – ${value.end.toString()}`}`}</code>
      </div>
    );
  },
};

export const InForm: Story = {
  render: (args) => {
    const [submitted, setSubmitted] = useState<string | null>(null);
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setSubmitted(`from=${String(data.get("from"))}, to=${String(data.get("to"))}`);
        }}
      >
        <DateRangeField {...args} startName="from" endName="to" />
        <button type="submit">Submit</button>
        {submitted !== null && <p>Submitted: {submitted}</p>}
      </form>
    );
  },
  args: { defaultValue: { start: june(14), end: june(21) } },
  parameters: {
    docs: {
      description: {
        story:
          "`startName` and `endName` each submit one end of the committed range as ISO 8601, whatever the locale the editors are written in.",
      },
    },
  },
};
