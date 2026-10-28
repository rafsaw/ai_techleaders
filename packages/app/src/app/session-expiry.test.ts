import { beforeEach, describe, expect, it, vi } from "vitest";

import { navigateFully } from "@/app/full-navigation";

import { signInPath, unlessSessionExpired } from "./session-expiry";

vi.mock("@/app/full-navigation", () => ({ navigateFully: vi.fn() }));

beforeEach(() => vi.mocked(navigateFully).mockReset());

describe("signInPath", () => {
  it("carries the safe returnTo, plus the banner when a session was rejected", () => {
    expect(signInPath("/account?tab=a")).toBe("/sign-in?returnTo=%2Faccount%3Ftab%3Da");
    expect(signInPath("/backend/users", true)).toBe("/sign-in?error=session_expired&returnTo=%2Fbackend%2Fusers");
  });

  it("replaces an unsafe returnTo with /", () => {
    expect(signInPath("https://evil.example", true)).toBe("/sign-in?error=session_expired&returnTo=%2F");
  });
});

describe("unlessSessionExpired", () => {
  it.each([
    { ok: true, data: 1 },
    { ok: false, error: { code: "forbidden", message: "Forbidden" } },
    { ok: false, error: { code: "network_error", message: "Offline" } },
  ] as const)("passes %j through without navigating", async (result) => {
    await expect(unlessSessionExpired(result, "/account")).resolves.toBe(result);
    expect(navigateFully).not.toHaveBeenCalled();
  });

  it("on 401 fully navigates to sign-in with the banner and never settles (SM-AC2)", async () => {
    const pending = unlessSessionExpired({ ok: false, error: { code: "unauthorized", message: "Sign in" } }, "/backend/users");
    const settled = vi.fn();
    void pending.then(settled, settled);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(navigateFully).toHaveBeenCalledExactlyOnceWith("/sign-in?error=session_expired&returnTo=%2Fbackend%2Fusers");
    expect(settled).not.toHaveBeenCalled();
  });
});
