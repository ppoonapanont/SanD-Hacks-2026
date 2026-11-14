import Link from "next/link";

import { MOCK_GUESTS } from "@/data/mock";

/**
 * Podcast configuration — Developer 2 owns UI controls.
 * Mock guests are available for wiring selection early.
 */
export default function ConfigurePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Home
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">
          Configure podcast
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Scaffold only. Add topic, region, duration, depth, and guest controls
          here.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Starter guests</h2>
        <ul className="space-y-3">
          {MOCK_GUESTS.map((guest) => (
            <li
              key={guest.id}
              className="border border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <p className="font-medium">{guest.name}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {guest.expertise}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
