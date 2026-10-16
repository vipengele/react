import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField, type TimeRange, TimeRangeField } from "@vipengele/react-ui";
import { Locale, LocalTime } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/TimeRangeField",
  component: TimeRangeField,
  args: { "aria-label": "Shift", locale: new Locale("en-US") },
  argTypes: {
    onChange: { action: "changed" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "A field for a range of times: a start editor and an end editor inside one field, each segmented like a TimeField. `onChange` fires only when both ends are in and the start is not after the end, or with `undefined` once both are cleared. One empty end is incomplete, and an end before the start is rejected — a range never wraps past midnight. Both stay on screen, flagged invalid, and the ends are never swapped. The arrow keys and typing move across from the start's last segment to the end's first. `startName` and `endName` submit each end as an ISO 8601 time.",
      },
    },
  },
} satisfies Meta<typeof TimeRangeField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 30) } },
};

export const Width: Story = {
  args: { defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 30) }, style: { width: "30rem" } },
  parameters: {
    docs: {
      description: {
        story:
          "The field is as wide as its two times by default. A width set on the group, through `className` or `style`, widens the field to it.",
      },
    },
  },
};

export const NarrowContainer: Story = {
  args: { defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 30) } },
  decorators: [
    (Story) => (
      <div style={{ width: "10rem" }}>
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "In a container narrower than its times the field stops at the container's edge and the editors shrink inside it.",
      },
    },
  },
};

export const TypedEntry: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Type the start and entry moves on to the end. Nothing commits until both ends are in. Leave the field with only one end and it is flagged incomplete; type an end before the start — 10 PM to 2 AM, say — and both ends are flagged, with nothing committed.",
      },
    },
  },
};

export const WithSeconds: Story = {
  args: { seconds: true, defaultValue: { start: LocalTime.of(9, 0, 0), end: LocalTime.of(9, 0, 45) } },
};

export const TwentyFourHourLocale: Story = {
  args: {
    locale: new Locale("de-DE"),
    "aria-label": "Schicht",
    startLabel: "Beginn",
    endLabel: "Ende",
    defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 30) },
  },
};

/** `min` and `max` bound each end, inclusive. An arrow step that would leave the window does
 * nothing, and a typed end outside it is flagged and not committed. */
export const MinMax: Story = {
  args: { min: LocalTime.of(8, 0), max: LocalTime.of(18, 0), defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 0) } },
};

export const CustomLabels: Story = {
  args: { "aria-label": "Opening hours", startLabel: "Opens", endLabel: "Closes" },
  parameters: {
    docs: {
      description: {
        story: 'The editors are named by the field\'s label and their own: here, "Opening hours Opens" and "Opening hours Closes".',
      },
    },
  },
};

export const InFormField: Story = {
  render: (args) => (
    <FormField label="Opening hours" hint="Local time, closing no later than midnight.">
      <TimeRangeField {...args} />
    </FormField>
  ),
  args: { "aria-label": undefined },
};

export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 0) } },
};

export const Reversed: Story = {
  args: { defaultValue: { start: LocalTime.of(22, 0), end: LocalTime.of(2, 0) } },
  parameters: {
    docs: {
      description: {
        story:
          "A value whose end is before its start is shown as it is and both ends are flagged; it never reads as a range past midnight.",
      },
    },
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 0) } },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<TimeRange | undefined>({ start: LocalTime.of(9, 0), end: LocalTime.of(17, 0) });
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
        <TimeRangeField
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
          setSubmitted(`opens=${String(data.get("opens"))}, closes=${String(data.get("closes"))}`);
        }}
      >
        <TimeRangeField {...args} startName="opens" endName="closes" />
        <button type="submit">Submit</button>
        {submitted !== null && <p>Submitted: {submitted}</p>}
      </form>
    );
  },
  args: { defaultValue: { start: LocalTime.of(9, 0), end: LocalTime.of(17, 0) } },
  parameters: {
    docs: {
      description: {
        story:
          "`startName` and `endName` each submit one end of the committed range as ISO 8601, whatever the locale the editors are written in.",
      },
    },
  },
};
