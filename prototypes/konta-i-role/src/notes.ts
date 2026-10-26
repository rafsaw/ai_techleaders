import type { ScreenId } from "./routes";

// One note per screen for reviewers (shown in the screen map, hidden in presentation mode):
// which stories it serves, what is a simulation, what the prototype does not decide.
// Story numbers are the backlog's (#34-#36), as in the approved map. Gaps: LD = design system, L/O = spec.

export interface ScreenNote {
  stories: string;
  simulated: string;
  open: string;
}

export const NOTES: Record<ScreenId, ScreenNote> = {
  s01: {
    stories: "#34 AC1, AC4 (GitHub first, cancel or deny); #35 AC3 (unconfirmed account, Resend confirmation).",
    simulated: "GitHub (s14), sending the confirmation email (c03), the sign-in limit (c05) and an expired session (c09). Passwords are demo passwords, never checked against anything real.",
    open: "Wording of the expired-session banner and of the resend failure (LD06, LD13, PO O3). The limit shows only its message, no countdown, and its numbers (5 attempts per 15 minutes) are not shown.",
  },
  s02: {
    stories: "#35 AC1 (register, cannot sign in before confirming); #36 AC1 (registering with the invited address).",
    simulated: "Creating the account and sending the email. An address that already has an account gets the same answer; only the email in s13 differs.",
    open: "The 72-byte and common-password messages and the list of common passwords are simulation choices (spec AD6 gives the rules, not the words). The sign-up limit (429) is documented, not shown.",
  },
  s03: {
    stories: "#35 AC1.",
    simulated: "Sending the email. \"Not sent\" covers both a dead SMTP server and a used-up address limit and gives no reason (PO L09, O3).",
    open: "The page has no resend button: resending goes through sign-in, as the spec says. Opening it without an email redirects to sign-up (L22).",
  },
  s04: {
    stories: "#35 AC2 (confirm with link and password); AC4 (expired or used link says why).",
    simulated: "Link inspection (valid, expired, used, replaced, claimed by GitHub) and the password check. The link is opened from the demo inbox.",
    open: "A replaced or claimed link gets a neutral message (PO L11), which contradicts the design system panel's text (LD15). A second tab confirming first and the 429 are documented, not shown (LD05).",
  },
  s05: {
    stories: "#36 AC1 (accept, role added), AC2 (invalid link, one message), AC3 (mentee becomes mentee and mentor). AC4 has no screen: it is a test that no public path grants the mentor role. #46 (operator creates the invitation) has no screen either; its effect is the email in s13.",
    simulated: "The invitation, its expiry and revocation, accepting, and the three accept failures (c08). The first GitHub sign-in notice about the public name shows once.",
    open: "What state an invitation is in after the operator's email failed to send (L14, O2). No way to link two accounts: a different address means ask for a new invitation or use a separate account (L15).",
  },
  s06: {
    stories: "#34 AC2 (name editable), AC3 (no duplicate account on the second GitHub sign-in); #36 AC3 (several roles).",
    simulated: "Saving the name (c11), the expired session on save (c09). The public-name notice shows once; the real mechanism for remembering it is left to implementation (O5).",
    open: "The design system's CrudForm resets the field after saving; the spec wants it kept (LD08). Unsaved changes are lost when the session has expired (PO L07).",
  },
  s07: {
    stories: "#36 AC1 (message after accepting).",
    simulated: "The header for four kinds of visitor. Nothing else on the page is a feature.",
    open: "No dashboard, no mentor listing, no \"Mentor setup\" link: those belong to later epics (PO L02, L20, O8).",
  },
  s08: {
    stories: "Access control (spec AD4), not a story.",
    simulated: "Who may enter /backend. Mentees and mentors get the neutral 404 (s11); signed-out visitors are sent to sign-in.",
    open: "The real backend pages are not prototyped (PO L17, L18). Roles changing during a session (c10) are documented in the map, not simulated.",
  },
  s11: {
    stories: "Access control (PO L05), not a story.",
    simulated: "The neutral 404 that any signed-in person without the role sees.",
    open: "No design-system story for it (LD02). Authorization of the API is independent of this page and not shown.",
  },
  s12: {
    stories: "No story. Spec UI/UX: a minimal public error page.",
    simulated: "Reached when the database is unavailable (c12). It has no identity and no personalised header.",
    open: "No design-system screen and no approved wording (LD03). The real page also covers a missing GitHub configuration.",
  },
  s13: {
    stories: "#35 AC2, AC4 (the link); #36 AC1 (the invitation email).",
    simulated: "The whole mailbox. No email is sent. Texts are the ones approved for the prototype (PO L12), not production templates; expiry dates come from each invitation.",
    open: "Not part of the product and not in the design system (LD09). Real email templates are out of scope.",
  },
  s14: {
    stories: "#34 AC1, AC4.",
    simulated: "GitHub's authorization page and its answers (c01). It is not GitHub and never asks for a password.",
    open: "No OAuth state or PKCE here, only their outcomes. Not in the design system (LD10).",
  },
};
