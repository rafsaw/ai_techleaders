import { afterEach, describe, expect, it } from "vitest";

import { navigateFully } from "./full-navigation";

// jsdom implements only same-document (hash) navigations, which is enough to
// see the validated destination reach `location.assign`.
afterEach(() => window.history.replaceState(null, "", "/"));

describe("navigateFully", () => {
  it("navigates to a safe internal path", () => {
    navigateFully("/#signed-out");
    expect(window.location.pathname).toBe("/");
    expect(window.location.hash).toBe("#signed-out");
  });

  it.each(["https://evil.example/#x", "//evil.example/#x", "/api/auth/sign-out#x", undefined])(
    "falls back to / for the unsafe destination %s", (destination) => {
      window.history.replaceState(null, "", "/#before");
      navigateFully(destination);
      expect(window.location.href).toBe(`${window.location.origin}/`);
    });
});
