import type { PodcastSession } from "@/types";

/**
 * In-memory session store for hackathon MVP.
 * Swap for Neon persistence later without changing API route signatures.
 */
const sessions = new Map<string, PodcastSession>();

export function saveSession(session: PodcastSession): PodcastSession {
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): PodcastSession | undefined {
  return sessions.get(id);
}

export function listSessions(): PodcastSession[] {
  return Array.from(sessions.values()).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export function updateSession(
  id: string,
  updater: (session: PodcastSession) => PodcastSession,
): PodcastSession | undefined {
  const existing = sessions.get(id);
  if (!existing) return undefined;

  const updated = updater({
    ...existing,
    updatedAt: new Date().toISOString(),
  });
  sessions.set(id, updated);
  return updated;
}

export function clearSessions(): void {
  sessions.clear();
}
