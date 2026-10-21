import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { OctagonXIcon, TrashIcon } from "lucide-react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@devmentor/ui/components/alert-dialog";
import { Button } from "@devmentor/ui/components/button";
import { Spinner } from "@devmentor/ui/components/spinner";

const slot = "Wed, 4 Nov, 18:30 (Europe/Warsaw)";

/** The /mentor/slots confirmation (E02 Flow 4, step 3). Story-only state wrapper. */
function RemoveSlotDialog({
  onConfirm,
  state = "idle",
  defaultOpen = false,
  size = "default",
}: {
  onConfirm?: () => void;
  state?: "idle" | "pending" | "booked";
  defaultOpen?: boolean;
  size?: "default" | "sm";
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>Remove</AlertDialogTrigger>
      <AlertDialogContent size={size}>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove the slot on {slot}?</AlertDialogTitle>
          <AlertDialogDescription>
            Mentees will no longer see this time. You can publish it again later.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {state === "booked" ? (
          <Alert variant="destructive">
            <OctagonXIcon aria-hidden />
            <AlertTitle>This slot is booked. To cancel, the mentee or you contact the DevMentor team by email.</AlertTitle>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={state === "pending"}>
            {state === "booked" ? "Close" : "Cancel"}
          </AlertDialogCancel>
          {state === "booked" ? null : (
            <AlertDialogAction
              variant="destructive"
              disabled={state === "pending"}
              onClick={() => {
                onConfirm?.();
                setOpen(false);
              }}
            >
              {state === "pending" ? (
                <>
                  <Spinner aria-hidden />
                  Removing slot…
                </>
              ) : (
                "Remove slot"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const meta = {
  title: "Primitives/Signed-in/Alert dialog",
  component: AlertDialogContent,
  tags: ["!autodocs"],
  // Each story opens a modal dialog, so in the docs page it renders in its own frame.
  parameters: { docs: { story: { inline: false, iframeHeight: 420 } } },
  args: { size: "default" },
  argTypes: { size: { control: "select", options: ["default", "sm"] } },
  render: (args) => <RemoveSlotDialog size={args.size ?? "default"} />,
} satisfies Meta<typeof AlertDialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Open it with the Remove button. Focus starts on Cancel (the safe choice), Escape closes,
 * and focus returns to the button that opened it.
 */
export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    const trigger = page.getByRole("button", { name: "Remove" });
    await userEvent.click(trigger);
    const dialog = await page.findByRole("alertdialog", { name: `Remove the slot on ${slot}?` });
    await expect(dialog).toHaveAccessibleDescription(/Mentees will no longer see this time/);
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.tab();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Remove slot" })).toHaveFocus());
    // Tab past the last button: Base UI's focus guard sends focus back to the first one.
    await userEvent.tab();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus());
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("alertdialog")).toBeNull());
    await expect(trigger).toHaveFocus();
  },
};

/** Confirming runs the action once and closes the dialog. */
const confirmRemoval = fn();

export const Confirm: Story = {
  render: () => <RemoveSlotDialog onConfirm={confirmRemoval} />,
  play: async ({ canvasElement }) => {
    confirmRemoval.mockClear();
    const page = within(canvasElement.ownerDocument.body);
    await userEvent.click(page.getByRole("button", { name: "Remove" }));
    await userEvent.click(await page.findByRole("button", { name: "Remove slot" }));
    await expect(confirmRemoval).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(page.queryByRole("alertdialog")).toBeNull());
  },
};

/** Open, before a decision. A click on the scrim does not dismiss it. */
export const Open: Story = {
  render: () => <RemoveSlotDialog defaultOpen />,
  play: async ({ canvasElement }) => {
    const doc = canvasElement.ownerDocument;
    const page = within(doc.body);
    await page.findByRole("alertdialog");
    const scrim = doc.querySelector<HTMLElement>('[data-slot="alert-dialog-overlay"]');
    await expect(scrim).not.toBeNull();
    await userEvent.click(scrim!, { pointerEventsCheck: 0 });
    // Still open after the fade-in finishes.
    await waitFor(() => expect(page.getByRole("alertdialog")).toBeVisible());
  },
};

/** While DELETE runs: both buttons disabled, spinner and "-ing" label, so it cannot be sent twice (P-C4). */
export const Pending: Story = {
  render: () => <RemoveSlotDialog defaultOpen state="pending" />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(await page.findByRole("button", { name: "Removing slot…" })).toBeDisabled();
  },
};

/** 409 from the server: the slot was booked in the meantime. The message stays in the dialog. */
export const BookedMeanwhile: Story = {
  render: () => <RemoveSlotDialog defaultOpen state="booked" />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body);
    await expect(await page.findByRole("alert")).toHaveTextContent("This slot is booked.");
    await expect(page.queryByRole("button", { name: "Remove slot" })).toBeNull();
  },
};

/** size="sm": narrower, buttons side by side in two equal columns. Media is optional. */
export const SmallWithMedia: Story = {
  render: () => (
    <AlertDialog defaultOpen>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia><TrashIcon aria-hidden /></AlertDialogMedia>
          <AlertDialogTitle>Remove the slot on Thu, 5 Nov, 09:00?</AlertDialogTitle>
          <AlertDialogDescription>Mentees will no longer see this time.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Remove slot</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
};

/** At 320 px the dialog keeps the page margin; the buttons stack, Cancel first (P-C2). */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  render: () => <RemoveSlotDialog defaultOpen />,
};
