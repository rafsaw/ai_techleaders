import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { SlotList } from "@devmentor/ui/components/availability/SlotList";
import { BOOKED_SENTENCE, SlotRow } from "@devmentor/ui/components/availability/SlotRow";

const removeOk = fn(async (): Promise<ApiResult<unknown>> => ({ ok: true, data: {} }));
const removeBooked = fn(async (): Promise<ApiResult<unknown>> => ({ ok: false, error: { code: "conflict", message: BOOKED_SENTENCE } }));

// Times as the page's LocalTime would format them in Europe/Warsaw.
const rows = [
  { when: "Wed, 4 Nov, 18:30", booked: false },
  { when: "Thu, 5 Nov, 09:00", booked: true },
  { when: "Fri, 6 Nov, 17:00", booked: false },
];

const meta = {
  title: "Product/E02 Mentor setup/Slot list",
  component: SlotList,
  tags: ["!autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 420 } } },
  args: { count: rows.length },
  render: (args) => (
    <SlotList {...args}>
      {rows.map((row) => (
        <SlotRow key={row.when} timeZone="Europe/Warsaw" booked={row.booked} remove={removeOk}>
          {row.when}
        </SlotRow>
      ))}
    </SlotList>
  ),
} satisfies Meta<typeof SlotList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open and booked rows, oldest first. Remove asks first, naming the slot (Delete confirmation). */
export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const [firstRemove] = page.getAllByRole("button", { name: "Remove" });
    await userEvent.click(firstRemove!);
    const dialog = await page.findByRole("alertdialog");
    await expect(dialog).toHaveAccessibleName("Remove the slot on Wed, 4 Nov, 18:30?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    await waitFor(() => expect(page.queryByRole("alertdialog")).toBeNull());
    await expect(removeOk).toHaveBeenCalled();
  },
};

/** Loading: rows of the same shape (P-LD1), announced once. */
export const Loading: Story = { args: { loading: true } };

/** Empty: why it is empty; the form above is the next step (E02 UI/UX). */
export const Empty: Story = { args: { count: 0 } };

/** Error: the list could not load; Retry. */
export const LoadError: Story = {
  args: { error: "Could not reach the server. Check your connection and try again.", onRetry: fn() },
};

/** Error: booked meanwhile (409); the dialog keeps only Close. */
export const BookedMeanwhile: Story = {
  render: () => (
    <SlotList count={1}>
      <SlotRow timeZone="Europe/Warsaw" booked={false} remove={removeBooked}>Wed, 4 Nov, 18:30</SlotRow>
    </SlotList>
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole("button", { name: "Remove" }));
    const dialog = await page.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    // The dialog fades in from opacity 0, so visibility is awaited (lesson 2026-10-21).
    await waitFor(() => expect(within(dialog).getByText(BOOKED_SENTENCE)).toBeVisible());
    await expect(within(dialog).getByRole("button", { name: "Close" })).toBeVisible();
  },
};

/** Many: two weeks of evening slots; the list stays dense (R01.1). */
export const Many: Story = {
  args: { count: 14 },
  render: (args) => (
    <SlotList {...args}>
      {Array.from({ length: 14 }, (_, day) => (
        <SlotRow key={day} timeZone="Europe/Warsaw" booked={day % 3 === 0} remove={removeOk}>
          {new Date(Date.UTC(2026, 10, 4 + day, 17, 30)).toLocaleString("en-GB", {
            weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Warsaw",
          })}
        </SlotRow>
      ))}
    </SlotList>
  ),
};

/** Long content at 320 px: metadata and the booked sentence wrap; badge and Remove stay right. */
export const LongContentNarrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => (
    <SlotList count={2}>
      <SlotRow timeZone="America/Argentina/ComodRivadavia" booked={false} remove={removeOk}>Wed, 4 Nov, 18:30</SlotRow>
      <SlotRow timeZone="Europe/Warsaw" booked>Thu, 5 Nov, 09:00</SlotRow>
    </SlotList>
  ),
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
