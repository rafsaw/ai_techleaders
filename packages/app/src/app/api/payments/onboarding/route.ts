import { parseInput, readJsonBody } from "@devmentor/core";
import { onboardingStartSchema } from "@devmentor/core/validators/payments/onboarding-start.schema";

import { apiHandler } from "@/server/http";

export const POST = apiHandler(async ({ req, cradle, principal }) => {
  const { country } = parseInput(onboardingStartSchema, await readJsonBody(req));
  return cradle.payoutOnboardingService.start(principal, country);
}, { access: { role: "mentor" }, logRoute: "/api/payments/onboarding" });
