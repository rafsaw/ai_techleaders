import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { apiCall } from "@devmentor/ui/backend/api/apiCall";
import { SlotList } from "@devmentor/ui/components/availability/SlotList";
import { BOOKED_SENTENCE, SlotRow } from "@devmentor/ui/components/availability/SlotRow";

const SLOTS = "/api/availability/slots";

// Times as the page's LocalTime would format them in Europe/Warsaw (E02 Flow 4).
const initial = [
  { id: "3d1f0c5a", when: "Wed, 4 Nov, 18:30", booked: false },
  { id: "8b27e9d4", when: "Thu, 5 Nov, 09:00", booked: true },
  { id: "c4a9f612", when: "Fri, 6 Nov, 17:00", booked: false },
];

/** /mentor/slots: a row leaves the list only after the server confirms the DELETE. */
function Slots({ slots = initial }: { slots?: typeof initial }) {
  const [rows, setRows] = useState(slots);
  return (
    <SlotList count={rows.length}>
      {rows.map((row) => (
        <SlotRow
          key={row.id}
          timeZone="Europe/Warsaw"
          booked={row.booked}
          remove={async () => {
            const result = await apiCall(`${SLOTS}?id=${row.id}`, { method: "DELETE" });
            if (result.ok) setRows((current) => current.filter((slot) => slot.id !== row.id));
            return result;
          }}
        >
          {row.when}
        </SlotRow>
      ))}
    </SlotList>
  );
}

const ok = () => HttpResponse.json({ ok: true, data: { id: "3d1f0c5a" } });

const meta = {
  title: "Patterns/Delete confirmation",
  tags: ["!autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 420 } }, msw: [http.delete(SLOTS, async () => {
    await delay(300);
    return ok();
  })] },
  render: () => <Slots />,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Context = Parameters<NonNullable<Story["play"]>>[0];
async function openFirst({ canvas, canvasElement }: Pick<Context, "canvas" | "canvasElement">) {
  await userEvent.click(canvas.getAllByRole("button", { name: "Remove" })[0]!);
  return within(canvasElement.ownerDocument.body).findByRole("alertdialog");
}

/** The question names the slot; Cancel comes first; the action says what it does. */
export const Playground: Story = {
  play: async (context) => {
    const dialog = await openFirst(context);
    await expect(dialog).toHaveAccessibleName("Remove the slot on Wed, 4 Nov, 18:30?");
    await expect(dialog).toHaveAccessibleDescription("Mentees will no longer see this time.");
    const [cancel, remove] = within(dialog).getAllByRole("button");
    await expect(cancel).toHaveTextContent("Cancel");
    await expect(remove).toHaveTextContent("Remove slot");
  },
};

/** Keyboard: Escape cancels and focus goes back to the Remove that opened the dialog. */
export const CancelWithKeyboard: Story = {
  play: async ({ canvas, canvasElement }) => {
    const trigger = canvas.getAllByRole("button", { name: "Remove" })[0]!;
    trigger.focus();
    await userEvent.keyboard("{Enter}");
    await within(canvasElement.ownerDocument.body).findByRole("alertdialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(canvasElement.ownerDocument.body).queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
  },
};

/** Success: the dialog closes and the row goes only after the server answers. */
export const Removed: Story = {
  play: async (context) => {
    const dialog = await openFirst(context);
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    // While the modal is open the page behind it is hidden from the accessibility tree.
    await expect(context.canvasElement.querySelectorAll("li")).toHaveLength(3);
    await waitFor(() => expect(context.canvas.getAllByRole("listitem")).toHaveLength(2), { timeout: 3000 });
    await expect(context.canvas.queryByText("Wed, 4 Nov, 18:30")).toBeNull();
  },
};

/** Pending: Removing slot… with a spinner; both buttons are disabled until the server answers. */
export const Pending: Story = {
  parameters: { msw: [http.delete(SLOTS, async () => {
    await delay("infinite");
    return ok();
  })] },
  play: async (context) => {
    const dialog = await openFirst(context);
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    await expect(within(dialog).getByRole("button", { name: "Removing slot…" })).toBeDisabled();
    await expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  },
};

/** Final error (409): the slot was booked meanwhile; the reason shows and only Close is left. */
export const BookedMeanwhile: Story = {
  parameters: { msw: [http.delete(SLOTS, () => HttpResponse.json({ ok: false, error: { code: "conflict", message: BOOKED_SENTENCE } }, { status: 409 }))] },
  play: async (context) => {
    const dialog = await openFirst(context);
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    await waitFor(() => expect(within(dialog).getByText(BOOKED_SENTENCE)).toBeVisible()); // fade-in
    await expect(within(dialog).getByRole("button", { name: "Close" })).toBeVisible();
    await expect(within(dialog).queryByRole("button", { name: "Remove slot" })).toBeNull();
  },
};

/** Error you can retry (no network): the message shows, Remove slot stays, the second try works. */
export const RetryAfterNetworkError: Story = {
  parameters: { msw: [http.delete(SLOTS, () => HttpResponse.error(), { once: true }), http.delete(SLOTS, ok)] },
  play: async (context) => {
    const dialog = await openFirst(context);
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    await waitFor(() => expect(within(dialog).getByText("Could not reach the server. Check your connection and try again.")).toBeVisible()); // fade-in
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    await waitFor(() => expect(context.canvas.getAllByRole("listitem")).toHaveLength(2));
  },
};

/** The last open slot removed: the list falls back to its empty state. */
export const LastSlotRemoved: Story = {
  render: () => <Slots slots={[initial[0]!]} />,
  play: async (context) => {
    const dialog = await openFirst(context);
    await userEvent.click(within(dialog).getByRole("button", { name: "Remove slot" }));
    await expect(await context.canvas.findByText("No upcoming slots", {}, { timeout: 3000 })).toBeVisible();
  },
};

/** 320 px: the question wraps and the buttons stack, Cancel still first. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  play: async (context) => {
    const dialog = await openFirst(context);
    await expect(within(dialog).getAllByRole("button")[0]).toHaveTextContent("Cancel");
    const body = context.canvasElement.ownerDocument.documentElement;
    await expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
  },
};
