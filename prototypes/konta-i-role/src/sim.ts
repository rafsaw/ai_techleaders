import { useSyncExternalStore } from "react";

import type { ApiResult } from "@devmentor/ui/api/types";

import {
  alreadyHaveAccountMail, CONFIRM_LINK_TTL, confirmationMail, GITHUB_IDENTITIES, NOW, SEED_ACCOUNTS,
  SEED_INVITATIONS, SEED_LINKS, SESSION_TTL, seedMails, type Account, type ConfirmLink, type GithubIdentity, type Invitation, type Mail,
} from "./data";
import { resolveHref, safeReturnTo, type Params, type ScreenId } from "./routes";

// The simulated server and browser state. In memory only: reloading the page starts the demo over.
// Nothing here talks to a network, sends an email or checks a real password.

export type GithubOutcome = "authorize" | "denied" | "unavailable" | "state_expired" | "no_email" | "email_taken";
export type MailMode = "ok" | "smtp_down" | "limit";
export type AcceptOutcome = "ok" | "race" | "already_mentor" | "other_address";
export type NetworkMode = "ok" | "offline" | "database_down";
export type SignUpEmailKind = "new" | "unconfirmed" | "confirmed";

/** Scenario controls (map, section 2). They belong to the review bar, not to the product. */
export interface Scenario {
  github: GithubOutcome; // c01
  mail: MailMode; // c03
  signUpEmail: SignUpEmailKind; // c04
  rateLimited: boolean; // c05
  accept: AcceptOutcome; // c08, applies to the next request only
  sessionExpired: boolean; // c09
  nameSaveError: boolean; // c11, applies to the next request only
  network: NetworkMode; // c12
  returnToInvite: boolean; // c14
}

export interface Sim {
  accounts: Account[];
  links: ConfirmLink[];
  invitations: Invitation[];
  mails: Mail[];
  sessionUserId: string | null;
  /** The last request that reached the server while signed in; the session lives 30 days after it (AD2). */
  lastSeen: number;
  /** What each screen was last opened with (query parameters, token, returnTo). */
  params: Partial<Record<ScreenId, Params>>;
  githubIdentityKey: string; // c02
  clockOffset: number; // c13
  scenario: Scenario;
  currentScreen: ScreenId;
  /** Set after the first GitHub sign-in of a new account; the public-name notice is shown once. */
  welcomePendingFor: string | null;
  /** "Invitation accepted..." on the home page, gone once the person leaves it. */
  homeNotice: string | null;
  /** The session ended because it expired, not because the person signed out (PO L07). */
  expiredNotice: boolean;
  counter: number;
}

const defaultScenario = (): Scenario => ({
  github: "authorize", mail: "ok", signUpEmail: "new", rateLimited: false, accept: "ok",
  sessionExpired: false, nameSaveError: false, network: "ok", returnToInvite: false,
});

function initial(): Sim {
  return {
    accounts: structuredClone(SEED_ACCOUNTS),
    links: structuredClone(SEED_LINKS),
    invitations: structuredClone(SEED_INVITATIONS),
    mails: seedMails(),
    sessionUserId: null,
    lastSeen: NOW,
    params: {},
    githubIdentityKey: "kuba",
    clockOffset: 0,
    scenario: defaultScenario(),
    currentScreen: "s07",
    welcomePendingFor: null,
    homeNotice: null,
    expiredNotice: false,
    counter: 0,
  };
}

let state: Sim = initial();
const listeners = new Set<() => void>();

