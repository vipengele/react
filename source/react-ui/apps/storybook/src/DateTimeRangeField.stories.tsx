import type { Meta, StoryObj } from "@storybook/react-vite";
import { type DateTimeRange, DateTimeRangeField, FormField } from "@vipengele/react-ui";
import { Locale, LocalDate, LocalDateTime } from "@vipengele/ts";
import { useState } from "react";

const at = (day: number, hour: number, minute: number) => LocalDateTime.ofFields(2030, 6, day, hour, minute);

const meta = {
  title: "Components/DateTimeRangeField",
  component: DateTimeRangeField,
  args: { "aria-label": "Shift", locale: new Locale("en-US"), today: LocalDate.of(2030, 6, 12) },
  argTypes: {
    onChange: { action: "changed" },
    onOpenChange: { action: "open changed" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A field for a range of date-times: a start editor and an end editor inside one field, each typed like a DateTimeField. `onChange` fires only when both ends are in and the start is not after the end, or with `undefined` once both are cleared. One empty end is incomplete, and an end before the start — a same-day end time before the start time included — is rejected: both stay on screen, flagged invalid, and the ends are never swapped. A button opens a RangeCalendar, a time panel for each end and a Done button; nothing commits until both days and both times are in place and in order. `startName` and `endName` submit each end as an ISO 8601 date-time.",
      },
    },
  },
} satisfies Meta<typeof DateTimeRangeField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Open the calendar and pick two days: each editor shows its day alone and nothing is reported while the time panels wait. Pick a start time and an end time and the range commits. Tab out with a part still missing and the field is flagged `aria-invalid`.",
      },
    },
  },
};

export const WithValue: Story = {
  args: { defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) } },
};

export const Width: Story = {
  args: { defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) }, style: { width: "40rem" } },
  parameters: {
    docs: {
      description: {
        story:
          "The field is as wide as its two values by default. A width set on the group, through `className` or `style`, widens the field to it, and the two editors share the room beyond their text.",
      },
    },
  },
};

export const NarrowContainer: Story = {
  args: { defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) } },
  decorators: [
    (Story) => (
      <div style={{ width: "12rem" }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "In a container narrower than its values the field stops at the container's edge and the editors shrink inside it.",
      },
    },
  },
};

export const TypedEntry: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Type the start, Tab, type the end. Nothing commits until both ends are in. Type an end on the start's day but at an earlier time and both ends are flagged, with nothing committed.",
      },
    },
  },
};

export const OpenPopUp: Story = {
  args: { defaultOpen: true, defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) } },
  parameters: {
    docs: {
      description: {
        story:
          "The first pick puts its day in the start editor at the start's time and empties the end; the second puts the end's day at the end's time. A pick that leaves both days and both times in order commits. Done closes the pop-up and focuses the end editor; Escape and an outside press close it with focus back on the button.",
      },
    },
  },
};

export const Bounded: Story = {
  render: (args) => {
    const [value, setValue] = useState<DateTimeRange | undefined>({ start: at(10, 10, 0), end: at(11, 12, 0) });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
        <DateTimeRangeField
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
  args: { min: at(10, 9, 0), max: at(12, 17, 30) },
  parameters: {
    docs: {
      description: {
        story:
          "Either end must lie between 10 June 09:00 and 12 June 17:30. The calendar takes the two dates; each time panel disables times before 09:00 only on 10 June and after 17:30 only on 12 June.",
      },
    },
  },
};

export const DisabledDates: Story = {
  args: { isDateDisabled: (date) => date.dayOfWeek >= 6, defaultValue: { start: at(17, 9, 0), end: at(21, 17, 0) } },
  parameters: {
    docs: {
      description: {
        story: "Weekends cannot be an end of the range, typed or picked, but a range may run across them.",
      },
    },
  },
};

export const CustomLabels: Story = {
  args: {
    "aria-label": "Booking",
    startLabel: "Check-in",
    endLabel: "Check-out",
    startTimeLabel: "Check-in time",
    endTimeLabel: "Check-out time",
    openCalendarLabel: "Choose stay",
  },
};

export const InFormField: Story = {
  render: (args) => (
    <FormField label="Shift" hint="Local time.">
      <DateTimeRangeField {...args} />
    </FormField>
  ),
  args: { "aria-label": undefined },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) } },
};

export const ReversedTimes: Story = {
  args: { defaultValue: { start: at(14, 17, 0), end: at(14, 9, 0) } },
  parameters: {
    docs: {
      description: {
        story: "A range whose end time is before its start time on the same day is flagged at both ends, never swapped.",
      },
    },
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) } },
};

export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) } },
};

export const GermanLocale: Story = {
  args: {
    locale: new Locale("de-DE"),
    defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) },
    startLabel: "Beginn",
    endLabel: "Ende",
    startTimeLabel: "Beginnzeit",
    endTimeLabel: "Endzeit",
    clearLabel: "Löschen",
    openCalendarLabel: "Zeitraum wählen",
    doneLabel: "Fertig",
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<DateTimeRange | undefined>({ start: at(14, 9, 0), end: at(21, 17, 30) });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
        <DateTimeRangeField
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
        <DateTimeRangeField {...args} startName="from" endName="to" />
        <button type="submit">Submit</button>
        {submitted !== null && <p>Submitted: {submitted}</p>}
      </form>
    );
  },
  args: { defaultValue: { start: at(14, 9, 0), end: at(21, 17, 30) } },
  parameters: {
    docs: {
      description: {
        story:
          "`startName` and `endName` each submit one end of the committed range as ISO 8601, whatever the locale the editors are written in.",
      },
    },
  },
};
