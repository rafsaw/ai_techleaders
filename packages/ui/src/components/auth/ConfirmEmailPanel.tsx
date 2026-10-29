"use client";

import { useState } from "react";
import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";

// /confirm-email (E01 Flow 2, AD7): one of four link states, each saying why in one sentence and
// offering the next action. The GET only inspects the token; Confirm posts the password. When the
// link stops working meanwhile (another tab confirmed, a newer link replaced it, it expired), the
// API answers 404 with its reason and the panel swaps the form for that reason and Sign in.
// Public kit only (F3). Docs: confirm-email-panel.mdx.

export type ConfirmEmailState =
  | { status: "valid"; email: string }
  | { status: "expired" }
  | { status: "used" }
  | { status: "invalid" };

const LINK_MESSAGES: Record<
  Exclude<ConfirmEmailState["status"], "valid">,
  { variant: "info" | "success" | "error"; title: string; body?: string }
> = {
  expired: { variant: "info", title: "This link has expired.", body: "Sign in to get a new one." },
  used: { variant: "success", title: "Your address is already confirmed — sign in." },
  // SM-AC6 (wording accepted by the PO 2026-10-27): unknown, tampered, replaced or GitHub-claimed.
  invalid: { variant: "error", title: "This link isn't valid.", body: "Sign in to continue." },
};

export interface ConfirmEmailPanelProps {
  state: ConfirmEmailState;
  /** `/sign-in`, with the validated returnTo. */
  signInHref: string;
  /** Used in the valid state. */
  confirm: {
    /** The password part of the route's `emailConfirmSchema`. */
    schema: z.ZodType<{ password: string }, { password: string }>;
    /** `signal` aborts when the form unmounts. */
    submit: (values: { password: string }, options: { signal: AbortSignal }) => Promise<ApiResult<{ redirectTo: string }>>;
    onConfirmed: (redirectTo: string) => void;
  };
}

function SignInNext({ variant, title, body, signInHref }: { variant: "info" | "success" | "error"; title: string; body?: string; signInHref: string }) {
  return (
    <div data-slot="confirm-email-panel" className="flex w-full max-w-text flex-col items-start gap-between-groups">
      <Notice variant={variant} title={title} className="w-full">
        {body}
      </Notice>
      <LinkButton href={signInHref}>Sign in</LinkButton>
    </div>
  );
}

export function ConfirmEmailPanel({ state, signInHref, confirm }: ConfirmEmailPanelProps) {
  // The server's reason when the link stopped working after the page was opened.
  const [gone, setGone] = useState<string>();
  if (gone) return <SignInNext variant="error" title={gone} signInHref={signInHref} />;

  if (state.status === "valid") {
    return (
      <div data-slot="confirm-email-panel" className="flex w-full max-w-text flex-col gap-between-groups">
        <p className="text-body">
          Enter your password to confirm <strong className="font-semibold wrap-anywhere">{state.email}</strong>
        </p>
        <SchemaForm
          schema={confirm.schema}
          fields={[{ name: "password", label: "Password", type: "password", hint: null }]}
          submitLabel="Confirm"
          pendingLabel="Confirming…"
          onSubmit={async (values, options) => {
            const result = await confirm.submit(values, options);
            if (!result.ok && result.error.code === "not_found") setGone(result.error.message);
            return result;
          }}
          onSuccess={({ redirectTo }) => confirm.onConfirmed(redirectTo)}
        />
      </div>
    );
  }

  return <SignInNext {...LINK_MESSAGES[state.status]} signInHref={signInHref} />;
}