function update(change: (draft: Sim) => void) {
  const draft = structuredClone(state);
  change(draft);
  state = draft;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useSim = (): Sim => useSyncExternalStore(subscribe, () => state);
export const getSim = (): Sim => state;

export const now = (sim: Sim = state) => NOW + sim.clockOffset;
export const userOf = (sim: Sim = state) => sim.accounts.find((account) => account.id === sim.sessionUserId) ?? null;
export const identityOf = (sim: Sim = state): GithubIdentity => GITHUB_IDENTITIES.find((entry) => entry.key === sim.githubIdentityKey)!;

const ok = <T,>(data: T): ApiResult<T> => ({ ok: true, data });
const fail = (code: string, message: string, fieldErrors?: Record<string, string[]>): ApiResult<never> => ({
  ok: false, error: fieldErrors ? { code, message, fieldErrors } : { code, message },
});
const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const normalize = (email: string) => email.trim().toLowerCase();

export const SESSION_EXPIRED_MESSAGE = "Your session expired. Sign in again.";
const NEUTRAL_NOT_SENT = "We couldn't send the email. Please try again later.";

// ---- Scenario controls --------------------------------------------------------------------------

export function setScenario(patch: Partial<Scenario>) {
  update((draft) => {
    Object.assign(draft.scenario, patch);
  });
}

export function setClockOffset(ms: number) {
  update((draft) => {
    draft.clockOffset = ms;
  });
}

export function chooseGithubIdentity(key: string) {
  update((draft) => {
    draft.githubIdentityKey = key;
  });
}

/** The demo switch between accounts (or to signed out). The person is simply signed in as that account. */
export function switchAccount(accountId: string | null) {
  update((draft) => {
    draft.sessionUserId = accountId;
    draft.lastSeen = now(draft);
    draft.welcomePendingFor = null;
    draft.expiredNotice = false;
    draft.scenario.sessionExpired = false;
  });
}

export function clearInbox() {
  update((draft) => {
    draft.mails = [];
  });
}

export function reset() {
  state = initial();
  listeners.forEach((listener) => listener());
  navigate("/");
}

// ---- Sessions -----------------------------------------------------------------------------------

/** True when the person looks signed in but the server no longer knows the session (c09, or 30 idle days). */
function sessionIsDead(sim: Sim): boolean {
  return userOf(sim) !== null && (sim.scenario.sessionExpired || now(sim) - sim.lastSeen > SESSION_TTL);
}

function endExpiredSession(draft: Sim) {
  draft.sessionUserId = null;
  draft.expiredNotice = true;
  draft.welcomePendingFor = null;
  draft.scenario.sessionExpired = false;
}

function startSession(draft: Sim, accountId: string) {
  draft.sessionUserId = accountId;
  draft.lastSeen = now(draft);
  draft.expiredNotice = false;
  draft.scenario.sessionExpired = false;
}

export async function signOut(): Promise<ApiResult<{ redirectTo: string }>> {
  await pause();
  const problem = serverProblem();
  if (problem) return problem;
  update((draft) => {
    draft.sessionUserId = null;
    draft.welcomePendingFor = null;
  });
  return ok({ redirectTo: "/" });
}

/** Failures that hit any request (c12). */
function serverProblem(): ApiResult<never> | null {
  if (state.scenario.network === "offline") return fail("network_error", "Could not reach the server. Check your connection and try again.");
  if (state.scenario.network === "database_down") return fail("internal_error", "Something went wrong. Try again later.");
  return null;
}

/** A signed-in request whose session the server no longer knows ends the session (PO L07). */
function sessionProblem(): ApiResult<never> | null {
  if (!sessionIsDead(state)) return null;
  update(endExpiredSession);
  return fail("session_expired", SESSION_EXPIRED_MESSAGE);
}

// ---- Navigation ---------------------------------------------------------------------------------

export function navigate(href: string) {
  if (sessionIsDead(state)) update(endExpiredSession);
  else if (userOf()) update((draft) => void (draft.lastSeen = now(draft)));

  const viewer = { signedIn: userOf() !== null, operator: userOf()?.roles.includes("operator") ?? false };
  let target = state.scenario.network === "database_down" && !href.startsWith("/error") && !href.startsWith("/demo-inbox")
    ? resolveHref("/error?code=internal_error", viewer)
    : resolveHref(href, viewer);

  const params = { ...target.params };
  // c14: the person arrived from an invitation, so the pages that continue it carry the way back.
  if (state.scenario.returnToInvite && ["s01", "s02", "s04"].includes(target.screen) && !params.returnTo) {
    params.returnTo = "/invite/demo-bartek";
  }
  if (target.screen === "s01" && state.expiredNotice && !params.error) params.error = "session_expired";
  target = { ...target, params };

  update((draft) => {
    draft.params[target.screen] = target.params;
  });
  document.dispatchEvent(new CustomEvent("prototype:navigate", { detail: target.screen }));
}

/** Called when the engine (or the screen picker) shows a screen. Notices that show once go away here. */
export function screenChanged(screen: ScreenId) {
  update((draft) => {
    const previous = draft.currentScreen;
    draft.currentScreen = screen;
    if (previous === screen) return;
    if (previous === "s07") draft.homeNotice = null;
    if ((previous === "s05" || previous === "s06") && draft.welcomePendingFor === draft.sessionUserId) draft.welcomePendingFor = null;
  });
}

// ---- Email and password (Flow 2) ----------------------------------------------------------------

const TOO_MANY_ATTEMPTS = "Too many attempts. Try again later";

export async function signInWithEmail(values: { email: string; password: string }, returnTo?: string): Promise<ApiResult<{ redirectTo: string }>> {
  await pause();
  const problem = serverProblem();
  if (problem) return problem;
  if (state.scenario.rateLimited) return fail("rate_limited", TOO_MANY_ATTEMPTS);
  const account = state.accounts.find((entry) => entry.email === normalize(values.email));
  if (!account?.password || account.password !== values.password) {
    return fail("invalid_credentials", "Email or password is incorrect");
  }
  if (!account.confirmed) return fail("email_not_confirmed", "Confirm your email first");
  update((draft) => startSession(draft, account.id));
  return ok({ redirectTo: safeReturnTo(returnTo) ?? "/" });
}

/** Issues a link; the mail is only delivered when sending works (c03). Returns whether it was. */
function sendConfirmation(draft: Sim, account: Account, returnTo?: string): boolean {
  draft.counter += 1;
  const token = `cf-${draft.counter}`;
  const sentAt = now(draft);
  draft.links.forEach((link) => {
    if (link.accountId === account.id && !link.usedAt) link.replaced = true;
  });
  draft.links.push({ token, accountId: account.id, sentAt });
  if (draft.scenario.mail !== "ok") return false;
  const mail = confirmationMail(account, token, sentAt);
  // The link carries returnTo in its own query string, so the path is never stored (Flow 2).
  if (returnTo) mail.href = `${mail.href}&returnTo=${encodeURIComponent(returnTo)}`;
  draft.mails.push(mail);
  return true;
}

export async function resendConfirmation(values: { email: string; password: string }, returnTo?: string): Promise<ApiResult<{ emailSent: boolean; alreadyConfirmed: boolean }>> {
  await pause();
  const problem = serverProblem();
  if (problem) return problem;
  if (state.scenario.rateLimited) return fail("rate_limited", TOO_MANY_ATTEMPTS);
  const account = state.accounts.find((entry) => entry.email === normalize(values.email));
  if (!account?.password || account.password !== values.password) {
    return fail("invalid_credentials", "Email or password is incorrect");
  }
  if (account.confirmed) return ok({ emailSent: false, alreadyConfirmed: true });
  // An exhausted address limit changes nothing; a dead SMTP server still issues the link (Flow 2).
  if (state.scenario.mail === "limit") return fail("email_not_sent", NEUTRAL_NOT_SENT);
  let sent = false;
  update((draft) => {
    sent = sendConfirmation(draft, draft.accounts.find((entry) => entry.id === account.id)!, safeReturnTo(returnTo));
  });
  // GAP LD13: the neutral text of PO O3 is not the one SignInOptions has for emailSent: false, so it goes out as an error.
  return sent ? ok({ emailSent: true, alreadyConfirmed: false }) : fail("email_not_sent", NEUTRAL_NOT_SENT);
}

export async function signUp(
  values: { displayName: string; email: string; password: string },
  returnTo?: string,
): Promise<ApiResult<{ email: string; emailSent: boolean }>> {
  await pause();
  const problem = serverProblem();
  if (problem) return problem;
  const email = normalize(values.email);
  // With the per-address allowance used up, sign-up creates nothing and sends nothing (Flow 2).
  if (state.scenario.mail === "limit") return ok({ email, emailSent: false });
  let sent = true;
  update((draft) => {
    const existing = draft.accounts.find((entry) => entry.email === email);
    if (!existing) {
      draft.counter += 1;
      const account: Account = {
        id: `n${draft.counter}`, displayName: values.displayName.trim(), email, roles: ["mentee"], password: values.password, confirmed: false,
      };
      draft.accounts.push(account);
      sent = sendConfirmation(draft, account, safeReturnTo(returnTo));
    } else if (!existing.confirmed) {
      // The last registration wins; earlier links stop working.
      existing.displayName = values.displayName.trim();
      existing.password = values.password;
      sent = sendConfirmation(draft, existing, safeReturnTo(returnTo));
    } else if (draft.scenario.mail === "ok") {
      draft.counter += 1;
      draft.mails.push(alreadyHaveAccountMail(email, `exists-${draft.counter}`, now(draft)));
    } else {
      sent = false;
    }
  });
  // Same answer whether or not the address has an account, so it never reveals which ones do.
  return ok({ email, emailSent: sent });
}

export type LinkState = { status: "valid"; email: string; account: Account } | { status: "expired" | "used" | "invalid" };

export function inspectLink(token: string, sim: Sim = state): LinkState {
  const link = sim.links.find((entry) => entry.token === token);
  const account = link && sim.accounts.find((entry) => entry.id === link.accountId);
  if (!link || !account || link.replaced) return { status: "invalid" };
  if (link.usedAt || account.confirmed) return { status: "used" };
  if (now(sim) > link.sentAt + CONFIRM_LINK_TTL) return { status: "expired" };
  return { status: "valid", email: account.email, account };
}

export async function confirmEmail(token: string, password: string, returnTo?: string): Promise<ApiResult<{ redirectTo: string }>> {
  await pause();
  const problem = serverProblem();
  if (problem) return problem;
  const link = inspectLink(token);
  if (link.status !== "valid") return fail("invalid_token", "This link isn't valid.");
  if (link.account.password !== password) return fail("invalid_credentials", "Password is incorrect");
  update((draft) => {
    draft.accounts.find((entry) => entry.id === link.account.id)!.confirmed = true;
    draft.links.find((entry) => entry.token === token)!.usedAt = now(draft);
    startSession(draft, link.account.id);
  });
  return ok({ redirectTo: safeReturnTo(returnTo) ?? "/" });
}

// ---- GitHub (Flow 1) ------------------------------------------------------------------------------

function backToSignIn(error: string, returnTo?: string): string {
  const safe = safeReturnTo(returnTo);
  return `/sign-in?error=${error}${safe ? `&returnTo=${encodeURIComponent(safe)}` : ""}`;
}

/** What the browser does after GitHub answers, given c01 and the chosen identity. Returns the next path. */
export function githubCallback(returnTo: string | undefined, denied: boolean): string {
  const { github } = state.scenario;
  if (denied || github === "denied") return backToSignIn("github_cancelled", returnTo);
  if (github === "state_expired" || github === "unavailable") return backToSignIn("github_failed", returnTo);
  if (github === "no_email") return backToSignIn("github_no_verified_email", returnTo);
  if (github === "email_taken") return backToSignIn("github_email_taken", returnTo);
  return completeGithub(returnTo);
}

/** Account resolution after the person authorized (AD3). Returns where the browser goes next. */
function completeGithub(returnTo?: string): string {
  const identity = identityOf();
  let destination = safeReturnTo(returnTo) ?? "/";
  update((draft) => {
    let account = draft.accounts.find((entry) => entry.githubLogin === identity.login);
    if (!account) {
      const sameEmail = draft.accounts.find((entry) => entry.email === identity.email);
      if (sameEmail) {
        // Link the account. An unconfirmed password and its open links are discarded (Flow 1, step 4).
        if (!sameEmail.confirmed) {
          delete sameEmail.password;
          draft.links.forEach((link) => {
            if (link.accountId === sameEmail.id && !link.usedAt) link.replaced = true;
          });
        }
        sameEmail.githubLogin = identity.login;
        sameEmail.confirmed = true;
        account = sameEmail;
      } else {
        draft.counter += 1;
        account = {
          id: `n${draft.counter}`, displayName: (identity.name?.trim() || identity.login).slice(0, 100), email: identity.email!, roles: ["mentee"], githubLogin: identity.login, confirmed: true,
        };
        draft.accounts.push(account);
        draft.welcomePendingFor = account.id;
        if (!safeReturnTo(returnTo)) destination = "/account?welcome=1";
      }
    }
    startSession(draft, account.id);
  });
  return destination;
}

// ---- Invitations (Flow 3) -------------------------------------------------------------------------

export function inspectInvitation(token: string, sim: Sim = state): Invitation | null {
  const invitation = sim.invitations.find((entry) => entry.token === token);
  if (!invitation || invitation.revoked || invitation.usedAt || now(sim) > invitation.expiresAt) return null;
  return invitation;
}

export async function acceptInvitation(token: string): Promise<ApiResult<{ redirectTo: string }>> {
  await pause();
  const problem = serverProblem() ?? sessionProblem();
  if (problem) return problem;
  const forced = state.scenario.accept;
  if (forced !== "ok") update((draft) => void (draft.scenario.accept = "ok")); // c08 hits the next request only
  const invitation = inspectInvitation(token);
  const user = userOf();
  if (!invitation || !user) return fail("invitation_invalid", "This invitation is not valid.");
  if (forced === "race") {
    // Someone else used the link between the page load and the click (404).
    update((draft) => void (draft.invitations.find((entry) => entry.token === token)!.usedAt = now(draft)));
    return fail("invitation_invalid", "This invitation is not valid.");
  }
  if (forced === "other_address" || user.email !== invitation.email) {
    return fail("forbidden", "This invitation requires the verified email address it was sent to.");
  }
  if (forced === "already_mentor" || user.roles.includes("mentor")) {
    // The account got the role elsewhere in the meantime (409); the invitation stays unconsumed.
    update((draft) => {
      const account = draft.accounts.find((entry) => entry.id === user.id)!;
      if (!account.roles.includes("mentor")) account.roles.push("mentor");
    });
    return fail("already_mentor", "You already have the mentor role.");
  }
  update((draft) => {
    draft.accounts.find((entry) => entry.id === user.id)!.roles.push("mentor");
    draft.invitations.find((entry) => entry.token === token)!.usedAt = now(draft);
    draft.homeNotice = "Invitation accepted. You're now a mentor.";
  });
  return ok({ redirectTo: "/" });
}

// ---- Account (s06) ----------------------------------------------------------------------------------

export async function saveDisplayName(values: { displayName: string }): Promise<ApiResult<{ displayName: string }>> {
  await pause();
  const problem = serverProblem() ?? sessionProblem();
  if (problem) return problem;
  const user = userOf();
  if (!user) return fail("unauthorized", SESSION_EXPIRED_MESSAGE);
  if (state.scenario.nameSaveError) {
    update((draft) => void (draft.scenario.nameSaveError = false)); // c11 hits the next request only
    return fail("validation_error", "Check the name and try again", { displayName: ["Use 1–100 characters."] });
  }
  const displayName = values.displayName.trim();
  update((draft) => {
    draft.accounts.find((entry) => entry.id === user.id)!.displayName = displayName;
  });
  return ok({ displayName });
}
