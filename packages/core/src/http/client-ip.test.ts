import { describe, expect, it } from "vitest";

import { clientIp } from "../index";

function request(forwardedFor?: string | string[]): Request {
  const headers = new Headers();
  for (const value of [forwardedFor ?? []].flat()) headers.append("x-forwarded-for", value);
  return new Request("http://localhost/api/auth/sign-in", { method: "POST", headers });
}

const trusted = { trustProxy: true };

describe("clientIp", () => {
  it("is unknown without TRUST_PROXY, even when the header looks valid", () => {
    expect(clientIp(request("203.0.113.7"), { trustProxy: false })).toBeNull();
    expect(clientIp(request(), { trustProxy: false })).toBeNull();
  });

  it("accepts the single address a trusted edge wrote", () => {
    expect(clientIp(request("203.0.113.7"), trusted)).toBe("203.0.113.7");
    expect(clientIp(request("2001:db8::1"), trusted)).toBe("2001:db8::1");
    // Headers strip surrounding whitespace before the app sees them.
    expect(clientIp(request(" 198.51.100.2 "), trusted)).toBe("198.51.100.2");
  });

  it("returns IPv6 in lowercase so one address has one bucket", () => {
    expect(clientIp(request("2001:DB8::A"), trusted)).toBe("2001:db8::a");
    expect(clientIp(request("::FFFF:192.0.2.1"), trusted)).toBe("::ffff:192.0.2.1");
  });

  it("treats a list of hops as unknown instead of trusting the client-supplied first hop", () => {
    expect(clientIp(request("6.6.6.6, 203.0.113.7"), trusted)).toBeNull();
    expect(clientIp(request("6.6.6.6,203.0.113.7"), trusted)).toBeNull();
    // Two header lines are joined with ", " and are refused the same way.
    expect(clientIp(request(["6.6.6.6", "203.0.113.7"]), trusted)).toBeNull();
  });

  it.each([
    "", "unknown", "localhost", "203.0.113.7:443", "[2001:db8::1]", "fe80::1%eth0",
    "203.0.113", "256.1.1.1", "01.2.3.4", "203.0.113.7 203.0.113.8",
  ])("treats a malformed header %j as unknown", (value) => {
    expect(clientIp(request(value), trusted)).toBeNull();
  });

  it("is unknown when the trusted edge sent no header", () => {
    expect(clientIp(request(), trusted)).toBeNull();
  });
});
