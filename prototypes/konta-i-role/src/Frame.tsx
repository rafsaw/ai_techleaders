import type { ReactNode } from "react";

import { SiteHeader } from "@devmentor/ui/components/auth/SiteHeader";
import { cn } from "@devmentor/ui/lib/utils";

import { navigate, signOut, useSim, userOf } from "./sim";
import { NOTES } from "./notes";
import { SCREENS, type ScreenId } from "./routes";

// The page frame of every product screen: the real SiteHeader over a main column on the header's own
// grid. The same frame the design system's screen stories use (.storybook/blocks/screen.tsx), which
// is not exported from the package, so it is rebuilt here from the same tokens.

export function Frame({ title, width = "text", children }: { title?: string; width?: "text" | "content"; children: ReactNode }) {
  const sim = useSim();
  const user = userOf(sim);
  return (
    <div className="min-h-96 bg-background text-foreground">
      <SiteHeader
        // GAP LD14: SiteHeader shows "Mentor setup" to every mentor, but the approved map hides it in
        // Epic 01 (O8). The header gets the roles without "mentor"; the account page shows all roles.
        account={user ? { displayName: user.displayName, roles: user.roles.filter((role) => role !== "mentor") } : null}
        signOut={signOut}
        onSignedOut={(to) => navigate(to)}
      />
      <main className="mx-auto w-full max-w-content px-page-gutter py-section">
        <div className={cn("flex flex-col gap-component", width === "text" && "max-w-text")}>
          {title ? <h1 className="text-page-title">{title}</h1> : null}
          {children}
        </div>
      </main>
    </div>
  );
}

/** The wrapper the review engine expects: .screen > .screen-meta + .frame. */
export function ScreenSection({ id, children }: { id: ScreenId; children: ReactNode }) {
  const meta = SCREENS.find((screen) => screen.id === id)!;
  const note = NOTES[id];
  return (
    <section className="screen" id={id}>
      <div className="screen-meta">
        <h2>
          {id} · {meta.title}
        </h2>
        <p>
          <code>{meta.path}</code> · Seen by: {meta.visible} · Stories: {meta.stories}
        </p>
      </div>
      <div className="frame">{children}</div>
      <div className="notes">
        <div className="note">
          <p>
            <strong>Stories:</strong> {note.stories}
          </p>
          <p>
            <strong>Simulated:</strong> {note.simulated}
          </p>
          <p>
            <strong>Not decided here:</strong> {note.open}
          </p>
        </div>
      </div>
    </section>
  );
}
