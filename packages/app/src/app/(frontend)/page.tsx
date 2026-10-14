import Link from "next/link";

// Frontend (public) pages: styled with plain Tailwind utilities.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium tracking-widest text-neutral-500 uppercase">
        AI Techleaders
      </p>
      <h1 className="text-5xl font-semibold tracking-tight text-neutral-950 sm:text-6xl">
        DevMentor
      </h1>
      <p className="max-w-xl text-lg text-pretty text-neutral-600">
        A project for tech leaders who use AI in their teams&apos; daily work.
      </p>
      <div>
        <Link
          href="/backend"
          className="inline-flex items-center rounded-md bg-neutral-950 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
        >
          Open backend
        </Link>
      </div>
    </main>
  );
}
