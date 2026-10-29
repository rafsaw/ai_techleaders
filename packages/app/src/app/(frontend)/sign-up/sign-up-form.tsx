"use client";

import { signUpSchema } from "@devmentor/core/validators/auth/sign-up.schema";
import { apiCall } from "@devmentor/ui/api/apiCall";
import { SignUpForm, type SignUpOutcome } from "@devmentor/ui/components/auth/SignUpForm";
import { useRouter } from "next/navigation";

import { checkEmailPath } from "@/app/(frontend)/auth-links";

const fieldsSchema = signUpSchema.omit({ returnTo: true });

export interface AppSignUpFormProps {
  signInHref: string;
  /** Validated by the page; it travels in the confirmation link only. */
  returnTo: string | null;
  invited: boolean;
}

/**
 * The /sign-up form (accounts Flow 2). Signing up changes no identity, so
 * success is a client navigation to Check your inbox with the address the
 * API answered and, when it could not be sent, `sent=0` (SM-AC3).
 */
export function AppSignUpForm({ signInHref, returnTo, invited }: AppSignUpFormProps) {
  const router = useRouter();
  return (
    <SignUpForm
      schema={fieldsSchema}
      invited={invited}
      signInHref={signInHref}
      submit={(values, { signal }) =>
        apiCall<SignUpOutcome>("/api/auth/sign-up", { method: "POST", body: { ...values, returnTo: returnTo ?? undefined }, signal })}
      onSignedUp={({ email, emailSent }) => router.push(checkEmailPath(email, emailSent, returnTo))}
    />
  );
}
