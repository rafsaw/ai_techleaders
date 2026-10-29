import { navigationHandler } from "@/server/http";
import { signInErrorPath } from "@/server/services/auth/github-sign-in.service";

// GitHub's OAuth callback (accounts Flow 1). Success starts a session and
// goes to `returnTo` (or `/account?welcome=1` for a new account); every
// failure goes back to `/sign-in?error=…` keeping the validated `returnTo`.
export const GET = navigationHandler(
  ({ cradle, req, cookies, url }) => cradle.githubSignInService.complete(url.searchParams, req, cookies),
  {
    access: "public",
    logRoute: "/api/auth/github/callback",
    onError: signInErrorPath,
  },
);
