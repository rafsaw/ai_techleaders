import { describe, expect, it } from "vitest";

import { onboardingCountries, onboardingStartSchema } from "./onboarding-start.schema";

describe("onboardingStartSchema", () => {
  it("accepts each supported country code", () => {
    for (const country of onboardingCountries) {
      expect(onboardingStartSchema.parse({ country })).toEqual({ country });
    }
  });

  it.each(["PL ", "AU", "XX", "us", "", null, 1, undefined])(
    "rejects unsupported or malformed country %j",
    (country) => {
      expect(onboardingStartSchema.safeParse({ country }).success).toBe(false);
    },
  );

  it("requires country and strips unknown request fields", () => {
    expect(onboardingStartSchema.safeParse({}).success).toBe(false);
    expect(onboardingStartSchema.parse({ country: "US", extra: true })).toEqual({ country: "US" });
  });
});
