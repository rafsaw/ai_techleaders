import { useEffect } from "react";

import { ReviewBar } from "./ReviewBar";
import { Screens } from "./screens";

declare global {
  interface Window {
    __PROTOTYPE_START__?: () => boolean;
  }
}

export function App() {
  // The review engine needs the permanent screen sections in the DOM: start it once React has committed them
  // (start() ignores a second call, which StrictMode makes in development).
  useEffect(() => {
    window.__PROTOTYPE_START__?.();
  }, []);

  return (
    <>
      <ReviewBar />
      <div className="doc">
        <div className="doc-head">
          <h1>DevMentor, Epic 01: accounts and access</h1>
          <p>
            A clickable prototype with fictional data. Payments, email and GitHub sign-in are simulated. Nothing here
            is a real service, and no real card, password or email address is collected.
          </p>
        </div>
        <Screens />
      </div>
    </>
  );
}
