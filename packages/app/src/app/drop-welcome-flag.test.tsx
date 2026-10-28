// jsdom: the helper reads and replaces the browser address.
import { afterEach, describe, expect, it } from "vitest";

import { dropWelcomeFlag } from "@/app/drop-welcome-flag";

const address = () => `${window.location.pathname}${window.location.search}${window.location.hash}`;

afterEach(() => window.history.replaceState(null, "", "/"));

describe("dropWelcomeFlag (SM-AC7)", () => {
  it.each([
    ["/account?welcome=1", "/account"],
    ["/account?tab=x&welcome=1#top", "/account?tab=x#top"],
    ["/account?welcome=1&tab=x", "/account?tab=x"],
    ["/mentors?page=2&welcome=1&q=a%20b#list", "/mentors?page=2&q=a+b#list"],
    ["/?welcome=1#top", "/#top"],
  ])("turns %s into %s", (from, to) => {
    window.history.replaceState(null, "", from);
    dropWelcomeFlag();
    expect(address()).toBe(to);
  });

  it("keeps history.state for the Next.js router", () => {
    window.history.replaceState({ tree: "next" }, "", "/account?welcome=1");
    dropWelcomeFlag();
    expect(window.history.state).toEqual({ tree: "next" });
  });
});
