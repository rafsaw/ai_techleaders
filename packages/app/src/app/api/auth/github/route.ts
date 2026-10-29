import { navigationHandler } from "@/server/http";

// Starts GitHub sign-in (accounts Flow 1): sets the OAuth cookie and sends
// the browser to GitHub. The only external destination is the configured
// OAuth origin (platform P7).
export const GET = navigationHandler(
  async ({ cradle, cookies, url }) => ({
    externalUrl: cradle.githubSignInService.begin(url.searchParams.get("returnTo"), cookies),
  }),
  {
    access: "public",
    logRoute: "/api/auth/github",
    externalOrigins: ({ config }) => [config.github().oauthUrl],
  },
);
