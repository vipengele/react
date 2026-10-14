import type { Meta, StoryObj } from "@storybook/react-vite";
import { TimePanel } from "@vipengele/react-ui";
import { Locale, LocalTime } from "@vipengele/ts";
import { useState } from "react";

const meta = {
  title: "Components/TimePanel",
  component: TimePanel,
  args: { locale: new Locale("en-US") },
  parameters: {
    docs: {
      description: {
        component:
          "Hour, minute and, on a 12-hour locale, AM/PM option strips for picking a time of day. The panel is one tab stop: Left and Right move within a strip, Up and Down move between strips, Home and End jump to a strip's ends, and Enter or Space picks. A pick changes its own strip only, and the first pick on an empty panel fills the other strips with their first option. The time is controlled or held by the component.",
      },
    },
  },
} satisfies Meta<typeof TimePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { defaultValue: LocalTime.of(21, 5) },
};

export const Empty: Story = {};

export const TwentyFourHour: Story = {
  args: { locale: new Locale("en-GB"), defaultValue: LocalTime.of(14, 30) },
  parameters: {
    docs: {
      description: { story: "A 24-hour locale shows hours 0 to 23 and omits the AM/PM strip." },
    },
  },
};

export const MinuteStep: Story = {
  args: { minuteStep: 15, defaultValue: LocalTime.of(9, 7) },
  parameters: {
    docs: {
      description: {
        story: "Minutes run in steps of `minuteStep`. A value whose minute is off that grid adds its minute to the strip, in order.",
      },
    },
  },
};

export const DisabledOptions: Story = {
  args: {
    defaultValue: LocalTime.of(10, 0),
    isTimeDisabled: (time) => time.hour < 9 || time.hour >= 17,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Only 09:00 to 16:59 can be picked. An option no allowed time uses is `aria-disabled` and stays focusable, and a pick that lands on a disallowed time moves the other strips to the nearest allowed one.",
      },
    },
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<LocalTime | undefined>(LocalTime.of(9, 5));
    return (
      <div>
        <TimePanel {...args} value={value} onChange={setValue} />
        <p>Committed: {value?.toString() ?? "none"}</p>
      </div>
    );
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: LocalTime.of(14, 30) },
};

export const German: Story = {
  args: {
    locale: new Locale("de-DE"),
    hourLabel: "Stunde",
    minuteLabel: "Minute",
    defaultValue: LocalTime.of(14, 30),
  },
};
