"use client";

import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { useSchemaForm, type FormValues } from "@devmentor/ui/forms/useSchemaForm";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SubmitButton } from "@devmentor/ui/frontend/forms/SubmitButton";

// /invite/[token] (E01 Flow 3): the five page states. The GET only inspects; Accept and the
// switch-account sign-out are the only writes. A mismatching account never sees the invited
// address or an Accept button. Public kit only (F3). Docs: invitation-panel.mdx.

/**
 * One POST behind a button, run by the form core (F2): one request at a time, `signal` aborted on
 * unmount, 429 as `RATE_LIMITED_MESSAGE`, and locked after success until the page navigates away.
 */
export interface InvitationAction {
  /** The route's request schema (e.g. `invitationAcceptSchema`); `values` is the whole body. */
  schema: z.ZodType<FormValues, FormValues>;
  /** Hidden values the button posts, e.g. `{ token }`, or `{}`. */
  values: FormValues;
  /** Usually an `apiCall` that passes `signal` on; must not reject. */
  submit: (values: FormValues, options: { signal: AbortSignal }) => Promise<ApiResult<unknown>>;
  /** After success only: the full browser navigation. */
  onDone: () => void;
}

export type InvitationState =
  | { status: "invalid" }
  | { status: "signed-out"; signInHref: string; signUpHref: string }
  | { status: "mismatch"; currentEmail: string; signOut: InvitationAction }
  | { status: "already-mentor" }
  | { status: "valid"; displayName: string; email: string; accept: InvitationAction };

/** One POST button with a pending label and the server's message on failure (no navigation). */
function ActionForm({
  label,
  pendingLabel,
  variant,
  action,
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
  action: InvitationAction;
}) {
  const { formError, fieldErrors, isSubmitting, handleSubmit } = useSchemaForm({
    schema: action.schema,
    fields: Object.keys(action.values).map((name) => ({ name })),
    initialValues: action.values,
    onSubmit: action.submit,
    onSuccess: action.onDone,
    // Success navigates away: a late second click must not post again.
    lockAfterSuccess: true,
  });
  // No visible fields: a field-level failure (e.g. a 400 on the token) is shown as the form's.
  const error = formError ?? Object.values(fieldErrors).flat()[0];
  return (
    <form noValidate onSubmit={handleSubmit} className="flex w-full flex-col items-start gap-between-groups">
      {error ? <Notice variant="error" title={error} /> : null}
      <SubmitButton variant={variant} pending={isSubmitting} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
    </form>
  );
}

export function InvitationPanel({ state }: { state: InvitationState }) {
  const frame = "flex w-full max-w-text flex-col items-start gap-between-groups";
  switch (state.status) {
    case "invalid":
      return (
        <div data-slot="invitation-panel" className={frame}>
          <Notice variant="error" title="This invitation is not valid.">Ask the DevMentor team for a new email.</Notice>
        </div>
      );
    case "signed-out":
      return (
        <div data-slot="invitation-panel" className={frame}>
          <p className="text-body">
            Sign in or create an account using the email address that received this invitation.
          </p>
          <div className="flex w-full flex-wrap gap-in-group">
            <LinkButton href={state.signInHref}>Sign in</LinkButton>
            <LinkButton href={state.signUpHref} variant="outline">Create an account</LinkButton>
          </div>
        </div>
      );
    case "mismatch":
      return (
        <div data-slot="invitation-panel" className={frame}>
          <Notice variant="error" title="This invitation requires the verified email address it was sent to.">
            <p>
              You are signed in as <strong className="font-semibold wrap-anywhere">{state.currentEmail}</strong>.
            </p>
            <p>
              Sign out, then sign in or create an account with the invited address. Or ask the DevMentor
              team to re-invite <span className="wrap-anywhere">{state.currentEmail}</span>.
            </p>
          </Notice>
          <ActionForm label="Sign out" pendingLabel="Signing out…" variant="outline" action={state.signOut} />
        </div>
      );
    case "already-mentor":
      return (
        <div data-slot="invitation-panel" className={frame}>
          <Notice title="You already have the mentor role." />
        </div>
      );
    case "valid":
      return (
        <div data-slot="invitation-panel" className={frame}>
          <p className="text-body">
            Accept as <strong className="font-semibold wrap-anywhere">{state.displayName}</strong> (
            <span className="wrap-anywhere">{state.email}</span>). This account will receive the mentor role.
          </p>
          <ActionForm label="Accept invitation" pendingLabel="Accepting invitation…" action={state.accept} />
        </div>
      );
  }
}
