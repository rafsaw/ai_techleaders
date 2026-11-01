import { errorPath } from "@devmentor/core";

import { navigationHandler } from "@/server/http";

export const GET = navigationHandler(async ({ cradle, principal }) => ({
  redirectTo: await cradle.payoutOnboardingService.syncFromReturn(principal) ? "/mentor?stripe=returned" : "/mentor",
}), {
  access: { role: "mentor" },
  logRoute: "/api/payments/onboarding/return",
  onError: (error) => error.status === 401 ? "/sign-in?returnTo=%2Fmentor" : error.status === 502 ? "/mentor?stripe=check_failed" : errorPath(error.code),
});
