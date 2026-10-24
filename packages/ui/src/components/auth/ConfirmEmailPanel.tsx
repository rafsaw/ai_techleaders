"use client";

import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";

// /confirm-email (E01 Flow 2, AD7): one of four link states, each saying why in one sentence and
// offering the next action. The GET only inspects the token; Confirm posts the password.
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
  invalid: {
    variant: "error",
    title: "This link isn't valid.",
    body: "If you registered more than once, use the link in the most recent email.",
  },
};

export interface ConfirmEmailPanelProps {
  state: ConfirmEmailState;
  /** `/sign-in`, with the validated returnTo. */
  signInHref: string;
  /** Used in the valid state. */
  confirm: {
    /** The password part of the route's `emailConfirmSchema`. */
    schema: z.ZodType<{ password: string }, { password: string }>;
    submit: (values: { password: string }) => Promise<ApiResult<{ redirectTo: string }>>;
    onConfirmed: (redirectTo: string) => void;
  };
}

export function ConfirmEmailPanel({ state, signInHref, confirm }: ConfirmEmailPanelProps) {
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
          onSubmit={confirm.submit}
          onSuccess={({ redirectTo }) => confirm.onConfirmed(redirectTo)}
        />
      </div>
    );
  }

  const message = LINK_MESSAGES[state.status];

  return (
    <div data-slot="confirm-email-panel" className="flex w-full max-w-text flex-col items-start gap-between-groups">
      <Notice variant={message.variant} title={message.title} className="w-full">
        {message.body}
      </Notice>
      <LinkButton href={signInHref}>Sign in</LinkButton>
    </div>
  );
}
