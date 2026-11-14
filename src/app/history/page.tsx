import Link from "next/link";

/**
 * Episode history — Developer 2 UI; backed by GET /api/podcast/history.
 */
export default function HistoryPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Home
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Podcast history</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Scaffold only. Fetch <code className="font-mono text-sm">/api/podcast/history</code>{" "}
        and list prior sessions here.
      </p>
    </main>
  );
}
