import { describe, expect, it } from "vitest";

import { resolveHref, safeReturnTo, SCREENS, type Viewer } from "./routes";

const anon: Viewer = { signedIn: false, operator: false };
const mentee: Viewer = { signedIn: true, operator: false };
const operator: Viewer = { signedIn: true, operator: true };

describe("safeReturnTo", () => {
  it("keeps a same-origin page path", () => {
    expect(safeReturnTo("/invite/demo-bartek")).toBe("/invite/demo-bartek");
  });

  it.each([undefined, null, "", "https://evil.test", "//evil.test", "/\\evil", "/api/users", "/_next/x", `/${"a".repeat(512)}`])(
    "rejects %s",
    (value) => {
      expect(safeReturnTo(value)).toBeUndefined();
    },
  );
});

describe("resolveHref: screens keep the ids of the approved map", () => {
  it.each([
    ["/", anon, "s07"],
    ["/sign-in", anon, "s01"],
    ["/sign-up", anon, "s02"],
    ["/sign-up/check-email?email=a%40b.test", anon, "s03"],
    ["/confirm-email?token=ewa-valid", anon, "s04"],
    ["/confirm-email?token=ewa-valid", operator, "s04"],
    ["/invite/demo-bartek", anon, "s05"],
    ["/invite/demo-bartek", mentee, "s05"],
    ["/account", mentee, "s06"],
    ["/backend", operator, "s08"],
    ["/error?code=internal_error", anon, "s12"],
    ["/demo-inbox", anon, "s13"],
    ["/api/auth/github", anon, "s14"],
  ] as const)("%s as %o opens %s", (href, viewer, screen) => {
    expect(resolveHref(href, viewer).screen).toBe(screen);
  });

  it("opens only screens that exist", () => {
    const ids = SCREENS.map((screen) => screen.id);
    for (const href of ["/", "/sign-in", "/account", "/backend", "/nowhere", "/invite/x"]) {
      expect(ids).toContain(resolveHref(href, mentee).screen);
    }
  });
});

describe("resolveHref: access gates", () => {
  it("sends a signed-out visitor from /account to sign-in and remembers the way back", () => {
    expect(resolveHref("/account", anon)).toEqual({ screen: "s01", params: { returnTo: "/account" } });
  });

  it("sends a signed-out visitor from /backend to sign-in and remembers the way back", () => {
    expect(resolveHref("/backend", anon)).toEqual({ screen: "s01", params: { returnTo: "/backend" } });
  });

  it("gives a mentee or mentor the neutral 404 for /backend", () => {
    expect(resolveHref("/backend", mentee).screen).toBe("s11");
  });

  it("gives any unknown page the neutral 404", () => {
    expect(resolveHref("/mentor", mentee).screen).toBe("s11");
  });

  it("sends a signed-in person away from the sign-in pages, to / or a safe returnTo (L06)", () => {
    expect(resolveHref("/sign-in", mentee).screen).toBe("s07");
    expect(resolveHref("/sign-up", mentee).screen).toBe("s07");
    expect(resolveHref("/sign-in?returnTo=%2Faccount", mentee).screen).toBe("s06");
    expect(resolveHref("/sign-in?returnTo=%2Fsign-up", mentee).screen).toBe("s07");
    expect(resolveHref("/sign-in?returnTo=https%3A%2F%2Fevil.test", mentee).screen).toBe("s07");
  });

  it("sends /sign-up/check-email without an email to sign-up (L22)", () => {
    expect(resolveHref("/sign-up/check-email", anon).screen).toBe("s02");
  });
});

describe("resolveHref: parameters", () => {
  it("carries returnTo and the GitHub error code to sign-in", () => {
    expect(resolveHref("/sign-in?error=github_cancelled&returnTo=%2Finvite%2Fdemo-bartek", anon).params).toEqual({
      error: "github_cancelled",
      returnTo: "/invite/demo-bartek",
    });
  });

  it("drops an unsafe returnTo", () => {
    expect(resolveHref("/sign-up?returnTo=//evil.test", anon).params).toEqual({});
  });

  it("passes the invitation token and the welcome flag", () => {
    expect(resolveHref("/invite/demo-celina", anon).params).toEqual({ token: "demo-celina" });
    expect(resolveHref("/account?welcome=1", mentee).params).toEqual({ welcome: "1" });
  });

  it("marks a check-email page whose mail was not sent", () => {
    expect(resolveHref("/sign-up/check-email?email=a%40b.test&sent=0", anon).params).toEqual({ email: "a@b.test", sent: "0" });
  });
});
