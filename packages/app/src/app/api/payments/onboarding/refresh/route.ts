import { errorPath } from "@devmentor/core";

import { navigationHandler } from "@/server/http";

export const GET = navigationHandler(async ({ cradle, principal }) => {
  const url = await cradle.payoutOnboardingService.refreshLink(principal);
  return url ? { externalUrl: url } : { redirectTo: "/mentor" };
}, {
  access: { role: "mentor" },
  logRoute: "/api/payments/onboarding/refresh",
  externalOrigins: ({ config }) => [config.stripe().onboardingOrigin],
  onError: (error) => error.status === 401 ? "/sign-in?returnTo=%2Fmentor" : error.status === 502 ? "/mentor?stripe=check_failed" : errorPath(error.code),
});
