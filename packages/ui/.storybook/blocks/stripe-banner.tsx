import { CircleCheckIcon, InfoIcon, OctagonXIcon, TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@devmentor/ui/components/alert";
import { buttonVariants } from "@devmentor/ui/components/button";

// Story-only: the /mentor banners after Stripe, shared by Patterns/Provider status and
// Screens/E02/Mentor setup. Never exported from the package.

// The banners on /mentor?stripe=returned and ?stripe=check_failed (E02 Flow 3 step 6). Copy is the
// spec's; the variants follow the approved status mapping (badge.mdx): P-PS1, proposal approved by Rafał.
export const STRIPE_BANNERS = {
  ready: { variant: "success", Icon: CircleCheckIcon, role: "status", title: "Stripe confirmed your account.", body: undefined },
  pending: {
    variant: "default",
    Icon: InfoIcon,
    role: "status",
    title: "Stripe is checking your details.",
    body: "This can take a few minutes to a few business days.",
  },
  incomplete: { variant: "warning", Icon: TriangleAlertIcon, role: "status", title: "Stripe onboarding isn't finished.", body: "Continue where you left off." },
  blocked: { variant: "destructive", Icon: OctagonXIcon, role: "alert", title: "Stripe can't enable payouts for this account.", body: "Contact the DevMentor team." },
  check_failed: {
    variant: "destructive",
    Icon: OctagonXIcon,
    role: "alert",
    title: "We couldn't reach Stripe to check your status.",
    // The spec's second sentence, "Try checking again.", is the link itself.
    body: undefined,
  },
} as const;


export type StripeBannerKind = keyof typeof STRIPE_BANNERS;

export const RETURN_ROUTE = "/api/payments/onboarding/return";

export function StripeBanner({ banner }: { banner: StripeBannerKind }) {
  const shown = STRIPE_BANNERS[banner];
  return (
    <Alert variant={shown.variant} role={shown.role}>
      <shown.Icon aria-hidden />
      <AlertTitle>{shown.title}</AlertTitle>
      {shown.body ? <AlertDescription>{shown.body}</AlertDescription> : null}
      {banner === "check_failed" ? (
        <AlertDescription>
          <a href={RETURN_ROUTE} className={buttonVariants({ variant: "secondary", size: "sm" })}>Try checking again</a>
        </AlertDescription>
      ) : null}
    </Alert>
  );
}
