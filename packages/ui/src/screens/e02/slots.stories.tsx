import type { Meta, StoryObj } from "@storybook/react-vite";
import { OctagonXIcon } from "lucide-react";
import { delay, http } from "msw";
import { useId, useState } from "react";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import { z } from "zod";

import { apiCall } from "@devmentor/ui/api/apiCall";
import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import { SlotList } from "@devmentor/ui/components/availability/SlotList";
import { SlotRow } from "@devmentor/ui/components/availability/SlotRow";
import { Button } from "@devmentor/ui/components/button";
import { Field, FieldError, FieldLabel } from "@devmentor/ui/components/field";
import { Input } from "@devmentor/ui/components/input";
import { Spinner } from "@devmentor/ui/components/spinner";
import { useSchemaForm } from "@devmentor/ui/forms/useSchemaForm";

import { fail, ok } from "../../../.storybook/blocks/fixtures";
import { ADA_MENTOR, Screen, screenParameters } from "../../../.storybook/blocks/screen";

const SLOTS = "/api/availability/slots";
const ZONE = "Europe/Warsaw";

interface Slot {
  id: string;
  when: string;
  booked: boolean;
}

const three: Slot[] = [
  { id: "3d1f0c5a", when: "Wed, 4 Nov, 18:30", booked: false },
  { id: "8b27e9d4", when: "Thu, 5 Nov, 09:00", booked: true },
  { id: "c4a9f612", when: "Fri, 6 Nov, 17:00", booked: false },
];

/** Stands in for the page's LocalTime: "2026-11-04T18:30" → "Wed, 4 Nov, 18:30". */
function formatLocal(value: string) {
  const [date = "", time = ""] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y!, m! - 1, d!)))
    .replace(/^(\w+) /, "$1, ");
  return `${weekday}, ${time}`;
}

const slotSchema = z.object({ startsAt: z.string().min(1, "Choose a start time") });

/**
 * The page's colocated slot form (E02 UI/UX: `mentor/slots/slot-form.tsx` on useSchemaForm): one
 * datetime-local input labelled with the zone, Publish slot; the value stays for the next entry.
 */
function SlotForm({ onPublished }: { onPublished: (slot: Slot) => void }) {
  const id = useId();
  const form = useSchemaForm({
    schema: slotSchema,
    fields: [{ name: "startsAt" }] as const,
    resetOnSuccess: false,
    onSubmit: async ({ startsAt }) => {
      const result = await apiCall<{ id: string }>(SLOTS, { method: "POST", body: { startsAt: new Date(startsAt).toISOString() } });
      if (result.ok) onPublished({ id: result.data.id, when: formatLocal(startsAt), booked: false });
      return result;
    },
  });
  const errors = form.fieldErrors.startsAt;
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-between-groups">
      <h2 id={`${id}-heading`} className="text-section-title">Add a slot</h2>
      <form noValidate onSubmit={form.handleSubmit} className="flex flex-col items-start gap-between-groups">
        {form.formError ? (
          <Alert variant="destructive">
            <OctagonXIcon aria-hidden />
            <AlertTitle>{form.formError}</AlertTitle>
          </Alert>
        ) : null}
        <Field data-invalid={errors ? true : undefined} className="w-full">
          <FieldLabel htmlFor={`${id}-start`}>Start time (your time zone: {ZONE})</FieldLabel>
          <Input
            id={`${id}-start`}
            name="startsAt"
            type="datetime-local"
            value={form.values.startsAt}
            aria-invalid={errors ? true : undefined}
            aria-describedby={errors ? `${id}-error` : undefined}
            onChange={(event) => form.setValue("startsAt", event.target.value)}
            onBlur={() => form.handleBlur("startsAt")}
          />
          <FieldError id={`${id}-error`} errors={errors?.map((message) => ({ message }))} />
        </Field>
        <Button type="submit" disabled={form.isSubmitting}>
          {form.isSubmitting ? (
            <>
              <Spinner aria-hidden />
              Publishing slot…
            </>
          ) : (
            "Publish slot"
          )}
        </Button>
      </form>
    </section>
  );
}

interface Args {
  slots: Slot[];
  loading?: boolean;
  error?: string;
}

