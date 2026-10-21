"use client";

import { useId, useState, type FormEvent } from "react";
import { OctagonXIcon } from "lucide-react";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import { Button, buttonVariants } from "@devmentor/ui/components/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@devmentor/ui/components/field";
import { LOCKED_NOTE } from "@devmentor/ui/components/mentors/SetupChecklist";
import { SetupItem, type SetupStateVariant } from "@devmentor/ui/components/mentors/SetupItem";
import { NativeSelect, NativeSelectOption } from "@devmentor/ui/components/native-select";
import { Spinner } from "@devmentor/ui/components/spinner";

// Item 2 of the /mentor checklist, "Payouts with Stripe" (E02 Flow 1 and 3). Provisioning state
// comes before payout status; each state is text with one next action. POSTs go through the
// page's apiCall; on success the page follows { url } to Stripe. Docs: payout-status.mdx.

export type PayoutSetup =
  | { status: "locked" }
  | { status: "no-row"; countries: readonly { code: string; name: string }[] }
  | { status: "provisioning-pending" }
  | { status: "reconciliation-required" }
  | { status: "failed" }
  | { status: "incomplete" }
  | { status: "pending"; checkStatusHref: string }
  | { status: "blocked" }
  | { status: "ready" };

export interface PayoutStatusProps {
  payout: PayoutSetup;
  /** POST /api/payments/onboarding ({ country } for a new row, {} to retry or continue). */
  startOnboarding: (body: { country?: string }) => Promise<ApiResult<{ url: string }>>;
  /** Follows the Stripe link (window.location.assign). */
  onOnboardingUrl: (url: string) => void;
  /** Where "Contact the DevMentor team" goes (not set by the spec). */
  contactHref: string;
}

export const COUNTRY_HINT =
  "Where you reside, or where your business is legally established. You can't change this Stripe account's country later.";

// Badges hold one to three words (P-C10). Where the spec's state is a sentence, the badge gets a
// short label and the sentence is the note under the title.
const LABELS: Record<PayoutSetup["status"], { state: string; variant: SetupStateVariant; note?: string }> = {
  locked: { state: "Locked", variant: "secondary", note: LOCKED_NOTE },
  "no-row": { state: "Not started", variant: "secondary" },
  "provisioning-pending": { state: "Starting Stripe setup", variant: "secondary" },
  "reconciliation-required": {
    state: "Setup interrupted",
    variant: "secondary",
    note: "We need to check an earlier setup attempt.",
  },
  failed: { state: "Setup failed", variant: "destructive" },
  incomplete: { state: "Incomplete", variant: "warning" },
  pending: { state: "Pending", variant: "secondary", note: "Stripe is checking your details." },
  blocked: { state: "Blocked", variant: "destructive" },
  ready: { state: "Confirmed", variant: "success" },
};

/** One POST to onboarding: disabled with an -ing label while it runs, the server's message on failure. */
function OnboardingForm({
  label,
  pendingLabel,
  run,
  onUrl,
  countries,
}: {
  label: string;
  pendingLabel: string;
  run: (body: { country?: string }) => Promise<ApiResult<{ url: string }>>;
  onUrl: (url: string) => void;
  /** Shows the country select (only before a local payout row exists). */
  countries?: readonly { code: string; name: string }[];
}) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [countryMissing, setCountryMissing] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = countries ? String(new FormData(event.currentTarget).get("country")) : undefined;
    setCountryMissing(value === "");
    if (value === "") return;
    setPending(true);
    setError(undefined);
    const result = await run(value ? { country: value } : {});
    setPending(false);
    if (result.ok) onUrl(result.data.url);
    else setError(result.error.message);
  }
  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col items-start gap-between-groups">
      {countries ? (
        <Field data-invalid={countryMissing || undefined} className="w-full">
          <FieldLabel htmlFor={`${id}-country`}>Country</FieldLabel>
          <NativeSelect
            id={`${id}-country`}
            name="country"
            required
            defaultValue=""
            className="w-full"
            aria-invalid={countryMissing || undefined}
            aria-describedby={countryMissing ? `${id}-hint ${id}-error` : `${id}-hint`}
          >
            <NativeSelectOption value="">Choose a country</NativeSelectOption>
            {[...countries]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((option) => (
                <NativeSelectOption key={option.code} value={option.code}>
                  {option.name}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          <FieldDescription id={`${id}-hint`}>{COUNTRY_HINT}</FieldDescription>
          {countryMissing ? <FieldError id={`${id}-error`}>Choose a country.</FieldError> : null}
        </Field>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <OctagonXIcon aria-hidden />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Spinner aria-hidden />
            {pendingLabel}
          </>
        ) : (
          label
        )}
      </Button>
    </form>
  );
}

function nextAction(
  payout: PayoutSetup,
  { startOnboarding, onOnboardingUrl, contactHref }: Omit<PayoutStatusProps, "payout">
) {
  const onboarding = (label: string, pendingLabel: string) => (
    <OnboardingForm label={label} pendingLabel={pendingLabel} run={startOnboarding} onUrl={onOnboardingUrl} />
  );
  switch (payout.status) {
    case "no-row":
      return (
        <OnboardingForm
          label="Continue to Stripe"
          pendingLabel="Starting Stripe setup…"
          run={startOnboarding}
          onUrl={onOnboardingUrl}
          countries={payout.countries}
        />
      );
    case "provisioning-pending":
    case "reconciliation-required":
      return onboarding("Retry setup", "Retrying setup…");
    case "incomplete":
      return onboarding("Continue with Stripe", "Opening Stripe…");
    case "pending":
      return <a href={payout.checkStatusHref} className={buttonVariants({ variant: "secondary" })}>Check status</a>;
    case "failed":
    case "blocked":
      return <a href={contactHref} className={buttonVariants({ variant: "outline" })}>Contact the DevMentor team</a>;
    case "locked":
    case "ready":
      return null;
  }
}

export function PayoutStatus({ payout, ...actions }: PayoutStatusProps) {
  const { state, variant, note } = LABELS[payout.status];
  return (
    <SetupItem title="Payouts with Stripe" state={state} variant={variant} note={note}>
      {nextAction(payout, actions)}
    </SetupItem>
  );
}
