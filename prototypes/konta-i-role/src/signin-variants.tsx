import { useEffect, useRef, useState } from "react";

import { GITHUB_ERRORS, N03_BODY, N03_TITLE, SignInOptions, type GithubErrorCode } from "@devmentor/ui/components/auth/SignInOptions";
import { Button } from "@devmentor/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/card";
import { Separator } from "@devmentor/ui/components/separator";
import { LinkButton } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";
import { SubmitButton } from "@devmentor/ui/frontend/forms/SubmitButton";

import { Frame } from "./Frame";
import { githubHref, signUpHref } from "./routes";
import { signInSchema } from "./schemas";
import { useVariant, registerVariants } from "./variants";
import { navigate, resendConfirmation, SESSION_EXPIRED_MESSAGE, signInWithEmail, useSim } from "./sim";

// Three layouts of s01 for the review. Same copy, same rules, same simulated server: only the
// arrangement differs. The chosen letter is review state (the review bar), not product state, so it
// lives here and not in the simulation.

registerVariants("s01", [
  { id: "A", summary: "Stacked: GitHub, then email (the design system's SignInOptions as it is)" },
  { id: "B", summary: "Side by side: GitHub and email as two equal cards" },
  { id: "C", summary: "Two steps: choose a method, then the email form" },
]);

type Credentials = { email: string; password: string };

// GAP LD16: SignInOptions is one block. It exports neither the email form nor the resend form, so
// B and C rebuild them here from the same public kit parts (SchemaForm, Notice, SubmitButton).
function ResendConfirmation({ credentials, returnTo }: { credentials: Credentials; returnTo?: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<typeof resendConfirmation>>>();
  return (
    <form
      className="flex flex-col items-start gap-in-group"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setResult(await resendConfirmation(credentials, returnTo));
        setPending(false);
      }}
    >
      <SubmitButton variant="outline" pending={pending} pendingLabel="Resending…">
        Resend confirmation
      </SubmitButton>
      {result && !result.ok ? <Notice variant="error" title={result.error.message} /> : null}
      {result?.ok && result.data.alreadyConfirmed ? <Notice title="Your address is already confirmed — sign in." /> : null}
      {result?.ok && !result.data.alreadyConfirmed ? (
        result.data.emailSent ? (
          <Notice variant="success" title={`Check your inbox at ${credentials.email}`}>
            The link expires in 24 hours.
          </Notice>
        ) : (
          <Notice variant="error" title="We couldn't send the email — try again" />
        )
      ) : null}
    </form>
  );
}

function EmailSignIn({ returnTo }: { returnTo?: string }) {
  const [unconfirmed, setUnconfirmed] = useState<Credentials>();
  return (
    <div className="flex flex-col gap-between-groups">
      <SchemaForm
        schema={signInSchema}
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", hint: null },
        ]}
        submitLabel="Sign in"
        pendingLabel="Signing in…"
        onSubmit={async (values) => {
          const result = await signInWithEmail(values, returnTo);
          setUnconfirmed(!result.ok && result.error.code === "email_not_confirmed" ? values : undefined);
          return result;
        }}
        onSuccess={({ redirectTo }) => navigate(redirectTo)}
      >
        <Notice title={N03_TITLE}>{N03_BODY}</Notice>
      </SchemaForm>
      {unconfirmed ? <ResendConfirmation credentials={unconfirmed} returnTo={returnTo} /> : null}
      <LinkButton href={signUpHref(returnTo)} variant="link" className="self-start">
        Create an account
      </LinkButton>
    </div>
  );
}

function Banners({ error }: { error?: string }) {
  if (error === "session_expired") return <Notice title={SESSION_EXPIRED_MESSAGE} />;
  const entry = error && error in GITHUB_ERRORS ? GITHUB_ERRORS[error as GithubErrorCode] : undefined;
  return entry ? (
    <Notice variant={entry.variant} title={entry.title}>
      {entry.body}
    </Notice>
  ) : null;
}

/** A: the design system's own block. */
function VariantA({ returnTo, error }: { returnTo?: string; error?: string }) {
  return (
    <Frame title="Sign in">
      {/* GAP LD06/LD15: the design system has no banner for an expired session. */}
      {error === "session_expired" ? <Notice title={SESSION_EXPIRED_MESSAGE} /> : null}
      <SignInOptions
        githubHref={githubHref(returnTo)}
        error={error === "session_expired" ? undefined : error}
        email={{
          schema: signInSchema,
          signIn: (values) => signInWithEmail(values, returnTo),
          resend: (values) => resendConfirmation(values, returnTo),
          onSignedIn: navigate,
          signUpHref: signUpHref(returnTo),
        }}
      />
    </Frame>
  );
}

/** B: two cards side by side from 48rem, stacked below. */
function VariantB({ returnTo, error }: { returnTo?: string; error?: string }) {
  return (
    <Frame title="Sign in" width="content">
      <Banners error={error} />
      <div className="grid gap-component md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Sign in with GitHub</h2>
            </CardTitle>
            <CardDescription>The quickest way. No password to remember.</CardDescription>
          </CardHeader>
          <CardContent>
            <LinkButton href={githubHref(returnTo)} className="w-full">
              Sign in with GitHub
            </LinkButton>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Sign in with email</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmailSignIn returnTo={returnTo} />
          </CardContent>
        </Card>
      </div>
    </Frame>
  );
}

/** C: a choice first; the email form opens as a second step. */
function VariantC({ returnTo, error }: { returnTo?: string; error?: string }) {
  const [step, setStep] = useState<"choose" | "email">("choose");
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  useEffect(() => {
    // Keyboard and screen-reader users land on the new step's heading, not on a vanished button.
    if (moved.current) heading.current?.focus();
    moved.current = true;
  }, [step]);
  return (
    <Frame title="Sign in">
      <Banners error={error} />
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 ref={heading} tabIndex={-1} className="outline-none">
              {step === "choose" ? "How do you want to sign in?" : "Sign in with email"}
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-between-groups">
          {step === "choose" ? (
            <>
              <LinkButton href={githubHref(returnTo)} className="w-full">
                Sign in with GitHub
              </LinkButton>
              <div className="flex items-center gap-in-group text-meta text-muted-foreground" aria-hidden="true">
                <Separator className="flex-1" />
                or
                <Separator className="flex-1" />
              </div>
              <Button variant="outline" className="w-full" onClick={() => setStep("email")}>
                Sign in with email
              </Button>
              <LinkButton href={signUpHref(returnTo)} variant="link" className="self-start">
                Create an account
              </LinkButton>
            </>
          ) : (
            <>
              <EmailSignIn returnTo={returnTo} />
              <Button variant="ghost" className="self-start" onClick={() => setStep("choose")}>
                Back to sign-in options
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Frame>
  );
}

export function SignInVariants() {
  const sim = useSim();
  const variant = useVariant("s01");
  const p = sim.params.s01 ?? {};
  const props = { returnTo: p.returnTo, error: p.error };
  return variant === "B" ? <VariantB {...props} /> : variant === "C" ? <VariantC {...props} /> : <VariantA {...props} />;
}
