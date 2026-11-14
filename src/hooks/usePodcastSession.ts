"use client";

import { useCallback, useState } from "react";

import {
  generatePodcast,
  getPodcast,
  interact,
  nextTurn,
  resumePodcast,
} from "@/lib/api/client";
import type { PodcastConfig, PodcastSession } from "@/types";

/**
 * Session state hook scaffold — Developer 2 can extend.
 * Wires to shared API client contracts.
 */
export function usePodcastSession(initial?: PodcastSession | null) {
  const [session, setSession] = useState<PodcastSession | null>(
    initial ?? null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (config: PodcastConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const { session: created } = await generatePodcast({ config });
      setSession(created);
      return created;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate podcast";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const load = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { session: loaded } = await getPodcast(id);
      setSession(loaded);
      return loaded;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load podcast";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const requestNextTurn = useCallback(async () => {
    if (!session) throw new Error("No active session");
    setIsLoading(true);
    setError(null);
    try {
      const result = await nextTurn({ sessionId: session.id });
      setSession(result.session);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch next turn";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  const ask = useCallback(
    async (message: string, targetGuestId?: string) => {
      if (!session) throw new Error("No active session");
      setIsLoading(true);
      setError(null);
      try {
        const result = await interact({
          sessionId: session.id,
          message,
          targetGuestId,
        });
        setSession(result.session);
        return result;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to send message";
        setError(msg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [session],
  );

  const resume = useCallback(async () => {
    if (!session) throw new Error("No active session");
    setIsLoading(true);
    setError(null);
    try {
      const result = await resumePodcast({ sessionId: session.id });
      setSession(result.session);
      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to resume podcast";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  return {
    session,
    setSession,
    isLoading,
    error,
    create,
    load,
    requestNextTurn,
    ask,
    resume,
  };
}
