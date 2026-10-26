import { useState } from "react";

import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import { SignInOptions, N03_BODY, N03_TITLE, type GithubErrorCode } from "@devmentor/ui/components/auth/SignInOptions";
import { AccountSummary } from "@devmentor/ui/components/auth/AccountSummary";
import { ConfirmEmailPanel, type ConfirmEmailState } from "@devmentor/ui/components/auth/ConfirmEmailPanel";
import { InvitationPanel, type InvitationState } from "@devmentor/ui/components/auth/InvitationPanel";
import { Button } from "@devmentor/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/card";
import { CrudForm } from "@devmentor/ui/backend/forms/CrudForm";
import { LinkButton, linkButtonVariants } from "@devmentor/ui/frontend/actions/LinkButton";
import { Notice } from "@devmentor/ui/frontend/feedback/Notice";
import { SchemaForm } from "@devmentor/ui/frontend/forms/SchemaForm";
import { cn } from "@devmentor/ui/lib/utils";

import { formatUtc } from "./data";
import { Frame, ScreenSection } from "./Frame";
import { githubHref, signInHref, signUpHref } from "./routes";
import { accountSchema, emailConfirmSchema, signInSchema, signUpSchema } from "./schemas";
import {
  acceptInvitation, confirmEmail, githubCallback, identityOf, inspectInvitation, inspectLink, navigate, resendConfirmation,
  saveDisplayName, SESSION_EXPIRED_MESSAGE, signOut, signInWithEmail, signUp, useSim, userOf,
} from "./sim";

// Public-name notice that shows once after the first GitHub sign-in (PO L16, O5). GAP LD12: the design
// system has no story for it on the invitation page; on the account page AccountSummary has its own.
const PUBLIC_NAME_NOTICE = "This is the name others see. You can change it in Account settings.";

/** s01 /sign-in */
function SignIn() {
  const p = useSim().params.s01 ?? {};
  return (
    <Frame title="Sign in">
      {/* GAP LD06/LD15: the design system has no banner for an expired session. */}
      {p.error === "session_expired" ? <Notice title={SESSION_EXPIRED_MESSAGE} /> : null}
      <SignInOptions
        githubHref={githubHref(p.returnTo)}
        error={p.error === "session_expired" ? undefined : (p.error as GithubErrorCode | undefined)}
        email={{
          schema: signInSchema,
          signIn: (values) => signInWithEmail(values, p.returnTo),
          resend: (values) => resendConfirmation(values, p.returnTo),
          onSignedIn: navigate,
          signUpHref: signUpHref(p.returnTo),
        }}
      />
    </Frame>
  );
}

/** s02 /sign-up */
function SignUp() {
  const sim = useSim();
  const p = sim.params.s02 ?? {};
  // c04: which kind of address the person types, so the same page can show the three outcomes.
  const kind = sim.scenario.signUpEmail;
  const prefilled = kind === "unconfirmed" ? "ewa.lis@example.test" : kind === "confirmed" ? "tomek.wisniewski@example.test" : "";
  const invited = p.returnTo?.startsWith("/invite/") ?? false;
  return (
    <Frame title="Create an account">
      {invited ? <Notice title="Use the email address that received your invitation." /> : null}
      <Notice title={N03_TITLE}>{N03_BODY}</Notice>
      <SchemaForm
        key={kind}
        schema={signUpSchema}
        initialValues={{ email: prefilled }}
        fields={[
          { name: "displayName", label: "Display name", autoComplete: "name", hint: "This is the name others see. You can change it." },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
        ]}
        submitLabel="Create account"
        pendingLabel="Creating account…"
        onSubmit={(values) => signUp(values, p.returnTo)}
        onSuccess={({ email, emailSent }) => navigate(`/sign-up/check-email?email=${encodeURIComponent(email)}${emailSent ? "" : "&sent=0"}`)}
      />
      <LinkButton href={signInHref(p.returnTo)} variant="link" className="self-start">
        Sign in instead
      </LinkButton>
    </Frame>
  );
}

