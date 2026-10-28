"use client";

import { emailConfirmSchema } from "@devmentor/core/validators/auth/email-confirm.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { ConfirmEmailPanel, type ConfirmEmailState } from "@devmentor/ui/components/auth/ConfirmEmailPanel";

import { navigateFully } from "@/app/full-navigation";

const passwordSchema = emailConfirmSchema.pick({ password: true });

export interface AppConfirmEmailFormProps {
  state: ConfirmEmailState;
  /** The link's token; the page passes it only in the valid state. */
  token?: string;
  returnTo: string | null;
  signInHref: string;
}

/**
 * /confirm-email (accounts Flow 2, AD7). **Confirm** posts the token, the
 * password and `returnTo`; success fully navigates to the server's validated
 * `redirectTo`, signed in (platform F5). A wrong password stays on the page;
 * a link that stopped working meanwhile shows the server's reason.
 */
export function AppConfirmEmailForm({ state, token, returnTo, signInHref }: AppConfirmEmailFormProps) {
  return (
    <ConfirmEmailPanel
      state={state}
      signInHref={signInHref}
      confirm={{
        schema: passwordSchema,
        submit: ({ password }, { signal }) =>
          apiCall<{ redirectTo: string }>("/api/auth/confirm-email", {
            method: "POST",
            body: { token, password, returnTo: returnTo ?? undefined },
            signal,
          }),
        onConfirmed: navigateFully,
      }}
    />
  );
}
