import Link from "next/link";
import { Suspense } from "react";

/**
 * Interactive podcast player — Developer 2 primary surface.
 * Params are awaited inside Suspense for Next.js Cache Components.
 */
export default function PodcastPlayerPage({
  params,
}: PageProps<"/podcast/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
        ← Home
      </Link>
      <h1 className="text-3xl font-semibold tracking-tight">Podcast player</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading session…</p>}>
        <PodcastSessionDetails params={params} />
      </Suspense>
    </main>
  );
}

async function PodcastSessionDetails({
  params,
}: Pick<PageProps<"/podcast/[id]">, "params">) {
  const { id } = await params;

  return (
    <>
      <p className="text-zinc-600 dark:text-zinc-400">
        Session ID: <code className="font-mono text-sm">{id}</code>
      </p>
      <p className="text-zinc-600 dark:text-zinc-400">
        Scaffold only. Build playback, transcript, sources, mic, and
        interruption controls here. Use{" "}
        <code className="font-mono text-sm">usePodcastSession</code> and{" "}
        <code className="font-mono text-sm">useAudioQueue</code>.
      </p>
    </>
  );
}