/** s03 /sign-up/check-email */
function CheckEmail() {
  const p = useSim().params.s03 ?? {};
  const email = p.email ?? "";
  if (p.sent === "0") {
    // PO L09/O3: neutral text, no reason, no countdown. GAP LD13: the design system's "not sent" text differs.
    return (
      <Frame title="Check your email">
        <Notice variant="error" title="We couldn't send the email. Please try again later." />
        <LinkButton href="/sign-up" className="self-start">
          Back to sign up
        </LinkButton>
      </Frame>
    );
  }
  return (
    <Frame title="Check your email">
      <Notice variant="success" title={<span className="wrap-anywhere">Check your inbox at {email}</span>}>
        The link expires in 24 hours.
      </Notice>
      <LinkButton href="/sign-in" variant="link" className="self-start">
        Sign in
      </LinkButton>
    </Frame>
  );
}

/** s04 /confirm-email */
function ConfirmEmail() {
  const sim = useSim();
  const p = sim.params.s04 ?? {};
  const token = p.token ?? "";
  const link = inspectLink(token, sim);
  const state: ConfirmEmailState = link.status === "valid" ? { status: "valid", email: link.email } : { status: link.status };
  if (link.status === "invalid") {
    // PO L11: a replaced link, or one removed when GitHub claimed the account, gets a neutral message and
    // no hint about other emails. GAP LD05/LD15: ConfirmEmailPanel's "use the most recent email" text contradicts it.
    return (
      <Frame title="Confirm your email">
        <Notice variant="error" title="This link isn't valid.">Sign in to continue.</Notice>
        <LinkButton href={signInHref(p.returnTo)} className="self-start">
          Sign in
        </LinkButton>
      </Frame>
    );
  }
  return (
    <Frame title="Confirm your email">
      <ConfirmEmailPanel
        key={token}
        state={state}
        signInHref={signInHref(p.returnTo)}
        confirm={{
          schema: emailConfirmSchema,
          submit: ({ password }) => confirmEmail(token, password, p.returnTo),
          onConfirmed: navigate,
        }}
      />
    </Frame>
  );
}

/** s05 /invite/[token] */
function Invitation() {
  const sim = useSim();
  const token = sim.params.s05?.token ?? "";
  const invitation = inspectInvitation(token, sim);
  const user = userOf(sim);
  const returnTo = `/invite/${token}`;

  let state: InvitationState;
  if (!invitation) state = { status: "invalid" };
  else if (!user) state = { status: "signed-out", signInHref: signInHref(returnTo), signUpHref: signUpHref(returnTo) };
  else if (user.email !== invitation.email) {
    state = { status: "mismatch", currentEmail: user.email, signOut, onSignedOut: () => navigate(returnTo) };
  } else if (user.roles.includes("mentor")) state = { status: "already-mentor" };
  else {
    state = {
      status: "valid", displayName: user.displayName, email: user.email,
      accept: () => acceptInvitation(token), onAccepted: () => navigate("/"),
    };
  }

  const showWelcome = user !== null && sim.welcomePendingFor === user.id;
  return (
    <Frame title="Mentor invitation">
      {showWelcome ? <Notice title={PUBLIC_NAME_NOTICE} /> : null}
      <InvitationPanel state={state} />
    </Frame>
  );
}

/** The display-name form with the "Name saved" confirmation (PO L10). GAP LD08: no design-system state for it. */
function AccountNameForm({ displayName }: { displayName: string }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex flex-col gap-between-groups">
      {saved ? (
        <Alert role="status">
          <AlertTitle>Name saved</AlertTitle>
        </Alert>
      ) : null}
      {/* GAP LD08: the spec asks for CrudForm resetOnSuccess={false}, which CrudForm does not have yet: it resets the field
          after a save. Keying on the saved name remounts the form with it, so the field keeps the new name (PO L10). */}
      <CrudForm
        key={displayName}
        schema={accountSchema}
        fields={[{ name: "displayName", label: "Display name", autoComplete: "name" }]}
        initialValues={{ displayName }}
        onSubmit={(values) => {
          setSaved(false);
          return saveDisplayName(values);
        }}
        onSuccess={() => setSaved(true)}
      />
    </div>
  );
}

