import type { ReactNode } from "react";
import { InfoIcon } from "lucide-react";

import { Alert, AlertTitle } from "@devmentor/ui/components/alert";
import { WELCOME_TITLE } from "@devmentor/ui/components/auth/WelcomeNotice";
import { Badge } from "@devmentor/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@devmentor/ui/components/card";
import { Separator } from "@devmentor/ui/components/separator";

// /account (E01, signed-in area): the editable display name (the page passes its CrudForm as
// children) and the read-only email, roles and sign-in methods from AccountDto. Values that
// cannot change are text, not disabled fields (P-C6). Docs: account-summary.mdx.

export interface AccountSummaryProps {
  email: string;
  /** As stored, e.g. ["mentee", "mentor"]. */
  roles: readonly string[];
  signInMethods: { github: boolean; password: boolean };
  /** `/account?welcome=1` after the first GitHub sign-in (E01 Flow 1, step 5). */
  welcome?: boolean;
  /** The display-name form (`CrudForm` with `resetOnSuccess={false}`). */
  children: ReactNode;
}

export function AccountSummary({ email, roles, signInMethods, welcome = false, children }: AccountSummaryProps) {
  const methods = [signInMethods.github && "GitHub", signInMethods.password && "Email and password"].filter(Boolean);
  return (
    <Card data-slot="account-summary" className="w-full max-w-text">
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          Account
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-between-groups">
        {welcome ? (
          <Alert role="status">
            <InfoIcon aria-hidden />
            <AlertTitle>{WELCOME_TITLE}</AlertTitle>
          </Alert>
        ) : null}
        {children}
        <Separator />
        <dl className="grid gap-between-groups">
          <div className="flex flex-col gap-list-row-gap">
            <dt className="text-meta text-muted-foreground">Email</dt>
            <dd className="wrap-anywhere">{email}</dd>
          </div>
          <div className="flex flex-col gap-list-row-gap">
            <dt className="text-meta text-muted-foreground">Roles</dt>
            <dd className="flex flex-wrap gap-in-group">
              {roles.map((role) => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </dd>
          </div>
          <div className="flex flex-col gap-list-row-gap">
            <dt className="text-meta text-muted-foreground">Sign-in methods</dt>
            <dd>{methods.join(", ")}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
