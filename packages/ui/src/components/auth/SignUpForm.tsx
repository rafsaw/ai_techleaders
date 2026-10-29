"use client";

import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/api/types";
import { N03_BODY, N03_TITLE } from "@devmentor/ui/components/auth/SignInOptions";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";

// /sign-up (E01 Flow 2, UI/UX): display name, email and a new password, with the N03 notice and
// the 15-character rule shown before typing. From an invitation it says which address to use
// (P-SCR3, proposal approved by Rafał). Public kit only (F3). Docs: sign-up-form.mdx.

export const INVITED_NOTICE = "Use the email address that received your invitation.";
export const DISPLAY_NAME_HINT = "This is the name others see. You can change it.";

export type SignUpValues = { displayName: string; email: string; password: string };
export type SignUpOutcome = { email: string; emailSent: boolean };

export interface SignUpFormProps {
  /** The route's `signUpSchema` without `returnTo` (the page adds it to the request). */
  schema: z.ZodType<SignUpValues, SignUpValues>;
  /** Usually an `apiCall` to `POST /api/auth/sign-up`; `signal` aborts on unmount. */
  submit: (values: SignUpValues, options: { signal: AbortSignal }) => Promise<ApiResult<SignUpOutcome>>;
  /** Only after the server answered: the page moves on to Check your inbox. */
  onSignedUp: (outcome: SignUpOutcome) => void;
  /** `/sign-in`, with the validated returnTo. */
  signInHref: string;
  /** The returnTo is an invitation: an invite needs the address that received it (E01 UI/UX). */
  invited?: boolean;
}

export function SignUpForm({ schema, submit, onSignedUp, signInHref, invited = false }: SignUpFormProps) {
  return (
    <div data-slot="sign-up-form" className="flex w-full max-w-text flex-col gap-between-groups">
      {invited ? <Notice title={INVITED_NOTICE} /> : null}
      <Notice title={N03_TITLE}>{N03_BODY}</Notice>
      <SchemaForm
        schema={schema}
        fields={[
          { name: "displayName", label: "Display name", autoComplete: "name", hint: DISPLAY_NAME_HINT },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        onSubmit={submit}
        onSuccess={onSignedUp}
      />
      <LinkButton href={signInHref} variant="link" className="self-start">
        Sign in instead
      </LinkButton>
    </div>
  );
}
