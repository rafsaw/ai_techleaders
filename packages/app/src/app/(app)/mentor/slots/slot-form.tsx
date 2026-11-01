"use client";

import { z } from "zod";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { ErrorMessage } from "@devmentor/ui/backend/feedback/ErrorMessage";
import { Button } from "@devmentor/ui/components/button";
import { Field, FieldError, FieldLabel } from "@devmentor/ui/components/field";
import { Input } from "@devmentor/ui/components/input";
import { useSchemaForm } from "@devmentor/ui/forms/useSchemaForm";
import { unlessSessionExpired } from "@/app/session-expiry";
import type { SlotDto } from "@/server/services/availability/slot.service";

const schema = z.object({ startsAt: z.string().min(1, "Choose a start time") });
const fields = [{ name: "startsAt" }] as const;

export function SlotForm({ timeZone, onPublished }: { timeZone: string; onPublished: (slot: SlotDto) => void }) {
  const form = useSchemaForm({
    schema, fields, resetOnSuccess: false,
    onSubmit: async ({ startsAt }, { signal }) => unlessSessionExpired(await apiCall<SlotDto>("/api/availability/slots", {
      method: "POST", body: { startsAt: new Date(startsAt).toISOString() }, signal,
    }), "/mentor/slots"),
    onSuccess: onPublished,
  });
  const errors = form.fieldErrors.startsAt;
  return (
    <section aria-labelledby="add-slot" className="flex flex-col gap-in-group">
      <h2 id="add-slot" className="text-section-title">Add a slot</h2>
      <form noValidate onSubmit={form.handleSubmit} onKeyDown={form.handleKeyDown} className="flex flex-col gap-in-group">
        {form.formError ? <ErrorMessage title="Could not publish slot" message={form.formError} /> : null}
        <Field data-invalid={errors ? true : undefined}>
          <FieldLabel htmlFor="starts-at">Start time (your time zone: {timeZone})</FieldLabel>
          <Input id="starts-at" name="startsAt" type="datetime-local" value={form.values.startsAt} aria-invalid={errors ? true : undefined} aria-describedby={errors ? "starts-at-error" : undefined} onChange={(event) => form.setValue("startsAt", event.target.value)} onBlur={() => form.handleBlur("startsAt")} />
          <FieldError id="starts-at-error" errors={errors?.map((message) => ({ message }))} />
        </Field>
        <div><Button type="submit" disabled={form.isSubmitting}>{form.isSubmitting ? "Publishing slot…" : "Publish slot"}</Button></div>
      </form>
    </section>
  );
}
