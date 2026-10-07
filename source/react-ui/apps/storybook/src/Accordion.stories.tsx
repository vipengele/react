import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion, Disclosure, Typography } from "@vipengele/react-ui";
import { useState } from "react";

const meta = {
  title: "Components/Accordion",
  component: Accordion,
} satisfies Meta<typeof Accordion>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Single: Story = {
  render: () => (
    <Accordion defaultValue="refunds">
      <Disclosure value="refunds" label="What is your refund policy?">
        <Typography variant="body-md">You can request a full refund within 30 days of purchase.</Typography>
      </Disclosure>
      <Disclosure value="plans" label="Can I change my plan later?">
        <Typography variant="body-md">Yes. Upgrades apply immediately; downgrades take effect at the next billing date.</Typography>
      </Disclosure>
      <Disclosure value="invoices" label="Where do I find my invoices?">
        <Typography variant="body-md">Invoices are listed under Billing in your account settings.</Typography>
      </Disclosure>
    </Accordion>
  ),
};

export const Multiple: Story = {
  render: () => (
    <Accordion multiple defaultValue={new Set(["refunds", "invoices"])}>
      <Disclosure value="refunds" label="What is your refund policy?">
        <Typography variant="body-md">You can request a full refund within 30 days of purchase.</Typography>
      </Disclosure>
      <Disclosure value="plans" label="Can I change my plan later?">
        <Typography variant="body-md">Yes. Upgrades apply immediately; downgrades take effect at the next billing date.</Typography>
      </Disclosure>
      <Disclosure value="invoices" label="Where do I find my invoices?">
        <Typography variant="body-md">Invoices are listed under Billing in your account settings.</Typography>
      </Disclosure>
    </Accordion>
  ),
};

function ControlledSingleAccordion() {
  const [value, setValue] = useState<string | null>("plans");

  return (
    <>
      <Typography variant="body-sm" color="secondary">
        Open item: {value ?? "none"}
      </Typography>
      <Accordion value={value} onChange={setValue}>
        <Disclosure value="refunds" label="What is your refund policy?">
          <Typography variant="body-md">You can request a full refund within 30 days of purchase.</Typography>
        </Disclosure>
        <Disclosure value="plans" label="Can I change my plan later?">
          <Typography variant="body-md">Yes. Upgrades apply immediately; downgrades take effect at the next billing date.</Typography>
        </Disclosure>
        <Disclosure value="invoices" label="Where do I find my invoices?">
          <Typography variant="body-md">Invoices are listed under Billing in your account settings.</Typography>
        </Disclosure>
      </Accordion>
    </>
  );
}

export const ControlledSingle: Story = {
  name: "Controlled single",
  render: () => <ControlledSingleAccordion />,
};

const TERMS_SECTIONS = ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5", "Section 6", "Section 7", "Section 8"];

export const LongContent: Story = {
  name: "Long content",
  render: () => (
    <Accordion defaultValue="terms">
      <Disclosure value="terms" label="Read the full terms of service">
        {TERMS_SECTIONS.map((section) => (
          <Typography key={section} variant="body-md">
            {`${section}. The service is provided as is, and either party may end the agreement with thirty days' written notice. Fees already paid for the current billing period are not refundable except as described in the refund policy, and data is retained for ninety days after the account closes.`}
          </Typography>
        ))}
      </Disclosure>
      <Disclosure value="short" label="Is there a short version?">
        <Typography variant="body-md">Yes: use the service fairly, and tell us if something goes wrong.</Typography>
      </Disclosure>
    </Accordion>
  ),
};

export const FindInPage: Story = {
  name: "Find in page",
  render: () => (
    <>
      <Typography variant="body-md">
        Every panel below is closed. Use the browser's find-in-page to search for "carrier pigeon", "cobalt" or "zeppelin": the matching
        panel opens to show the match.
      </Typography>
      <Accordion>
        <Disclosure value="shipping" label="How long does shipping take?">
          <Typography variant="body-md">
            Orders leave the warehouse within two days. Remote regions are served by carrier pigeon.
          </Typography>
        </Disclosure>
        <Disclosure value="materials" label="What are the frames made of?">
          <Typography variant="body-md">Each frame is machined from aluminium and finished in a cobalt anodised coating.</Typography>
        </Disclosure>
        <Disclosure value="events" label="Do you attend trade shows?">
          <Typography variant="body-md">We run a stand every spring, and last year we arrived by zeppelin.</Typography>
        </Disclosure>
      </Accordion>
    </>
  ),
};
