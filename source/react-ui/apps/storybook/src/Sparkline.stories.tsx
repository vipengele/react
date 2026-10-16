import type { Decorator, Meta, StoryObj } from "@storybook/react-vite";
import { Sparkline, type SparklineProps, StatTile, Table } from "@vipengele/react-ui";

const rising = [12, 14, 13, 17, 19, 18, 23, 26, 25, 31];
const falling = [31, 29, 30, 26, 24, 25, 19, 16, 14, 12];
const flat = [20, 20, 20, 20, 20, 20, 20, 20];

const narrow: Decorator<SparklineProps> = (Story) => (
  <div style={{ width: "12rem" }}>
    <Story />
  </div>
);

const meta: Meta<SparklineProps> = {
  title: "Components/Sparkline",
  component: Sparkline,
  args: { values: rising },
};

export default meta;

type Story = StoryObj<SparklineProps>;

export const Default: Story = { decorators: [narrow] };

export const Rising: Story = { decorators: [narrow], args: { values: rising } };

export const Falling: Story = { decorators: [narrow], args: { values: falling } };

export const Flat: Story = { decorators: [narrow], args: { values: flat } };

/** A `null` splits the line; a point cut off from both neighbours is drawn as a dot. */
export const WithGap: Story = {
  decorators: [narrow],
  args: { values: [12, 15, 14, 18, null, 22, null, 19, 21, 24] },
};

export const SinglePoint: Story = { decorators: [narrow], args: { values: [18] } };

export const Empty: Story = { decorators: [narrow], args: { values: [] } };

export const Tones: Story = {
  decorators: [narrow],
  render: (args) => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {(["neutral", "success", "warning", "info", "danger"] as const).map((tone) => (
        <div key={tone}>
          <div>{tone}</div>
          <Sparkline {...args} tone={tone} label={`${tone} series`} />
        </div>
      ))}
    </div>
  ),
};

/** The height is fixed in px; the width follows the container. */
export const Heights: Story = {
  decorators: [narrow],
  render: (args) => (
    <div style={{ display: "grid", gap: "1rem" }}>
      {[24, 48, 64].map((height) => (
        <div key={height}>
          <div>{height}px</div>
          <Sparkline {...args} height={height} />
        </div>
      ))}
    </div>
  ),
};

export const InStatTile: Story = {
  render: (args) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(14rem, 1fr))", gap: "1rem", width: "32rem" }}>
      <StatTile
        label="Weekly active users"
        value="31,204"
        supporting="Up 12% on last week"
        visual={
          <div style={{ width: "8rem" }}>
            <Sparkline {...args} label="Weekly active users" />
          </div>
        }
      />
      <StatTile
        tone="danger"
        toneLabel="Failing"
        label="Error budget left"
        value="12%"
        supporting="Down from 31% this month"
        visual={
          <div style={{ width: "8rem" }}>
            <Sparkline {...args} values={falling} tone="danger" label="Error budget left" />
          </div>
        }
      />
    </div>
  ),
};

const services = [
  { name: "Checkout", p95: "212 ms", series: [180, 190, 175, 210, 205, 230, 212], tone: "warning" },
  { name: "Search", p95: "88 ms", series: [120, 110, 105, 98, 94, 90, 88], tone: "success" },
  { name: "Billing", p95: "341 ms", series: [210, 230, 260, 280, 300, 320, 341], tone: "danger" },
  { name: "Profile", p95: "64 ms", series: [64, 63, 65, 64, 64, 63, 64], tone: "neutral" },
] as const;

export const InTableCell: Story = {
  render: () => (
    <Table caption="Latency by service, last 7 days">
      <Table.Head>
        <Table.Row>
          <Table.HeaderCell>Service</Table.HeaderCell>
          <Table.HeaderCell align="end">p95</Table.HeaderCell>
          <Table.HeaderCell>Trend</Table.HeaderCell>
        </Table.Row>
      </Table.Head>
      <Table.Body>
        {services.map((service) => (
          <Table.Row key={service.name}>
            <Table.Cell>{service.name}</Table.Cell>
            <Table.Cell align="end">{service.p95}</Table.Cell>
            <Table.Cell>
              <div style={{ width: "8rem" }}>
                <Sparkline values={service.series} tone={service.tone} height={24} label={`${service.name} p95 latency`} />
              </div>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "36rem" }}>
        <Story />
      </div>
    ),
  ],
};

/** `label` prefixes the generated trend text, as in "Revenue. Trend: rising, from 12 to 31". */
export const Labelled: Story = { decorators: [narrow], args: { label: "Revenue" } };

/** `summary` replaces the generated text as the whole accessible name. */
export const WithSummary: Story = {
  decorators: [narrow],
  args: { summary: "Revenue climbed steadily through the quarter" },
};

/** `decorative` removes the sparkline from the accessibility tree, for one whose neighbouring text already says what it shows. */
export const Decorative: Story = {
  decorators: [narrow],
  render: (args) => (
    <div>
      <p style={{ margin: 0 }}>Revenue rose from 12 to 31 over ten weeks.</p>
      <Sparkline {...args} decorative />
    </div>
  ),
};
