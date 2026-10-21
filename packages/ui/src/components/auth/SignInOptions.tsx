"use client";

import { useState } from "react";
import type { z } from "zod";

import type { ApiResult } from "@devmentor/ui/backend/api/types";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";
import { SubmitButton } from "@devmentor/ui/frontend/forms/SubmitButton";

// /sign-in (E01 UI/UX): GitHub first, then the email form with the N03 notice beside it, then
// the link to sign-up. Public kit only (F3). Copy from 2026-10-17-accounts-and-roles.md.
// Docs: sign-in-options.mdx.

export type GithubErrorCode = "github_cancelled" | "github_failed" | "github_no_verified_email" | "github_email_taken";

export const GITHUB_ERRORS: Record<GithubErrorCode, { variant: "info" | "error"; title: string; body?: string }> = {
  github_cancelled: { variant: "info", title: "GitHub sign-in was cancelled.", body: "Try again" },
  github_failed: { variant: "error", title: "GitHub sign-in failed.", body: "Try again or sign in with email." },
  // The spec gives only the intent here ("verify an email on GitHub or use email sign-up"); the
  // wording is P-A1 (proposal approved by Rafał).
  github_no_verified_email: {
    variant: "error",
    title: "Your GitHub account has no verified email.",
    body: "Verify an email on GitHub and try again, or create an account with email.",
  },
  github_email_taken: { variant: "error", title: "An account with this email is linked to a different GitHub account." },
};

export const N03_TITLE = "Password reset is not available yet.";
export const N03_BODY =
  "Save your password in a password manager, or use GitHub sign-in. If you forget an email-only account's password, you cannot recover access in version 1.0.";

type Credentials = { email: string; password: string };
type ResendResult = ApiResult<{ emailSent: boolean; alreadyConfirmed: boolean }>;

export interface SignInOptionsProps {
  /** `/api/auth/github`, with the validated returnTo when there is one. */
  githubHref: string;
  /** From `?error=`; unknown codes show nothing. */
  error?: string;
  /** Phase 2: the email form. Without it the page offers GitHub only (Phase 1). */
  email?: {
    /** The route's schema for email and password (`signInSchema`, without `returnTo`). */
    schema: z.ZodType<Credentials, Credentials>;
    signIn: (values: Credentials) => Promise<ApiResult<{ redirectTo: string }>>;
    resend: (values: Credentials) => Promise<ResendResult>;
    onSignedIn: (redirectTo: string) => void;
    /** `/sign-up`, with returnTo. */
    signUpHref: string;
  };
}

function ErrorBanner({ code }: { code?: string }) {
  const entry = code && code in GITHUB_ERRORS ? GITHUB_ERRORS[code as GithubErrorCode] : undefined;
  if (!entry) return null;
  return (
    <Notice variant={entry.variant} title={entry.title}>
      {entry.body}
    </Notice>
  );
}

function ResendConfirmation({ credentials, resend }: { credentials: Credentials; resend: (values: Credentials) => Promise<ResendResult> }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ResendResult>();
  return (
    <form
      className="flex flex-col items-start gap-in-group"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setResult(await resend(credentials));
        setPending(false);
      }}
    >
      <SubmitButton variant="outline" pending={pending} pendingLabel="Resending…">
        Resend confirmation
      </SubmitButton>
      {result && !result.ok ? <Notice variant="error" title={result.error.message} /> : null}
      {result?.ok && result.data.alreadyConfirmed ? (
        <Notice title="Your address is already confirmed — sign in." />
      ) : null}
      {result?.ok && !result.data.alreadyConfirmed ? (
        result.data.emailSent ? (
          <Notice variant="success" title={`Check your inbox at ${credentials.email}`}>The link expires in 24 hours.</Notice>
        ) : (
          <Notice variant="error" title="We couldn't send the email — try again" />
        )
      ) : null}
    </form>
  );
}

export function SignInOptions({ githubHref, error, email }: SignInOptionsProps) {
  const [unconfirmed, setUnconfirmed] = useState<Credentials>();
  return (
    <div data-slot="sign-in-options" className="flex w-full max-w-text flex-col gap-component">
      <div className="flex flex-col gap-between-groups">
        <ErrorBanner code={error} />
        <LinkButton href={githubHref} className="w-full">
          Sign in with GitHub
        </LinkButton>
      </div>
      {email ? (
        <section aria-labelledby="sign-in-email" className="flex flex-col gap-between-groups border-t border-border pt-component">
          <h2 id="sign-in-email" className="text-section-title">
            Sign in with email
          </h2>
          <SchemaForm
            schema={email.schema}
            fields={[
              { name: "email", label: "Email", type: "email", autoComplete: "email" },
              { name: "password", label: "Password", type: "password", hint: null },
            ]}
            submitLabel="Sign in"
            pendingLabel="Signing in…"
            onSubmit={async (values) => {
              const result = await email.signIn(values);
              setUnconfirmed(!result.ok && result.error.code === "email_not_confirmed" ? values : undefined);
              return result;
            }}
            onSuccess={({ redirectTo }) => email.onSignedIn(redirectTo)}
          >
            <Notice title={N03_TITLE}>{N03_BODY}</Notice>
          </SchemaForm>
          {unconfirmed ? <ResendConfirmation credentials={unconfirmed} resend={email.resend} /> : null}
          <LinkButton href={email.signUpHref} variant="link" className="self-start">
            Create an account
          </LinkButton>
        </section>
      ) : null}
    </div>
  );
}
