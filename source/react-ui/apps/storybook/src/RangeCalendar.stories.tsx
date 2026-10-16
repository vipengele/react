import type { Meta, StoryObj } from "@storybook/react-vite";
import { type DateRange, RangeCalendar } from "@vipengele/react-ui";
import { LocalDate } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/RangeCalendar",
  component: RangeCalendar,
  parameters: {
    docs: {
      description: {
        component:
          "A month grid for picking a range of days. The first pick anchors and the second completes the range; a second pick before the anchor swaps the two, and picking the anchor again makes a one-day range. While an anchor is pending, the span to the hovered or focused day is previewed, so a keyboard user sees the range the next pick makes as the arrows move. The grid, keymap and locale handling are Calendar's.",
      },
    },
  },
} satisfies Meta<typeof RangeCalendar>;

export default meta;

type Story = StoryObj<typeof meta>;

/** A fixed day, so the stories that mark it are the same whenever they are viewed. */
const TODAY = LocalDate.of(2030, 6, 12);

export const Default: Story = {
  args: { today: TODAY },
};

export const WithRange: Story = {
  args: { today: TODAY, defaultValue: { start: LocalDate.of(2030, 6, 10), end: LocalDate.of(2030, 6, 16) } },
};

function ControlledRangeCalendar() {
  const [value, setValue] = useState<DateRange | undefined>({ start: LocalDate.of(2030, 6, 10), end: LocalDate.of(2030, 6, 16) });
  const [anchor, setAnchor] = useState<LocalDate | undefined>(undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
      <RangeCalendar today={TODAY} value={value} onChange={setValue} anchor={anchor} onAnchorChange={setAnchor} />
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="button" onClick={() => setAnchor(LocalDate.of(2030, 6, 3))}>
          Anchor on 3 June
        </button>
        <button
          type="button"
          onClick={() => {
            setValue(undefined);
            setAnchor(undefined);
          }}
        >
          Clear
        </button>
      </div>
      <code>{`value: ${value === undefined ? "undefined" : `${value.start.toString()}..${value.end.toString()}`}`}</code>
      <code>{`anchor: ${anchor?.toString() ?? "undefined"}`}</code>
    </div>
  );
}

export const Controlled: Story = {
  render: () => <ControlledRangeCalendar />,
  parameters: {
    docs: {
      description: {
        story:
          "The range and the pending anchor are both controlled. The first pick reports only the anchor; the second reports the range and then clears the anchor. Setting the anchor from outside, as a field does for a typed start, draws it as an endpoint the next pick completes from.",
      },
    },
  },
};

export const Bounded: Story = {
  args: { today: TODAY, min: LocalDate.of(2030, 6, 5), max: LocalDate.of(2030, 7, 20) },
  parameters: {
    docs: {
      description: {
        story: "Days outside `min` and `max` cannot be an end of the range, and the month buttons stop at the months of the bounds.",
      },
    },
  },
};

export const DisabledDays: Story = {
  args: {
    today: TODAY,
    isDateDisabled: (date) => date.dayOfWeek >= 6,
    defaultValue: { start: LocalDate.of(2030, 6, 6), end: LocalDate.of(2030, 6, 11) },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Weekends are reported as disabled. A disabled day cannot be an end of the range, but a range may run across it, as this one runs across a weekend.",
      },
    },
  },
};
