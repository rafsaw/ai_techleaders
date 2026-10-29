import { isAppError, ValidationError } from "@devmentor/core";
import { describe, expect, it, vi } from "vitest";

import {
  INVITE_OPTIONS,
  INVITE_USAGE,
  InvitationEmailNotSentError,
  parseInviteFlags,
  reportDelivery,
  resendCommandLine,
} from "@/server/cli/commands/invite-flags";

function refusal(values: Record<string, string | boolean | undefined>): ValidationError {
  try {
    parseInviteFlags(values);
  } catch (error) {
    return error as ValidationError;
  }
  throw new Error("expected a refusal");
}

const RESULT = { id: "inv-1", email: "ada@example.com", expiresAt: new Date("2026-11-11T12:00:00.000Z") };

describe("invite flags", () => {
  it("declares --email plus the two refused flags, and documents only --email", () => {
    expect(INVITE_OPTIONS).toEqual({ email: { type: "string" }, note: { type: "string" }, "expires-in-days": { type: "string" } });
    expect(INVITE_USAGE).toBe("--email <email>");
  });

  it("normalizes the address with the account email rules", () => {
    expect(parseInviteFlags({ email: "  Ada@Example.COM " })).toEqual({ email: "ada@example.com" });
  });

  it("refuses invalid, missing and over-long addresses", () => {
    expect(refusal({ email: "nope" }).fieldErrors).toEqual({ email: ["--email must be a valid email address."] });
    expect(refusal({}).message).toBe("--email must be a valid email address.");
    expect(refusal({ email: `${"a".repeat(250)}@b.co` }).message).toBe("--email must be a valid email address.");
  });

  it("refuses --note and --expires-in-days even with a valid address", () => {
    const note = refusal({ email: "ada@example.com", note: "hi" });
    expect(note).toBeInstanceOf(ValidationError);
    expect(note.fieldErrors).toEqual({ note: ["--note is not supported: invitations carry no note."] });
    expect(refusal({ email: "ada@example.com", "expires-in-days": "30" }).message)
      .toBe("--expires-in-days is not supported: invitations always expire after 14 days.");
    expect(refusal({ note: "" }).message).toMatch(/^--note/);
  });
});

describe("reportDelivery", () => {
  it("prints id, email, expiry and an accepted delivery", () => {
    const out = { info: vi.fn() };
    reportDelivery("created", { ...RESULT, emailSent: true }, out);
    expect(out.info.mock.calls).toEqual([
      ["Invitation created: id inv-1, email ada@example.com, expires 2026-11-11T12:00:00.000Z."],
      ["Delivery: email accepted by the mail server."],
    ]);
  });

  it("prints the status, then fails with a safe message that asks for resend", () => {
    const out = { info: vi.fn() };
    let thrown: unknown;
    try {
      reportDelivery("created", { ...RESULT, emailSent: false }, out);
    } catch (error) {
      thrown = error;
    }
    expect(out.info).toHaveBeenCalledWith("Invitation created: id inv-1, email ada@example.com, expires 2026-11-11T12:00:00.000Z.");
    expect(thrown).toBeInstanceOf(InvitationEmailNotSentError);
    expect(isAppError(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      code: "email_not_sent",
      message:
        "Delivery: failed, the invitation email was not sent. The invitation is saved. " +
        "Send a new link with: npm run operator -- invite resend --email ada@example.com",
    });
  });

  it("says the previous link no longer works after a failed resend", () => {
    expect(() => reportDelivery("resent", { ...RESULT, emailSent: false }, { info: vi.fn() }))
      .toThrow("The invitation is saved. Its previous link no longer works. Send a new link with:");
  });

  it("builds the resend command line", () => {
    expect(resendCommandLine("x@example.com")).toBe("npm run operator -- invite resend --email x@example.com");
  });
});
