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

  it.each([
    ["2001:db8::1", "2001:db8::1"],
    ["2001:0db8:0000:0000:0000:0000:0000:0001", "2001:db8::1"],
    ["2001:DB8:0:0::1", "2001:db8::1"],
    ["2001:DB8::A", "2001:db8::a"],
    // RFC 5952: the longest zero run is compressed, the first one on a tie, never a single group.
    ["1:0:0:2:0:0:0:3", "1:0:0:2::3"],
    ["2001:db8:0:0:1:0:0:1", "2001:db8::1:0:0:1"],
    ["2001:db8:0:1:1:1:1:1", "2001:db8:0:1:1:1:1:1"],
    ["0:0:0:0:0:0:0:0", "::"],
    ["0:0:0:0:0:0:0:1", "::1"],
    // Embedded IPv4 outside ::ffff:0:0/96 stays IPv6, in hex.
    ["64:ff9b::192.0.2.1", "64:ff9b::c000:201"],
    ["::192.0.2.1", "::c000:201"],
    // ::ffff:0:0:0/96 (SIIT) and a mapped-looking prefix elsewhere are not IPv4-mapped.
    ["::ffff:0:192.0.2.1", "::ffff:0:c000:201"],
    ["1::ffff:c000:201", "1::ffff:c000:201"],
  ])("returns IPv6 %j in its one canonical spelling %j", (value, canonical) => {
    expect(clientIp(request(value), trusted)).toBe(canonical);
  });

  it.each([
    "::ffff:192.0.2.1", "::FFFF:192.0.2.1", "::ffff:c000:201", "::FFFF:C000:0201",
    "0:0:0:0:0:ffff:192.0.2.1", "0000:0000:0000:0000:0000:ffff:c000:0201",
  ])("returns the IPv4-mapped address %j as plain IPv4", (value) => {
    expect(clientIp(request(value), trusted)).toBe("192.0.2.1");
  });

  it("unmaps the edges of ::ffff:0:0/96 to their IPv4 octets", () => {
    expect(clientIp(request("::ffff:0:0"), trusted)).toBe("0.0.0.0");
    expect(clientIp(request("::ffff:ffff:ffff"), trusted)).toBe("255.255.255.255");
    expect(clientIp(request("::ffff:a:1"), trusted)).toBe("0.10.0.1");
  });

  it("gives every spelling of one address the same value", () => {
    const spellings = ["2001:db8::1", "2001:0db8:0000:0000:0000:0000:0000:0001", "2001:DB8:0:0::1"];
    expect(new Set(spellings.map((value) => clientIp(request(value), trusted)))).toEqual(new Set(["2001:db8::1"]));
  });

  it("treats a list of hops as unknown instead of trusting the client-supplied first hop", () => {
    expect(clientIp(request("6.6.6.6, 203.0.113.7"), trusted)).toBeNull();
    expect(clientIp(request("6.6.6.6,203.0.113.7"), trusted)).toBeNull();
    // Two header lines are joined with ", " and are refused the same way.
    expect(clientIp(request(["6.6.6.6", "203.0.113.7"]), trusted)).toBeNull();
  });

  it.each([
    "", "unknown", "localhost", "203.0.113.7:443", "[2001:db8::1]", "fe80::1%eth0",
    "203.0.113", "256.1.1.1", "01.2.3.4", "1.2.3.04", "203.0.113.7 203.0.113.8",
    "::ffff:01.2.3.4", "00000::1", "1:2:3:4:5:6:7:8:9", "1::2::3", "2001:db8::g",
  ])("treats a malformed header %j as unknown", (value) => {
    expect(clientIp(request(value), trusted)).toBeNull();
  });

  it("is unknown when the trusted edge sent no header", () => {
    expect(clientIp(request(), trusted)).toBeNull();
  });
});