/** s06 /account */
function Account() {
  const sim = useSim();
  const user = userOf(sim);
  if (!user) {
    return (
      <Frame title="Account">
        <Notice title={sim.expiredNotice ? SESSION_EXPIRED_MESSAGE : "Sign in to see your account."}>
          <LinkButton href={signInHref("/account")}>Sign in</LinkButton>
        </Notice>
      </Frame>
    );
  }
  const welcome = sim.params.s06?.welcome === "1" && sim.welcomePendingFor === user.id;
  return (
    <Frame title="Account">
      <AccountSummary
        email={user.email}
        roles={user.roles}
        signInMethods={{ github: Boolean(user.githubLogin), password: Boolean(user.password) }}
        welcome={welcome}
      >
        <AccountNameForm key={user.id} displayName={user.displayName} />
      </AccountSummary>
    </Frame>
  );
}

/** s07 / */
function Home() {
  const sim = useSim();
  return (
    <Frame title="DevMentor">
      {sim.homeNotice ? <Notice variant="success" title={sim.homeNotice} /> : null}
      <p className="text-body">Text-based mentoring with senior engineers in TypeScript, React and Python.</p>
    </Frame>
  );
}

/** s11 neutral 404 (PO L05). GAP LD02: no story for it. */
function NotFoundBody() {
  return (
    <>
      <p className="text-body">This page does not exist.</p>
      <LinkButton href="/" className="self-start">
        Go to the home page
      </LinkButton>
    </>
  );
}

function NotFound() {
  return (
    <Frame title="Page not found">
      <NotFoundBody />
    </Frame>
  );
}

/** s08 /backend, the access-control placeholder. GAP LD04: no design-system screen for it. */
function Backend() {
  const user = userOf(useSim());
  if (!user) {
    return (
      <Frame title="Sign in to continue">
        <Notice title="You need to sign in to open this page.">
          <LinkButton href={signInHref("/backend")}>Sign in</LinkButton>
        </Notice>
      </Frame>
    );
  }
  // Mentees and mentors get the same neutral 404 as any unknown page: no hint that /backend exists (AD4).
  if (!user.roles.includes("operator")) {
    return (
      <Frame title="Page not found">
        <NotFoundBody />
      </Frame>
    );
  }
  return (
    <Frame title="Backend (existing, not prototyped)">
      <Notice title="Only operators get here.">The real backend pages exist in the app. This prototype only shows who may enter.</Notice>
    </Frame>
  );
}

/** s12 /error: identity-free and database-free, so it has its own bare header (spec UI/UX). GAP LD03. */
function ErrorPage() {
  return (
    <div className="min-h-96 bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-content items-center px-page-gutter py-list-row-y">
          <LinkButton href="/" variant="link" className="text-row-title text-foreground no-underline">
            DevMentor
          </LinkButton>
        </div>
      </header>
      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className="flex max-w-text flex-col gap-component">
          <h1 className="text-page-title">Something went wrong</h1>
          <Notice variant="error" title="We couldn't complete this request.">Try again in a moment.</Notice>
          <LinkButton href="/" className="self-start">
            Go to the home page
          </LinkButton>
        </div>
      </main>
    </div>
  );
}

