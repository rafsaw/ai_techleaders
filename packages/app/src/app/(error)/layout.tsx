import type { ReactNode } from "react";

import { ErrorHeader } from "./error-header";

// The /error area (platform P4/P7): a public route group of its own, so no
// identity-reading layout or header can ever wrap it. Nothing here resolves a
// principal, creates a request scope or touches the database; that is what
// lets /error explain a failure of exactly those dependencies.
export default function ErrorLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <ErrorHeader />
      {children}
    </>
  );
}
