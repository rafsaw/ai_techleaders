"use client";

import { signInSchema } from "@devmentor/core/validators/auth/sign-in.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { SignInOptions } from "@devmentor/ui/components/auth/SignInOptions";

import { navigateFully } from "@/app/full-navigation";

const credentialsSchema = signInSchema.pick({ email: true, password: true });

export interface AppSignInFormProps {
  githubHref: string;
  signUpHref: string;
  /** Validated by the page; `null` signs in to `/`. */
  returnTo: string | null;
  error?: string;
}

/**
 * The /sign-in options with the email form (accounts Flow 2). A successful
 * sign-in fully navigates to the server's validated `redirectTo` (platform
 * F5), so the header and layouts render with the new identity; a failure
 * stays on the page. Resend re-posts the same email and password and the
 * `returnTo`, which goes into the new link.
 */
export function AppSignInForm({ githubHref, signUpHref, returnTo, error }: AppSignInFormProps) {
  const target = returnTo ?? undefined;
  return (
    <SignInOptions
      githubHref={githubHref}
      error={error}
      email={{
        schema: credentialsSchema,
        signIn: (values, { signal }) =>
          apiCall<{ redirectTo: string }>("/api/auth/sign-in", { method: "POST", body: { ...values, returnTo: target }, signal }),
        resend: (values) =>
          apiCall<{ emailSent: boolean; alreadyConfirmed: boolean }>("/api/auth/confirm-email/resend", {
            method: "POST",
            body: { ...values, returnTo: target },
          }),
        onSignedIn: navigateFully,
        signUpHref,
      }}
    />
  );
}