/** s13 the demo inbox. Prototype shell (GAP LD09), not a product screen: it has no site header. */
function Inbox() {
  const sim = useSim();
  const mails = [...sim.mails].sort((a, b) => b.sentAt - a.sentAt);
  const [selectedId, setSelectedId] = useState<string>();
  const selected = mails.find((mail) => mail.id === selectedId) ?? mails[0];
  return (
    <div className="min-h-96 bg-background text-foreground">
      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className="flex flex-col gap-component">
          <h1 className="text-page-title">Demo inbox</h1>
          <Notice title="Prototype only. No email is sent.">
            This is a stand-in for the mailbox of everyone in the demo. Links in these messages are fictional.
          </Notice>
          {selected ? (
            <div className="grid gap-component md:grid-cols-3">
              <ul className="flex flex-col gap-in-group md:col-span-1" aria-label="Messages">
                {mails.map((mail) => (
                  <li key={mail.id}>
                    <Button
                      variant={mail.id === selected.id ? "secondary" : "outline"}
                      className="h-auto w-full flex-col items-start whitespace-normal py-in-group text-left"
                      aria-current={mail.id === selected.id ? "true" : undefined}
                      onClick={() => setSelectedId(mail.id)}
                    >
                      <span className="text-label">{mail.subject}</span>
                      <span className="text-meta text-muted-foreground wrap-anywhere">To {mail.to}</span>
                    </Button>
                  </li>
                ))}
              </ul>
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle role="heading" aria-level={2}>
                    {selected.subject}
                  </CardTitle>
                  <CardDescription className="wrap-anywhere">
                    To {selected.to} · {formatUtc(selected.sentAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-between-groups">
                  {selected.paragraphs.map((text) =>
                    text === "{link}" && selected.href ? (
                      <a key={text} href={selected.href} className={cn(linkButtonVariants({ variant: "link" }), "self-start wrap-anywhere")}>
                        devmentor.example.test{selected.href}
                      </a>
                    ) : (
                      <p key={text} className="text-body">
                        {text}
                      </p>
                    ),
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <p className="text-body">The inbox is empty.</p>
          )}
        </div>
      </main>
    </div>
  );
}

/** s14 the simulated GitHub authorization page (GAP LD10). Not GitHub, and it never asks for a password. */
function GithubAuthorize() {
  const sim = useSim();
  const identity = identityOf(sim);
  const { returnTo } = sim.params.s14 ?? {};
  if (sim.scenario.github === "unavailable") {
    return (
      <div className="min-h-96 bg-background text-foreground">
        <main className="mx-auto w-full max-w-content px-page-gutter py-section">
          <div className="flex max-w-text flex-col gap-component">
            <h1 className="text-page-title">GitHub is unavailable</h1>
            <Notice variant="error" title="Simulation of GitHub. Not the real service.">
              The simulated GitHub does not answer. DevMentor reports it as a failed sign-in.
            </Notice>
            <Button className="self-start" onClick={() => navigate(githubCallback(returnTo, false))}>
              Back to DevMentor
            </Button>
          </div>
        </main>
      </div>
    );
  }
  return (
    <div className="min-h-96 bg-background text-foreground">
      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className="flex max-w-text flex-col gap-component">
          <h1 className="text-page-title">Authorize DevMentor</h1>
          <Notice title="Simulation of GitHub. Not the real service.">
            Nothing is sent to GitHub and no password is asked for. Pick who is signing in under Scenarios in the review bar.
          </Notice>
          <Card>
            <CardHeader>
              <CardTitle role="heading" aria-level={2}>
                DevMentor wants to read your email address
              </CardTitle>
              <CardDescription className="wrap-anywhere">
                Signed in as {identity.login}. Scope: user:email.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-in-group">
              <Button onClick={() => navigate(githubCallback(returnTo, false))}>Authorize DevMentor</Button>
              <Button
                variant="outline"
                onClick={() => navigate(githubCallback(returnTo, true))}
              >
                Deny
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export function Screens() {
  return (
    <>
      <ScreenSection id="s01"><SignIn /></ScreenSection>
      <ScreenSection id="s02"><SignUp /></ScreenSection>
      <ScreenSection id="s03"><CheckEmail /></ScreenSection>
      <ScreenSection id="s04"><ConfirmEmail /></ScreenSection>
      <ScreenSection id="s05"><Invitation /></ScreenSection>
      <ScreenSection id="s06"><Account /></ScreenSection>
      <ScreenSection id="s07"><Home /></ScreenSection>
      <ScreenSection id="s08"><Backend /></ScreenSection>
      <ScreenSection id="s11"><NotFound /></ScreenSection>
      <ScreenSection id="s12"><ErrorPage /></ScreenSection>
      <ScreenSection id="s13"><Inbox /></ScreenSection>
      <ScreenSection id="s14"><GithubAuthorize /></ScreenSection>
    </>
  );
}
