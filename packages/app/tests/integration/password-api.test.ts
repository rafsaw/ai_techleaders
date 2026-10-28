import { randomUUID } from "node:crypto";

import pg from "pg";
import { afterAll, describe, expect, inject, it } from "vitest";

import { linksIn, MailpitInbox } from "./mailpit";

/**
 * Email and password accounts through the real API (E01 step 2.5): sign-up
 * sends a confirmation link to Mailpit, sign-in is refused until the address
 * is confirmed, and confirming with the password starts a session. The
 * browser flows arrive with the pages in step 2.6.
 */
describe("password account API", () => {
  const baseURL = inject("baseURL");
  const inbox = new MailpitInbox(inject("mailpitURL"));
  const email = `ada-${randomUUID()}@example.com`;

  // Other scenarios count the users, so this one removes its account (roles,
  // sessions and links cascade) and its buckets whatever the order of files.
  afterAll(async () => {
    const client = new pg.Client({ connectionString: inject("databaseURL") });
    await client.connect();
    try {
      await client.query("delete from users where email = $1", [email]);
      await client.query("delete from rate_limit_buckets");
    } finally {
      await client.end();
    }
  });

  function post(path: string, body: unknown, cookie?: string) {
    return fetch(new URL(path, baseURL), {
      method: "POST",
      headers: { "content-type": "application/json", "x-devmentor-csrf": "1", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
      redirect: "manual",
    });
  }

  function sessionCookie(response: Response): string {
    const header = response.headers.getSetCookie().find((value) => value.startsWith("devmentor_session="));
    expect(header).toBeDefined();
    return header!.split(";")[0]!;
  }

  it("signs up, refuses sign-in until confirmed, confirms with the password and signs in", async () => {
    const password = "a teapot on the windowsill";

    const signUp = await post("/api/auth/sign-up", { displayName: "Ada", email: email.toUpperCase(), password, returnTo: "/account" });
    expect(signUp.status).toBe(201);
    expect(await signUp.json()).toEqual({ ok: true, data: { email, emailSent: true } });

    const message = await inbox.waitForMessageTo(email);
    expect(message.Subject).toBe("Confirm your email address for DevMentor");
    const link = linksIn(message.Text).find((url) => url.pathname === "/confirm-email")!;
    expect(link.searchParams.get("returnTo")).toBe("/account");

    const early = await post("/api/auth/sign-in", { email, password });
    expect(early.status).toBe(403);
    expect((await early.json()).error.code).toBe("email_not_confirmed");

    const wrong = await post("/api/auth/confirm-email", { token: link.searchParams.get("token"), password: "not the right phrase" });
    expect(wrong.status).toBe(401);

    const confirm = await post("/api/auth/confirm-email", {
      token: link.searchParams.get("token"), password, returnTo: link.searchParams.get("returnTo"),
    });
    expect(confirm.status).toBe(200);
    expect(await confirm.json()).toEqual({ ok: true, data: { redirectTo: "/account" } });
    const cookie = sessionCookie(confirm);

    const account = await fetch(new URL("/api/account", baseURL), { headers: { cookie } });
    expect((await account.json()).data).toMatchObject({ email, displayName: "Ada", roles: ["mentee"], signInMethods: { github: false, password: true } });

    const again = await post("/api/auth/confirm-email", { token: link.searchParams.get("token"), password });
    expect(again.status).toBe(404);
    expect((await again.json()).error.message).toBe("Your address is already confirmed. Sign in");

    const signIn = await post("/api/auth/sign-in", { email, password });
    expect(signIn.status).toBe(200);
    expect(await signIn.json()).toEqual({ ok: true, data: { redirectTo: "/" } });
    sessionCookie(signIn);

    // Registering the confirmed address again changes nothing and says so by email.
    const repeat = await post("/api/auth/sign-up", { displayName: "Mallory", email, password: "another long phrase here" });
    expect(await repeat.json()).toEqual({ ok: true, data: { email, emailSent: true } });
    await expect.poll(async () => (await inbox.messagesTo(email)).length).toBe(2);

    // Sign-in and confirmation share rule 2 (5 per address per 15 minutes):
    // this is the sixth attempt for the address.
    const limited = await post("/api/auth/sign-in", { email, password });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await limited.json()).error).toEqual({ code: "rate_limited", message: "Too many attempts. Try again later" });
  });
});