/** /mentor/slots (E02 Flow 4, signed-in): add a slot first (the page's main action), then the list. */
function SlotsScreen({ slots, loading, error }: Args) {
  const [rows, setRows] = useState(slots);
  return (
    <Screen account={ADA_MENTOR} mentorSetupHref="/mentor" title="Slots" width="text">
      <SlotForm onPublished={(slot) => setRows((current) => [...current, slot])} />
      <SlotList count={rows.length} loading={loading} error={error} onRetry={() => {}}>
        {rows.map((row) => (
          <SlotRow
            key={row.id}
            timeZone={ZONE}
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
    </Screen>
  );
}

const meta = {
  title: "Screens/E02/Slots",
  tags: ["!autodocs"],
  parameters: {
    ...screenParameters,
    docs: { story: { inline: false, iframeHeight: 760 } },
    msw: [http.post(SLOTS, () => ok({ id: "e91b07aa" }, 201)), http.delete(SLOTS, () => ok({ id: "3d1f0c5a" }))],
  },
  args: { slots: three },
  render: (args: Args) => <SlotsScreen {...args} />,
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story["play"]>>[0]["canvas"];
async function publish(canvas: Canvas, value = "2026-11-09T19:00") {
  fireEvent.change(canvas.getByLabelText(/^Start time/), { target: { value } });
  await userEvent.click(canvas.getByRole("button", { name: "Publish slot" }));
}

/** Open and booked slots; the zone is named in the label and on every row. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Start time (your time zone: Europe/Warsaw)")).toHaveAttribute("type", "datetime-local");
  },
};

/** Empty: no upcoming slots. */
export const Empty: Story = { args: { slots: [] } };

/** Loading the list. */
export const Loading: Story = { args: { slots: [], loading: true } };

/** The list failed to load: Retry. */
export const LoadError: Story = { args: { slots: [], error: "Could not reach the server. Check your connection and try again." } };

/** Many: 24 upcoming slots. */
export const Many: Story = {
  args: {
    slots: Array.from({ length: 24 }, (_, index) => ({
      id: `s${index}`,
      when: formatLocal(`2026-11-${String(4 + Math.floor(index / 3)).padStart(2, "0")}T${["09:00", "13:30", "18:30"][index % 3]}`),
      booked: index % 4 === 1,
    })),
  },
};

/** Published: the row appears after the server answers and the date stays in the field. */
export const Published: Story = {
  play: async ({ canvas }) => {
    await publish(canvas);
    await expect(await canvas.findByText("Mon, 9 Nov, 19:00")).toBeVisible();
    await expect(canvas.getByLabelText(/^Start time/)).toHaveValue("2026-11-09T19:00");
  },
};

/** Publishing: Publishing slot…. */
export const Publishing: Story = {
  parameters: { msw: [http.post(SLOTS, async () => {
    await delay("infinite");
    return ok({});
  })] },
  play: async ({ canvas }) => {
    await publish(canvas);
    await expect(canvas.getByRole("button", { name: "Publishing slot…" })).toBeDisabled();
  },
};

/** Too soon (400 on startsAt): the spec's message on the field. */
export const TooSoon: Story = {
  parameters: { msw: [http.post(SLOTS, () => fail(400, "validation_error", "Invalid input", { startsAt: ["Pick a time at least 2 hours from now. Mentees need 2 hours' notice."] }))] },
  play: async ({ canvas }) => {
    await publish(canvas, "2026-10-21T19:00");
    await expect(await canvas.findByText(/at least 2 hours from now/)).toBeVisible();
    await waitFor(() => expect(canvas.getByLabelText(/^Start time/)).toHaveFocus());
  },
};

/** Overlap (409): the message names the other slot. */
export const Overlap: Story = {
  parameters: { msw: [http.post(SLOTS, () => fail(409, "conflict", "This overlaps your slot at 2026-11-04T17:30:00Z. Each slot reserves 50 minutes."))] },
  play: async ({ canvas }) => {
    await publish(canvas, "2026-11-04T18:45");
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This overlaps your slot at 2026-11-04T17:30:00Z.");
  },
};

/** No date chosen. */
export const Invalid: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Publish slot" }));
    await expect(canvas.getByText("Choose a start time")).toBeVisible();
  },
};

/** 320 px. */
export const Narrow: Story = {
  globals: { viewport: { value: "w320", isRotated: false } },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth);
  },
};
