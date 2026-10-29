import { first, INVITATION_ACCEPTED_FLAG } from "@/app/(frontend)/auth-links";
import { InvitationAcceptedNotice } from "@/app/(frontend)/invitation-accepted-notice";
import { getPrincipal } from "@/server/auth/page-guards";

type SearchParams = Record<string, string | string[] | undefined>;

// Frontend (public) pages: styled with plain Tailwind utilities. Like every
// public leaf, it reads the principal so a signed-in visit records activity.
// The header carries the sign-in state (and **Backend** for operators).
// After an invitation is accepted (`?invitation=accepted`), a mentor sees the
// one-time "Invitation accepted" notice (SM-AC8a); anyone else sees nothing.
export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const principal = await getPrincipal();
  const accepted = first(params[INVITATION_ACCEPTED_FLAG]) === "accepted" && (principal?.roles.includes("mentor") ?? false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-24">
      {accepted ? <InvitationAcceptedNotice /> : null}
      <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
        AI Techleaders
      </p>
      <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
        DevMentor
      </h1>
      <p className="max-w-xl text-lg text-pretty text-muted-foreground">
        A project for tech leaders who use AI in their teams&apos; daily work.
      </p>
    </main>
  );
}
