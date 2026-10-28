import { getPrincipal } from "@/server/auth/page-guards";

// Frontend (public) pages: styled with plain Tailwind utilities. Like every
// public leaf, it reads the principal so a signed-in visit records activity.
// The header carries the sign-in state (and **Backend** for operators).
export default async function Home() {
  await getPrincipal();
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-24">
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
