"use client";

import { useState, type FormEvent } from "react";

import type { ApiResult } from "@devmentor/ui/api/types";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SubmitButton } from "@devmentor/ui/frontend/forms/SubmitButton";

// /invite/[token] (E01 Flow 3): the five page states. The GET only inspects; Accept and the
// switch-account sign-out are the only writes. A mismatching account never sees the invited
// address or an Accept button. Public kit only (F3). Docs: invitation-panel.mdx.

export type InvitationState =
  | { status: "invalid" }
  | { status: "signed-out"; signInHref: string; signUpHref: string }
  | { status: "mismatch"; currentEmail: string; signOut: () => Promise<ApiResult<unknown>>; onSignedOut: () => void }
  | { status: "already-mentor" }
  | { status: "valid"; displayName: string; email: string; accept: () => Promise<ApiResult<unknown>>; onAccepted: () => void };

/** One POST button with a pending label and the server's message on failure (no navigation). */
function ActionForm({
  label,
  pendingLabel,
  variant,
  run,
  onDone,
}: {
  label: string;
  pendingLabel: string;
  variant?: "default" | "outline";
  run: () => Promise<ApiResult<unknown>>;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const result = await run();
    setPending(false);
    if (result.ok) onDone();
    else setError(result.error.message);
  }
  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col items-start gap-between-groups">
      {error ? <Notice variant="error" title={error} /> : null}
      <SubmitButton variant={variant} pending={pending} pendingLabel={pendingLabel}>
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
          <ActionForm label="Sign out" pendingLabel="Signing out…" variant="outline" run={state.signOut} onDone={state.onSignedOut} />
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
          <ActionForm label="Accept invitation" pendingLabel="Accepting invitation…" run={state.accept} onDone={state.onAccepted} />
        </div>
      );
  }
}
