import { z } from "zod";

/** Countries supported for self-serve Connect onboarding from a US platform. */
export const onboardingCountries = [
  "US", "GB", "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR", "HR", "HU", "IE", "IS", "IT", "LI", "LT", "LU", "LV", "MT", "NL", "NO", "PL", "PT", "RO", "SE", "SI", "SK", "CA", "CH",
] as const;

export const onboardingCountrySchema = z.enum(onboardingCountries);
export type OnboardingCountry = z.output<typeof onboardingCountrySchema>;

export const onboardingStartSchema = z.object({ country: onboardingCountrySchema });
export type OnboardingStartInput = z.output<typeof onboardingStartSchema>;
