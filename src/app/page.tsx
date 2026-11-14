import Link from "next/link";

/**
 * Home — Developer 2 owns the final design.
 * This is a structural scaffold with routes Dev 2 can restyle.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
          SanD Hacks 2026
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Interactive AI Podcast
        </h1>
        <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          Assemble your panel, generate a news briefing, and join the
          conversation. Frontend and audio UI belong to Developer 2.
        </p>
      </div>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/configure"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Configure podcast
        </Link>
        <Link
          href="/history"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
        >
          History
        </Link>
      </nav>
    </main>
  );
}
